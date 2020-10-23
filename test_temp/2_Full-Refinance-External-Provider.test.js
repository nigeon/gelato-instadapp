const {expect} = require("chai");
const bre = require("@nomiclabs/buidler");
const {constants} = require("ethers");
const {ethers} = bre;
const GelatoCoreLib = require("@gelatonetwork/core");

// #region Contracts ABI

const InstaIndex = require("../pre-compiles/InstaIndex.json");
const InstaList = require("../pre-compiles/InstaList.json");
const InstaAccount = require("../pre-compiles/InstaAccount.json");
const ConnectGelato = require("../pre-compiles/ConnectGelato.json");
const ConnectMaker = require("../pre-compiles/ConnectMaker.json");
const ConnectCompound = require("../pre-compiles/ConnectCompound.json");
const ConnectInstaPool = require("../pre-compiles/ConnectInstaPool.json");
const ConnectAuth = require("../pre-compiles/ConnectAuth.json");
const ConnectGelatoDebtBridgeABI = require("../artifacts/ConnectGelatoDebtBridge.json");
const ConnectGelatoProviderPaymentABI = require("../artifacts/ConnectGelatoProviderPayment.json");
const InstaConnector = require("../pre-compiles/InstaConnectors.json");
const DssCdpManager = require("../pre-compiles/DssCdpManager.json");
const GetCdps = require("../pre-compiles/GetCdps.json");
const IERC20 = require("../pre-compiles/IERC20.json");
const CTokenInterface = require("../pre-compiles/CTokenInterface.json");
const GelatoGasPriceOracle = require("../pre-compiles/GelatoGasPriceOracle.json");
const CompoundResolver = require("../pre-compiles/InstaCompoundResolver.json");

const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const GAS_LIMIT = "4000000";
const GAS_PRICE_CEIL = ethers.utils.parseUnits("1000", "gwei");

// #endregion

describe("Debt Bridge with External Provider", function () {
  this.timeout(0);
  if (bre.network.name !== "ganache") {
    console.error("Test Suite is meant to be run on ganache only");
    process.exit(1);
  }

  // Wallet to use for local testing
  let userWallet;
  let userAddress;
  let providerWallet;
  let providerAddress;

  // Deployed instances
  let connectGelato;
  let connectMaker;
  let connectInstaPool;
  let connectCompound;
  let instaIndex;
  let instaList;
  let dssCdpManager;
  let getCdps;
  let daiToken;
  let gelatoCore;
  let cDaiToken;
  let cEthToken;
  let instaMaster;
  let instaConnectors;
  let gelatoGasPriceOracle;
  let compoundResolver;

  // Contracts to deploy and use for local testing
  let conditionMakerVaultIsSafe;
  let connectGelatoDebtBridge;
  let connectGelatoProviderPayment;
  let oracleAggregator;
  let dsaProviderModule;

  // Creation during test
  let dsa;
  let connectedGelatoCore;

  before(async function () {
    // Get Test Wallet for local testnet
    [userWallet] = await ethers.getSigners();
    userAddress = await userWallet.getAddress();

    [, providerWallet] = await ethers.getSigners();
    providerAddress = await providerWallet.getAddress();

    instaMaster = await ethers.provider.getSigner(
      bre.network.config.InstaMaster
    );

    // Ganache default accounts prefilled with 100 ETH
    expect(await userWallet.getBalance()).to.be.gt(
      ethers.utils.parseEther("10")
    );

    // ===== Get Deployed Contract Instance ==================
    instaIndex = await ethers.getContractAt(
      InstaIndex.abi,
      bre.network.config.InstaIndex
    );
    instaList = await ethers.getContractAt(
      InstaList.abi,
      bre.network.config.InstaList
    );
    connectGelato = await ethers.getContractAt(
      ConnectGelato.abi,
      bre.network.config.ConnectGelato
    );
    connectMaker = await ethers.getContractAt(
      ConnectMaker.abi,
      bre.network.config.ConnectMaker
    );
    connectInstaPool = await ethers.getContractAt(
      ConnectInstaPool.abi,
      bre.network.config.ConnectInstaPool
    );
    connectCompound = await ethers.getContractAt(
      ConnectCompound.abi,
      bre.network.config.ConnectCompound
    );
    dssCdpManager = await ethers.getContractAt(
      DssCdpManager.abi,
      bre.network.config.DssCdpManager
    );
    getCdps = await ethers.getContractAt(
      GetCdps.abi,
      bre.network.config.GetCdps
    );
    daiToken = await ethers.getContractAt(IERC20.abi, bre.network.config.DAI);
    gelatoCore = await ethers.getContractAt(
      GelatoCoreLib.GelatoCore.abi,
      bre.network.config.GelatoCore
    );
    cDaiToken = await ethers.getContractAt(
      CTokenInterface.abi,
      bre.network.config.CDAI
    );
    cEthToken = await ethers.getContractAt(
      CTokenInterface.abi,
      bre.network.config.CETH
    );
    instaConnectors = await ethers.getContractAt(
      InstaConnector.abi,
      bre.network.config.InstaConnectors
    );
    gelatoGasPriceOracle = await ethers.getContractAt(
      GelatoGasPriceOracle.abi,
      bre.network.config.GelatoGasPriceOracle
    );
    compoundResolver = await ethers.getContractAt(
      CompoundResolver.abi,
      bre.network.config.CompoundResolver
    );
    // instaEvent = await ethers.getContractAt(
    //     InstaEvent.abi,
    //     bre.network.config.InstaEvent
    // )

    // ===== Deploy Needed Contract ==================

    const OracleAggregator = await ethers.getContractFactory(
      "OracleAggregator"
    );
    oracleAggregator = await OracleAggregator.deploy();
    await oracleAggregator.deployed();

    const ConditionMakerVaultIsSafe = await ethers.getContractFactory(
      "ConditionMakerVaultIsSafe"
    );
    conditionMakerVaultIsSafe = await ConditionMakerVaultIsSafe.deploy(
      oracleAggregator.address
    );
    await conditionMakerVaultIsSafe.deployed();

    const connectorLength = await instaConnectors.connectorLength();
    const connectorId = connectorLength.add(1);

    const ConnectGelatoDebtBridge = await ethers.getContractFactory(
      "ConnectGelatoDebtBridge"
    );
    connectGelatoDebtBridge = await ConnectGelatoDebtBridge.deploy(
      connectorId,
      oracleAggregator.address
    );
    await connectGelatoDebtBridge.deployed();

    const ConnectGelatoProviderPayment = await ethers.getContractFactory(
      "ConnectGelatoProviderPayment"
    );
    connectGelatoProviderPayment = await ConnectGelatoProviderPayment.deploy(
      connectorId.add(1)
    );
    await connectGelatoProviderPayment.deployed();

    const ProviderModuleDSA = await ethers.getContractFactory(
      "ProviderModuleDSA"
    );
    dsaProviderModule = await ProviderModuleDSA.deploy(
      bre.network.config.InstaIndex,
      bre.network.config.GelatoCore,
      connectGelatoProviderPayment.address
    );
    await dsaProviderModule.deployed();

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////   After Contracts Deployement : Setup   ///////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    // Gelato Testing environment setup.
    // Step 1 : Add EUR/USD Maker Medianizer in the Oracle Aggregator
    // Step 2 : Enable Debt Bridge Connector and Gelato Provider Payment Connector
    // Step 3 : Executor Staking on Gelato
    // Step 4 : Provider put some fund on gelato for paying future tasks executions
    // Step 5 : Provider choose a executor
    // Step 6 : Provider will add a module
    // Step 7 : Provider should whitelist task

    //#region Step 1 Add EUR/USD Maker Medianizer in the Oracle Aggregator

    // Oracle Aggregator is a price feeder aggregator
    // You will be able to query price from multiple source through this aggregator
    // For the demo we add the ETH/USD Medianizer to the aggregator
    // MakerDAO price oracle are called Medianizer

    await oracleAggregator.addOracle(
      "ETH/USD",
      "0x729D19f657BD0614b4985Cf1D82531c67569197B"
    );

    //#endregion

    //#region Step 2 Enable Debt Bridge Connector and Gelato Provider Payment Connector

    // Debt Bridge Connector is used during refinancing of debt
    // This Connect help the user to split a position in one protocol.
    // to 2 protocol in a safe way. Both debt position will be safe.

    // Gelato Provider Payment Connector is used for paying the provider
    // for task execution. So when futur task will be executed, through a self financing
    // transaction (user will pay during the execution of the task) task will
    // be executed. Improvind user experience.

    await userWallet.sendTransaction({
      to: bre.network.config.InstaMaster,
      value: ethers.utils.parseEther("0.1"),
    });
    await instaConnectors
      .connect(instaMaster)
      .enable(connectGelatoDebtBridge.address);
    await instaConnectors
      .connect(instaMaster)
      .enable(connectGelatoProviderPayment.address);

    expect(
      await instaConnectors.isConnector([connectGelatoDebtBridge.address])
    ).to.be.true;
    expect(
      await instaConnectors.isConnector([connectGelatoProviderPayment.address])
    ).to.be.true;

    //#endregion

    //#region Step 3  Executor Staking on Gelato

    // For task execution provider will ask a executor to watch the
    // blockchain for possible execution autorization given by
    // the condition that user choose when submitting the task.
    // And if all condition are meet executor will execute the task.
    // For safety measure Gelato ask the executor to stake a minimum
    // amount.

    connectedGelatoCore = gelatoCore.connect(providerWallet);
    gelatoCore = gelatoCore.connect(userWallet);
    await connectedGelatoCore.stakeExecutor({
      from: providerAddress,
      value: await connectedGelatoCore.minExecutorStake(),
    });

    expect(
      await connectedGelatoCore.isExecutorMinStaked(providerAddress)
    ).to.be.true;

    //#endregion

    //#region Step 4 Provider put some fund on gelato for paying future tasks executions

    // Provider put some funds in gelato system for paying the
    // Executor when this one will execute task on behalf of the
    // Provider. At each provider's task execution, some funds (approximatively
    // the gas cost value) will be transfered to the Executor stake.

    const TASK_AUTOMATION_FUNDS = await gelatoCore.minExecProviderFunds(
      GAS_LIMIT,
      GAS_PRICE_CEIL
    );

    await expect(
      connectedGelatoCore.provideFunds(providerAddress, {
        value: TASK_AUTOMATION_FUNDS,
      })
    ).to.emit(gelatoCore, "LogFundsProvided");

    expect(
      await connectedGelatoCore.providerFunds(providerAddress)
    ).to.be.equal(TASK_AUTOMATION_FUNDS);

    //#endregion

    //#region Step 5 Provider choose a executor

    // Provider choose a executor who will execute futur task
    // for the provider, it will be compensated by the provider.

    await expect(
      connectedGelatoCore.providerAssignsExecutor(providerAddress)
    ).to.emit(gelatoCore, "LogProviderAssignedExecutor");

    expect(
      await connectedGelatoCore.executorByProvider(providerAddress)
    ).to.be.equal(providerAddress);

    //#endregion

    //#region Step 6 Provider will add a module

    // By adding a module the provider will format future task's
    // payload by adding some specificity like his address to the
    // Payment connector for receiving payment of User.

    await expect(
      connectedGelatoCore.addProviderModules([dsaProviderModule.address])
    ).to.emit(gelatoCore, "LogProviderModuleAdded");

    expect(
      await connectedGelatoCore.isModuleProvided(
        providerAddress,
        dsaProviderModule.address
      )
    ).to.be.true;

    //#endregion

    //#region Step 7 Provider should whitelist task

    // By WhiteList task, the provider can constrain the type
    // of task the user can submitting.

    //#region Actions

    const spells = [];

    let debtBridge = new GelatoCoreLib.Action({
      addr: connectGelatoDebtBridge.address,
      data: constants.HashZero,
      operation: GelatoCoreLib.Operation.Delegatecall,
      dataFlow: GelatoCoreLib.DataFlow.None,
      termsOkCheck: false,
      value: 0,
    });

    spells.push(debtBridge);

    let flashBorrow = new GelatoCoreLib.Action({
      addr: connectInstaPool.address,
      data: constants.HashZero,
      operation: GelatoCoreLib.Operation.Delegatecall,
      dataFlow: GelatoCoreLib.DataFlow.None,
      termsOkCheck: false,
      value: 0,
    });

    spells.push(flashBorrow);

    let paybackMaker = new GelatoCoreLib.Action({
      addr: connectMaker.address,
      data: constants.HashZero,
      operation: GelatoCoreLib.Operation.Delegatecall,
      dataFlow: GelatoCoreLib.DataFlow.None,
      termsOkCheck: false,
      value: 0,
    });

    spells.push(paybackMaker);

    let withdrawMaker = new GelatoCoreLib.Action({
      addr: connectMaker.address,
      data: constants.HashZero,
      operation: GelatoCoreLib.Operation.Delegatecall,
      dataFlow: GelatoCoreLib.DataFlow.None,
      termsOkCheck: false,
      value: 0,
    });

    spells.push(withdrawMaker);

    let depositCompound = new GelatoCoreLib.Action({
      addr: connectCompound.address,
      data: constants.HashZero,
      operation: GelatoCoreLib.Operation.Delegatecall,
      dataFlow: GelatoCoreLib.DataFlow.None,
      termsOkCheck: false,
      value: 0,
    });

    spells.push(depositCompound);

    let borrowCompound = new GelatoCoreLib.Action({
      addr: connectCompound.address,
      data: constants.HashZero,
      operation: GelatoCoreLib.Operation.Delegatecall,
      dataFlow: GelatoCoreLib.DataFlow.None,
      termsOkCheck: false,
      value: 0,
    });

    spells.push(borrowCompound);

    let flashPayBack = new GelatoCoreLib.Action({
      addr: connectInstaPool.address,
      data: constants.HashZero,
      operation: GelatoCoreLib.Operation.Delegatecall,
      dataFlow: GelatoCoreLib.DataFlow.None,
      termsOkCheck: false,
      value: 0,
    });

    spells.push(flashPayBack);

    let payProvider = new GelatoCoreLib.Action({
      addr: connectGelatoProviderPayment.address,
      data: constants.HashZero,
      operation: GelatoCoreLib.Operation.Delegatecall,
      dataFlow: GelatoCoreLib.DataFlow.None,
      termsOkCheck: false,
      value: 0,
    });

    spells.push(payProvider);

    const gasPriceCeil = constants.MaxUint256;

    const gelatoFlashLoanTaskSpec = new GelatoCoreLib.TaskSpec({
      conditions: [conditionMakerVaultIsSafe.address],
      actions: spells,
      gasPriceCeil,
    });

    await expect(
      connectedGelatoCore.provideTaskSpecs([gelatoFlashLoanTaskSpec])
    ).to.emit(gelatoCore, "LogTaskSpecProvided");

    expect(
      await connectedGelatoCore.isTaskSpecProvided(
        providerAddress,
        gelatoFlashLoanTaskSpec
      )
    ).to.be.equal("OK");

    expect(
      await connectedGelatoCore.taskSpecGasPriceCeil(
        providerAddress,
        await connectedGelatoCore.hashTaskSpec(gelatoFlashLoanTaskSpec)
      )
    ).to.be.equal(gasPriceCeil);

    //#endregion

    //#endregion
  });

  it("#1: Use Maker Compound refinancing if the maker vault become unsafe after a market move.", async function () {
    // User Actions
    // Step 1 : User create a DeFi Smart Account
    // Step 2 : User open a Vault, put some ether on it and borrow some dai
    // Step 3 : User give authorization to gelato to use his DSA on his behalf.
    // Step 4 : User submit a Debt Refinancing task if market move against him
    // Step 5 : Market Move against the user (Mock)
    // Step 6 : Executor execute the user's task

    //#region Step 1 User create a DeFi Smart Account

    // User create a Instadapp DeFi Smart Account
    // who give him the possibility to interact
    // with a large list of DeFi protocol through one
    // Proxy account.

    const dsaAccountCount = await instaList.accounts();

    await expect(instaIndex.build(userAddress, 1, userAddress)).to.emit(
      instaIndex,
      "LogAccountCreated"
    );
    const dsaID = dsaAccountCount.add(1);
    await expect(await instaList.accounts()).to.be.equal(dsaID);

    // Instantiate the DSA
    dsa = await ethers.getContractAt(
      InstaAccount.abi,
      await instaList.accountAddr(dsaID)
    );

    //#endregion

    //#region Step 2 User open a Vault, put some ether on it and borrow some dai

    // User open a maker vault
    // He deposit 10 Eth on it
    // He borrow a 1000 DAI

    const openVault = await bre.run("abi-encode-withselector", {
      abi: ConnectMaker.abi,
      functionname: "open",
      inputs: ["ETH-A"],
    });

    await dsa.cast([bre.network.config.ConnectMaker], [openVault], userAddress);

    let cdps = await getCdps.getCdpsAsc(dssCdpManager.address, dsa.address);
    let cdpId = String(cdps.ids[0]);

    expect(cdps.ids[0].isZero()).to.be.false;

    await dsa.cast(
      [bre.network.config.ConnectMaker],
      [
        await bre.run("abi-encode-withselector", {
          abi: ConnectMaker.abi,
          functionname: "deposit",
          inputs: [cdpId, ethers.utils.parseEther("10"), 0, 0],
        }),
      ],
      userAddress,
      {
        value: ethers.utils.parseEther("10"),
      }
    );

    let makerVaultInitialBorrow = ethers.utils.parseUnits("1000", 18);

    await dsa.cast(
      [bre.network.config.ConnectMaker],
      [
        await bre.run("abi-encode-withselector", {
          abi: ConnectMaker.abi,
          functionname: "borrow",
          inputs: [cdpId, makerVaultInitialBorrow, 0, 0],
        }),
      ],
      userAddress
    );

    expect(await daiToken.balanceOf(dsa.address)).to.be.equal(
      ethers.utils.parseEther("1000")
    );

    //#endregion

    //#region Step 3 User give authorization to gelato to use his DSA on his behalf.

    // Instadapp DSA contract give the possibility to the user to delegate
    // action by giving authorization.
    // In this case user give authorization to gelato to execute
    // task for him if needed.

    await dsa.cast(
      [bre.network.config.ConnectAuth],
      [
        await bre.run("abi-encode-withselector", {
          abi: ConnectAuth.abi,
          functionname: "add",
          inputs: [gelatoCore.address],
        }),
      ],
      userAddress
    );

    expect(await dsa.isAuth(gelatoCore.address)).to.be.true;

    //#endregion

    //#region Step 4 User submit a Debt Refinancing task if market move against him

    // User submit the refinancing task if market move against him.
    // So in this case if the maker vault go to the unsafe area
    // the refinancing task will be executed and the position
    // will be split on two position on maker and compound.
    // It will be done through a algorithm that will optimize the
    // total borrow rate.

    const debtBridgeCondition = new GelatoCoreLib.Condition({
      inst: conditionMakerVaultIsSafe.address,
      data: await conditionMakerVaultIsSafe.getConditionData(
        cdpId,
        "ETH/USD",
        ethers.utils.parseUnits("40", 17)
      ),
    });

    // ======= Action/Spells setup ======
    const spells = [];

    let debtBridgeCalculation = new GelatoCoreLib.Action({
      addr: connectGelatoDebtBridge.address,
      data: await bre.run("abi-encode-withselector", {
        abi: ConnectGelatoDebtBridgeABI.abi,
        functionname: "fullRefinanceMakerToCompound",
        inputs: [cdpId, 0, 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(debtBridgeCalculation);

    let flashBorrow = new GelatoCoreLib.Action({
      addr: connectInstaPool.address,
      data: await bre.run("abi-encode-withselector", {
        abi: ConnectInstaPool.abi,
        functionname: "flashBorrow",
        inputs: [bre.network.config.DAI, 0, "100", 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(flashBorrow);

    let paybackMaker = new GelatoCoreLib.Action({
      addr: connectMaker.address,
      data: await bre.run("abi-encode-withselector", {
        abi: ConnectMaker.abi,
        functionname: "payback",
        inputs: [cdpId, 0, "101", 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(paybackMaker);

    let withdrawMaker = new GelatoCoreLib.Action({
      addr: connectMaker.address,
      data: await bre.run("abi-encode-withselector", {
        abi: ConnectMaker.abi,
        functionname: "withdraw",
        inputs: [cdpId, 0, "102", 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(withdrawMaker);

    let depositCompound = new GelatoCoreLib.Action({
      addr: connectCompound.address,
      data: await bre.run("abi-encode-withselector", {
        abi: ConnectCompound.abi,
        functionname: "deposit",
        inputs: [ETH, 0, "103", 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(depositCompound);

    let borrowCompound = new GelatoCoreLib.Action({
      addr: connectCompound.address,
      data: await bre.run("abi-encode-withselector", {
        abi: ConnectCompound.abi,
        functionname: "borrow",
        inputs: [bre.network.config.DAI, 0, "104", 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(borrowCompound);

    let flashPayBack = new GelatoCoreLib.Action({
      addr: connectInstaPool.address,
      data: await bre.run("abi-encode-withselector", {
        abi: ConnectInstaPool.abi,
        functionname: "flashPayback",
        inputs: [bre.network.config.DAI, 0, 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(flashPayBack);

    let payProvider = new GelatoCoreLib.Action({
      addr: connectGelatoProviderPayment.address,
      data: await bre.run("abi-encode-withselector", {
        abi: ConnectGelatoProviderPaymentABI.abi,
        functionname: "payProvider",
        inputs: [ethers.constants.AddressZero, ETH, 0, "105", 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(payProvider);

    const refinanceIfCompoundBorrowIsBetter = new GelatoCoreLib.Task({
      conditions: [debtBridgeCondition],
      actions: spells,
    });

    const gelatoExternalProvider = new GelatoCoreLib.GelatoProvider({
      addr: providerAddress,
      module: dsaProviderModule.address,
    });

    const expiryDate = 0;
    await expect(
      dsa.cast(
        [connectGelato.address], // targets
        [
          await bre.run("abi-encode-withselector", {
            abi: ConnectGelato.abi,
            functionname: "submitTask",
            inputs: [
              gelatoExternalProvider,
              refinanceIfCompoundBorrowIsBetter,
              expiryDate,
            ],
          }),
        ], // datas
        userAddress, // origin
        {
          gasLimit: 5000000,
        }
      )
    ).to.emit(gelatoCore, "LogTaskSubmitted");

    const taskReceipt = new GelatoCoreLib.TaskReceipt({
      id: await gelatoCore.currentTaskReceiptId(),
      userProxy: dsa.address,
      provider: gelatoExternalProvider,
      tasks: [refinanceIfCompoundBorrowIsBetter],
      expiryDate,
    });

    //#endregion

    //#region Step 5 Market Move against the user (Mock)

    // Ether market price went from the current price to 250$

    const gelatoGasPrice = await bre.run("fetchGelatoGasPrice");
    expect(gelatoGasPrice).to.be.lte(GAS_PRICE_CEIL);

    await oracleAggregator.mock(true, ethers.utils.parseUnits("400", 18));

    expect(
      await connectedGelatoCore.canExec(taskReceipt, GAS_LIMIT, gelatoGasPrice)
    ).to.be.equal("ConditionNotOk:NotOKMakerVaultIsSafe");

    await oracleAggregator.mock(true, ethers.utils.parseUnits("380", 18));

    expect(
      await connectedGelatoCore.canExec(taskReceipt, GAS_LIMIT, gelatoGasPrice)
    ).to.be.equal("OK");

    //#endregion

    //#region Step 6 Executor execute the user's task

    // The market move make the vault unsafe, so the executor
    // will execute the user's task to make the user position safe
    // by a debt refinancing in compound.

    //#region EXPECTED OUTCOME

    let fees = ethers.utils
      .parseUnits(String(1933090 + 19331 * 2), 0)
      .mul(await gelatoGasPriceOracle.latestAnswer());
    let debt = await connectGelatoDebtBridge.getMakerVaultDebt(cdpId);
    let collateral = (
      await connectGelatoDebtBridge.getMakerVaultCollateralBalance(cdpId)
    ).sub(fees);

    //#endregion

    let providerBalanceBeforeExecution = await providerWallet.getBalance();

    await expect(
      connectedGelatoCore.exec(taskReceipt, {
        gasPrice: gelatoGasPrice, // Exectutor must use gelatoGasPrice (Chainlink fast gwei)
        gasLimit: GAS_LIMIT,
      })
    ).to.emit(gelatoCore, "LogExecSuccess");

    let providerBalanceAfterExecution = await providerWallet.getBalance();

    expect(providerBalanceAfterExecution).to.be.gt(
      providerBalanceBeforeExecution
    );

    // compound position of DSA on cDai and cEth
    let compoundPosition = await compoundResolver.getCompoundData(dsa.address, [
      cDaiToken.address,
      cEthToken.address,
    ]);

    // https://compound.finance/docs/ctokens#exchange-rate
    // calculate cEth/ETH rate to convert back cEth to ETH
    // for comparing with the withdrew Ether to the deposited one.
    let exchangeRateCethToEth = (await cEthToken.getCash())
      .add(await cEthToken.totalBorrows())
      .sub(await cEthToken.totalReserves())
      .div(await cEthToken.totalSupply());

    // Estimated amount to borrowed token should be equal to the actual one read on compound contracts
    expect(debt).to.be.equal(compoundPosition[0].borrowBalanceStoredUser);

    // Estimated amount of collateral should be equal to the actual one read on compound contracts
    expect(
      collateral.sub(
        compoundPosition[1].balanceOfUser.mul(exchangeRateCethToEth)
      )
    ).to.be.lt(ethers.utils.parseUnits("1", 12));

    debt = await connectGelatoDebtBridge.getMakerVaultDebt(cdpId);
    collateral = await connectGelatoDebtBridge.getMakerVaultCollateralBalance(
      cdpId
    ); // in Ether.

    expect(debt).to.be.equal(ethers.constants.Zero);
    expect(collateral).to.be.equal(ethers.constants.Zero);

    // DSA contain 1000 DAI
    expect(await daiToken.balanceOf(dsa.address)).to.be.equal(
      makerVaultInitialBorrow
    );

    //#endregion
  });
});
