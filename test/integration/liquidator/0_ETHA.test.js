const { expect } = require("chai");
const hre = require("hardhat");
const { deployments, ethers } = hre;
const GelatoCoreLib = require("@gelatonetwork/core");

const setupFullLiquidateMaker = require("./helpers/setupFullLiquidateMaker");
const getInstaPoolV2Route = require("../../helpers/services/InstaDapp/getInstaPoolV2Route");
const getGasCostForFullLiquidate = require("./helpers/services/getGasCostForFullLiquidate");

// This test showcases how to submit a task refinancing a Users debt position from
// Maker to Compound using Gelato
describe("Full Debt liquidation of ETH-A", function () {
  this.timeout(0);
  if (hre.network.name !== "hardhat") {
    console.error("Test Suite is meant to be run on hardhat only");
    process.exit(1);
  }

  let contracts;
  let wallets;
  let constants;
  let ABI;

  // Payload Params for ConnectGelatoFullDebtBridgeFromMaker and ConditionMakerVaultUnsafe
  let vaultAId;

  // For TaskSpec and for Task
  let gelatoDebtBridgeSpells = [];

  // Cross test var
  let taskReceipt;

  before(async function () {
    // Reset back to a fresh forked state during runtime
    await deployments.fixture();

    const result = await setupFullLiquidateMaker();

    wallets = result.wallets;
    contracts = result.contracts;
    vaultAId = result.vaultAId;
    gelatoDebtBridgeSpells = result.spells;

    ABI = result.ABI;
    constants = result.constants;
  });

  it("#1: DSA authorizes Gelato to cast spells.", async function () {
    //#region User give authorization to gelato to use his DSA on his behalf.

    // Instadapp DSA contract give the possibility to the user to delegate
    // action by giving authorization.
    // In this case user give authorization to gelato to execute
    // task for him if needed.

    await contracts.dsa.cast(
      [hre.network.config.ConnectAuth],
      [
        await hre.run("abi-encode-withselector", {
          abi: ABI.ConnectAuthABI,
          functionname: "add",
          inputs: [contracts.gelatoCore.address],
        }),
      ],
      wallets.userAddress
    );

    expect(await contracts.dsa.isAuth(contracts.gelatoCore.address)).to.be.true;

    //#endregion
  });

  it("#2: User submits automated Debt Liquidation task to Gelato via DSA", async function () {
    //#region User submit a Debt Liquidation task if market move against him

    // User submit the liquidation task if market move against him.
    // So in this case if the maker vault go to the unsafe area
    // the liquidation task will be executed and the position

    const conditionMakerVaultUnsafeObj = new GelatoCoreLib.Condition({
      inst: contracts.conditionMakerVaultUnsafe.address,
      data: await contracts.conditionMakerVaultUnsafe.getConditionData(
        vaultAId,
        contracts.priceOracleResolver.address,
        await hre.run("abi-encode-withselector", {
          abi: (await deployments.getArtifact("PriceOracleResolver")).abi,
          functionname: "getMockPrice",
          inputs: [wallets.userAddress],
        }),
        constants.MIN_COL_RATIO_MAKER
      ),
    });

    // ======= GELATO TASK SETUP ======
    const liquidateEthAIfVaultUnsafe = new GelatoCoreLib.Task({
      conditions: [
        conditionMakerVaultUnsafeObj,
      ],
      actions: gelatoDebtBridgeSpells,
    });

    const gelatoExternalProvider = new GelatoCoreLib.GelatoProvider({
      addr: wallets.gelatoProviderAddress, // Gelato Provider Address
      module: contracts.dsaProviderModule.address, // Gelato DSA module
    });

    const expiryDate = 0;

    await expect(
      contracts.dsa.cast(
        [contracts.connectGelato.address], // targets
        [
          await hre.run("abi-encode-withselector", {
            abi: ABI.ConnectGelatoABI,
            functionname: "submitTask",
            inputs: [
              gelatoExternalProvider,
              liquidateEthAIfVaultUnsafe,
              expiryDate,
            ],
          }),
        ], // datas
        wallets.userAddress, // origin
        {
          gasLimit: 5000000,
        }
      )
    ).to.emit(contracts.gelatoCore, "LogTaskSubmitted");

    taskReceipt = new GelatoCoreLib.TaskReceipt({
      id: await contracts.gelatoCore.currentTaskReceiptId(),
      userProxy: contracts.dsa.address,
      provider: gelatoExternalProvider,
      tasks: [liquidateEthAIfVaultUnsafe],
      expiryDate,
    });

    //#endregion
  });

  // This test showcases the part which is automatically done by the Gelato Executor Network on mainnet
  // Bots constatly check whether the submitted task is executable (by calling canExec)
  // If the task becomes executable (returns "OK"), the "exec" function will be called
  // which will execute the debt refinancing on behalf of the user
  it("#3: Liquidate ETH-A, if the Maker vault became unsafe.", async function () {
    // Steps
    // Step 1: Market Move against the user (Mock)
    // Step 2: Executor execute the user's task

    //#region Step 1 Market Move against the user (Mock)

    // Ether market price went from the current price to 250$

    const gelatoGasPrice = await hre.run("fetchGelatoGasPrice");
    expect(gelatoGasPrice).to.be.lte(constants.GAS_PRICE_CEIL);

    // TO DO: base mock price off of real price data
    await contracts.priceOracleResolver.setMockPrice(
      ethers.utils.parseUnits("400", 18)
    );

    expect(
      await contracts.gelatoCore
        .connect(wallets.gelatoExecutorWallet)
        .canExec(taskReceipt, constants.GAS_LIMIT, gelatoGasPrice)
    ).to.be.equal("ConditionNotOk:MakerVaultNotUnsafe");

    // TO DO: base mock price off of real price data
    await contracts.priceOracleResolver.setMockPrice(
      ethers.utils.parseUnits("250", 18)
    );

    expect(
      await contracts.gelatoCore
        .connect(wallets.gelatoExecutorWallet)
        .canExec(taskReceipt, constants.GAS_LIMIT, gelatoGasPrice)
    ).to.be.equal("OK");

    //#endregion

    //#region Step 2 Executor execute the user's task

    // The market move make the vault unsafe, so the executor
    // will execute the user's task to make the user position safe
    // by a debt refinancing in compound.

    //#region EXPECTED OUTCOME
    let debtOnMakerBefore = await contracts.makerResolver.getMakerVaultRawDebt(
      vaultAId
    );
 
    const route = await getInstaPoolV2Route(
      contracts.DAI.address,
      debtOnMakerBefore,
      contracts.instaPoolResolver
    );

    if (route !== 1) {
      debtOnMakerBefore = await contracts.makerResolver.getMakerVaultDebt(
        vaultAId
      );
    }

    const gasCost = await getGasCostForFullLiquidate(route);

    const gasFeesPaidFromCol = ethers.BigNumber.from(gasCost).mul(
      gelatoGasPrice
    );

    //#endregion
    const providerBalanceBeforeExecution = await contracts.gelatoCore.providerFunds(
      wallets.gelatoProviderAddress
    );

    await expect(
      contracts.gelatoCore
        .connect(wallets.gelatoExecutorWallet)
        .exec(taskReceipt, {
          gasPrice: gelatoGasPrice, // Exectutor must use gelatoGasPrice (Chainlink fast gwei)
          gasLimit: constants.GAS_LIMIT,
        })
    ).to.emit(contracts.gelatoCore, "LogExecSuccess");

    // 🚧 For Debugging:
    // const txResponse2 = await contracts.gelatoCore
    //   .connect(wallets.gelatoExecutorWallet)
    //   .exec(taskReceipt, {
    //     gasPrice: gelatoGasPrice,
    //     gasLimit: constants.GAS_LIMIT,
    //   });
    // const {blockHash} = await txResponse2.wait();
    // const logs = await ethers.provider.getLogs({blockHash});
    // const iFace = new ethers.utils.Interface(GelatoCoreLib.GelatoCore.abi);
    // for (const log of logs) {
    //   console.log(iFace.parseLog(log).args.reason);
    // }
    // await GelatoCoreLib.sleep(10000);
 
    expect(
      await contracts.gelatoCore.providerFunds(wallets.gelatoProviderAddress)
    ).to.be.gt(
      providerBalanceBeforeExecution.sub(
        gasFeesPaidFromCol
          .mul(await contracts.gelatoCore.totalSuccessShare())
          .div(100)
      )
    );

    const collateralOnMakerOnVaultAAfter = await contracts.makerResolver.getMakerVaultCollateralBalance(
      vaultAId
    ); // in Ether.
    const debtOnMakerOnVaultAAfter = await contracts.makerResolver.getMakerVaultRawDebt(
      vaultAId
    );

    // We should not have deposited ether or borrowed DAI on maker.
    expect(collateralOnMakerOnVaultAAfter).to.be.equal(ethers.constants.Zero);
    expect(debtOnMakerOnVaultAAfter).to.be.equal(ethers.constants.Zero);

    // DSA has maximum 2 wei DAI in it due to maths inaccuracies
    expect(await contracts.DAI.balanceOf(contracts.dsa.address)).to.be.equal(
      constants.MAKER_INITIAL_DEBT
    );

    //#endregion
  });
});
