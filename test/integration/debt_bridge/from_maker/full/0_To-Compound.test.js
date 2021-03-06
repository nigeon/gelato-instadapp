const { expect } = require("chai");
const hre = require("hardhat");
const { deployments, ethers } = hre;

const GelatoCoreLib = require("@gelatonetwork/core");

const setupFullRefinanceMakerToCompound = require("./helpers/setupFullRefinanceMakerToCompound");
const getInstaPoolV2Route = require("../../../../helpers/services/InstaDapp/getInstaPoolV2Route");
const getGasCostForFullRefinance = require("./helpers/services/getGasCostForFullRefinance");

// This test showcases how to submit a task refinancing a Users debt position from
// Maker to Compound using Gelato
describe("Full Debt Bridge refinancing loan from Maker to Compound", function () {
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
  let vaultId;

  // For TaskSpec and for Task
  let gelatoDebtBridgeSpells = [];

  // Cross test var
  let taskReceipt;

  before(async function () {
    await deployments.fixture();

    const result = await setupFullRefinanceMakerToCompound();
    wallets = result.wallets;
    contracts = result.contracts;
    vaultId = result.vaultId;
    gelatoDebtBridgeSpells = result.spells;
    ABI = result.ABI;
    constants = result.constants;
  });

  it("#1: DSA give Authorization to Gelato to execute action his behalf.", async function () {
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

  it("#2: User submits Debt refinancing task if market move to Gelato via DSA", async function () {
    //#region User submit a Debt Refinancing task if market move against him

    // User submit the refinancing task if market move against him.
    // So in this case if the maker vault go to the unsafe area
    // the refinancing task will be executed and the position
    // will be split on two position on maker and compound.
    // It will be done through a algorithm that will optimize the
    // total borrow rate.

    const conditionMakerVaultUnsafeObj = new GelatoCoreLib.Condition({
      inst: contracts.conditionMakerVaultUnsafe.address,
      data: await contracts.conditionMakerVaultUnsafe.getConditionData(
        vaultId,
        contracts.priceOracleResolver.address,
        await hre.run("abi-encode-withselector", {
          abi: (await deployments.getArtifact("PriceOracleResolver")).abi,
          functionname: "getMockPrice",
          inputs: [wallets.userAddress],
        }),
        constants.MIN_COL_RATIO_MAKER
      ),
    });

    const conditionDebtBridgeIsAffordableObj = new GelatoCoreLib.Condition({
      inst: contracts.conditionDebtBridgeIsAffordable.address,
      data: await contracts.conditionDebtBridgeIsAffordable.getConditionData(
        vaultId,
        constants.MAX_FEES_IN_PERCENT
      ),
    });

    // ======= GELATO TASK SETUP ======
    const refinanceIfVaultUnsafe = new GelatoCoreLib.Task({
      conditions: [
        conditionMakerVaultUnsafeObj,
        conditionDebtBridgeIsAffordableObj,
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
              refinanceIfVaultUnsafe,
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
      tasks: [refinanceIfVaultUnsafe],
      expiryDate,
    });

    //#endregion
  });

  // This test showcases the part which is automatically done by the Gelato Executor Network on mainnet
  // Bots constatly check whether the submitted task is executable (by calling canExec)
  // If the task becomes executable (returns "OK"), the "exec" function will be called
  // which will execute the debt refinancing on behalf of the user
  it("#3: Use Maker Compound refinancing if the maker vault become unsafe after a market move.", async function () {
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

    const debtOnMakerBefore = await contracts.makerResolver.getMakerVaultDebt(
      vaultId
    );

    const route = await getInstaPoolV2Route(
      contracts.DAI.address,
      debtOnMakerBefore,
      contracts.instaPoolResolver
    );

    const gasCost = await getGasCostForFullRefinance(route);

    const gasFeesPaidFromCol = ethers.BigNumber.from(gasCost).mul(
      gelatoGasPrice
    );

    const pricedCollateral = (
      await contracts.makerResolver.getMakerVaultCollateralBalance(vaultId)
    ).sub(gasFeesPaidFromCol);

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

    // compound position of DSA on cDai and cEth
    const compoundPosition = await contracts.compoundResolver.getCompoundData(
      contracts.dsa.address,
      [contracts.cDaiToken.address, contracts.cEthToken.address]
    );

    // https://compound.finance/docs/ctokens#exchange-rate
    // calculate cEth/ETH rate to convert back cEth to ETH
    // for comparing with the withdrew Ether to the deposited one.
    const exchangeRateCethToEth = (await contracts.cEthToken.getCash())
      .add(await contracts.cEthToken.totalBorrows())
      .sub(await contracts.cEthToken.totalReserves())
      .div(await contracts.cEthToken.totalSupply());

    // Estimated amount to borrowed token should be equal to the actual one read on compound contracts
    if (route === 1) {
      expect(debtOnMakerBefore).to.be.lte(
        compoundPosition[0].borrowBalanceStoredUser
      );
    } else {
      expect(
        debtOnMakerBefore.sub(compoundPosition[0].borrowBalanceStoredUser)
      ).to.be.lt(ethers.utils.parseUnits("2", 0));
    }

    // Estimated amount of collateral should be equal to the actual one read on compound contracts
    expect(
      pricedCollateral.sub(
        compoundPosition[1].balanceOfUser.mul(exchangeRateCethToEth)
      )
    ).to.be.lt(ethers.utils.parseUnits("1", 12));

    const collateralOnMakerOnVaultAAfter = await contracts.makerResolver.getMakerVaultCollateralBalance(
      vaultId
    ); // in Ether.
    const debtOnMakerOnVaultAAfter = await contracts.makerResolver.getMakerVaultDebt(
      vaultId
    );

    // We should not have deposited ether or borrowed DAI on maker.
    expect(collateralOnMakerOnVaultAAfter).to.be.equal(ethers.constants.Zero);
    expect(debtOnMakerOnVaultAAfter).to.be.equal(ethers.constants.Zero);

    // DSA contain 1000 DAI
    expect(await contracts.DAI.balanceOf(contracts.dsa.address)).to.be.equal(
      constants.MAKER_INITIAL_DEBT
    );

    //#endregion
  });
});
