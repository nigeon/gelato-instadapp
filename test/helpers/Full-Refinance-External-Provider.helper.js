const {expect} = require("chai");
const hre = require("hardhat");
const {ethers} = hre;
const GelatoCoreLib = require("@gelatonetwork/core");

const InstaIndex = require("../../pre-compiles/InstaIndex.json");
const InstaList = require("../../pre-compiles/InstaList.json");
const InstaAccount = require("../../pre-compiles/InstaAccount.json");
const ConnectGelato = require("../../pre-compiles/ConnectGelato.json");
const ConnectMaker = require("../../pre-compiles/ConnectMaker.json");
const ConnectCompound = require("../../pre-compiles/ConnectCompound.json");
const ConnectInstaPool = require("../../pre-compiles/ConnectInstaPool.json");
const ConnectAuth = require("../../pre-compiles/ConnectAuth.json");

const InstaConnector = require("../../pre-compiles/InstaConnectors.json");
const DssCdpManager = require("../../pre-compiles/DssCdpManager.json");
const GetCdps = require("../../pre-compiles/GetCdps.json");
const IERC20 = require("../../pre-compiles/IERC20.json");
const CTokenInterface = require("../../pre-compiles/CTokenInterface.json");
const CompoundResolver = require("../../pre-compiles/InstaCompoundResolver.json");
const PriceOracleResolverABI = require("../../artifacts/contracts/resolvers/PriceOracleResolver.sol/PriceOracleResolver.json")
  .abi;
const ConnectGelatoProviderPaymentABI = require("../../artifacts/contracts/connectors/ConnectGelatoProviderPayment.sol/ConnectGelatoProviderPayment.json")
  .abi;
const ConnectGelatoDebtBridgeFromMakerABI = require("../../artifacts/contracts/connectors/ConnectGelatoDebtBridgeFromMaker.sol/ConnectGelatoDebtBridgeFromMaker.json")
  .abi;

const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const GAS_LIMIT = "4000000";
const GAS_PRICE_CEIL = ethers.utils.parseUnits("1000", "gwei");

const MIN_COL_RATIO_MAKER = ethers.utils.parseUnits("3", 18);

// TO DO: make dynamic based on real time Collateral Price and Ratios
const MAKER_INITIAL_ETH = ethers.utils.parseEther("10");
const MAKER_INITIAL_DEBT = ethers.utils.parseUnits("1000", 18);

// #endregion

class Helper {
  async address() {
    let userWallet;
    let userAddress;
    let providerWallet;
    let providerAddress;
    let executorWallet;
    let executorAddress;

    [userWallet, providerWallet, executorWallet] = await ethers.getSigners();
    userAddress = await userWallet.getAddress();
    providerAddress = await providerWallet.getAddress();
    executorAddress = await executorWallet.getAddress();

    // Hardhat default accounts prefilled with 100 ETH
    expect(await userWallet.getBalance()).to.be.gt(
      ethers.utils.parseEther("10")
    );

    return {
      userWallet: userWallet,
      userAddress: userAddress,
      providerWallet: providerWallet,
      providerAddress: providerAddress,
      executorWallet: executorWallet,
      executorAddress: executorAddress,
    };
  }

  async contracts() {
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
    let compoundResolver;
    // Contracts to deploy and use for local testing
    let conditionMakerVaultUnsafe;
    let connectGelatoDebtBridgeFromMaker;
    let connectGelatoProviderPayment;
    let priceOracleResolver;
    let dsaProviderModule;

    instaMaster = await ethers.provider.getSigner(
      hre.network.config.InstaMaster
    );

    // ===== Get Deployed Contract Instance ==================
    instaIndex = await ethers.getContractAt(
      InstaIndex.abi,
      hre.network.config.InstaIndex
    );
    instaList = await ethers.getContractAt(
      InstaList.abi,
      hre.network.config.InstaList
    );
    connectGelato = await ethers.getContractAt(
      ConnectGelato.abi,
      hre.network.config.ConnectGelato
    );
    connectMaker = await ethers.getContractAt(
      ConnectMaker.abi,
      hre.network.config.ConnectMaker
    );
    connectInstaPool = await ethers.getContractAt(
      ConnectInstaPool.abi,
      hre.network.config.ConnectInstaPool
    );
    connectCompound = await ethers.getContractAt(
      ConnectCompound.abi,
      hre.network.config.ConnectCompound
    );
    dssCdpManager = await ethers.getContractAt(
      DssCdpManager.abi,
      hre.network.config.DssCdpManager
    );
    getCdps = await ethers.getContractAt(
      GetCdps.abi,
      hre.network.config.GetCdps
    );
    daiToken = await ethers.getContractAt(IERC20.abi, hre.network.config.DAI);
    gelatoCore = await ethers.getContractAt(
      GelatoCoreLib.GelatoCore.abi,
      hre.network.config.GelatoCore
    );
    cDaiToken = await ethers.getContractAt(
      CTokenInterface.abi,
      hre.network.config.CDAI
    );
    cEthToken = await ethers.getContractAt(
      CTokenInterface.abi,
      hre.network.config.CETH
    );
    instaConnectors = await ethers.getContractAt(
      InstaConnector.abi,
      hre.network.config.InstaConnectors
    );
    compoundResolver = await ethers.getContractAt(
      CompoundResolver.abi,
      hre.network.config.CompoundResolver
    );

    // ===== Deploy Needed Contract ==================

    const PriceOracleResolver = await ethers.getContractFactory(
      "PriceOracleResolver"
    );
    priceOracleResolver = await PriceOracleResolver.deploy();
    await priceOracleResolver.deployed();

    const ConditionMakerVaultUnsafe = await ethers.getContractFactory(
      "ConditionMakerVaultUnsafe"
    );
    conditionMakerVaultUnsafe = await ConditionMakerVaultUnsafe.deploy();
    await conditionMakerVaultUnsafe.deployed();

    const ConnectGelatoDebtBridgeFromMaker = await ethers.getContractFactory(
      "ConnectGelatoDebtBridgeFromMaker"
    );
    connectGelatoDebtBridgeFromMaker = await ConnectGelatoDebtBridgeFromMaker.deploy(
      (await instaConnectors.connectorLength()).add(1)
    );
    await connectGelatoDebtBridgeFromMaker.deployed();

    const ConnectGelatoProviderPayment = await ethers.getContractFactory(
      "ConnectGelatoProviderPayment"
    );
    connectGelatoProviderPayment = await ConnectGelatoProviderPayment.deploy(
      (await instaConnectors.connectorLength()).add(2)
    );
    await connectGelatoProviderPayment.deployed();

    const ProviderModuleDSA = await ethers.getContractFactory(
      "ProviderModuleDSA"
    );
    dsaProviderModule = await ProviderModuleDSA.deploy(
      hre.network.config.GelatoCore,
      connectGelatoProviderPayment.address
    );
    await dsaProviderModule.deployed();

    return {
      connectGelato: connectGelato,
      connectMaker: connectMaker,
      connectInstaPool: connectInstaPool,
      connectCompound: connectCompound,
      instaIndex: instaIndex,
      instaList: instaList,
      dssCdpManager: dssCdpManager,
      getCdps: getCdps,
      daiToken: daiToken,
      gelatoCore: gelatoCore,
      cDaiToken: cDaiToken,
      cEthToken: cEthToken,
      instaMaster: instaMaster,
      instaConnectors: instaConnectors,
      compoundResolver: compoundResolver,
      conditionMakerVaultUnsafe: conditionMakerVaultUnsafe,
      connectGelatoDebtBridgeFromMaker: connectGelatoDebtBridgeFromMaker,
      connectGelatoProviderPayment: connectGelatoProviderPayment,
      priceOracleResolver: priceOracleResolver,
      dsaProviderModule: dsaProviderModule,
      dsa: ethers.constants.AddressZero,
    };
  }

  async setup() {
    let address = await this.address();
    let contracts = await this.contracts();
    let dsa;
    let vaultId;
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////  Setup   ///////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////////////////

    // Gelato Testing environment setup.
    // Step 1 : Add EUR/USD Maker Medianizer in the PriceOracleResolver
    // Step 2 : Enable Debt Bridge Connector and Gelato Provider Payment Connector
    // Step 3 : Executor Staking on Gelato
    // Step 4 : Provider put some fund on gelato for paying future tasks executions
    // Step 5 : Provider choose a executor
    // Step 6 : Provider will add a module
    // Step 7 : User create a DeFi Smart Account
    // Step 8 : User open a Vault, put some ether on it and borrow some dai
    // Step 9 : Provider should whitelist task

    //#region Step 1 Add EUR/USD Maker Medianizer in the PriceOracleResolver

    // PriceOracleResolver is a price feeder aggregator
    // You will be able to query price from multiple source through this aggregator
    // For the demo we add the ETH/USD Medianizer to the aggregator
    // MakerDAO price oracle are called Medianizer

    // await priceOracleResolver.addOracle(
    //   ORACLE_MAKER_ETH_USD,
    //   ORACLE_MAKER_ETH_USD_ADDR,
    //   PRICE_ORACLE_MAKER_PAYLOAD
    // );

    //#endregion

    //#region Step 2 Enable Debt Bridge Connector and Gelato Provider Payment Connector

    // Debt Bridge Connector is used during refinancing of debt
    // This Connect help the user to split a position in one protocol.
    // to 2 protocol in a safe way. Both debt position will be safe.

    // Gelato Provider Payment Connector is used for paying the provider
    // for task execution. So when futur task will be executed, through a self financing
    // transaction (user will pay during the execution of the task) task will
    // be executed. Improvind user experience.

    await address.userWallet.sendTransaction({
      to: hre.network.config.InstaMaster,
      value: ethers.utils.parseEther("0.1"),
    });

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [await contracts.instaMaster.getAddress()],
    });

    await contracts.instaConnectors
      .connect(contracts.instaMaster)
      .enable(contracts.connectGelatoDebtBridgeFromMaker.address);

    await contracts.instaConnectors
      .connect(contracts.instaMaster)
      .enable(contracts.connectGelatoProviderPayment.address);

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [await contracts.instaMaster.getAddress()],
    });

    expect(
      await contracts.instaConnectors.isConnector([
        contracts.connectGelatoDebtBridgeFromMaker.address,
      ])
    ).to.be.true;
    expect(
      await contracts.instaConnectors.isConnector([
        contracts.connectGelatoProviderPayment.address,
      ])
    ).to.be.true;

    //#endregion

    //#region Step 3  Executor Staking on Gelato

    // For task execution provider will ask a executor to watch the
    // blockchain for possible execution autorization given by
    // the condition that user choose when submitting the task.
    // And if all condition are meet executor will execute the task.
    // For safety measure Gelato ask the executor to stake a minimum
    // amount.

    await contracts.gelatoCore.connect(address.executorWallet).stakeExecutor({
      value: await contracts.gelatoCore.minExecutorStake(),
    });

    expect(
      await contracts.gelatoCore.isExecutorMinStaked(address.executorAddress)
    ).to.be.true;

    //#endregion

    //#region Step 4 Provider put some fund on gelato for paying future tasks executions

    // Provider put some funds in gelato system for paying the
    // Executor when this one will execute task on behalf of the
    // Provider. At each provider's task execution, some funds (approximatively
    // the gas cost value) will be transfered to the Executor stake.

    const TASK_AUTOMATION_FUNDS = await contracts.gelatoCore.minExecProviderFunds(
      GAS_LIMIT,
      GAS_PRICE_CEIL
    );

    await expect(
      contracts.gelatoCore
        .connect(address.providerWallet)
        .provideFunds(address.providerAddress, {
          value: TASK_AUTOMATION_FUNDS,
        })
    ).to.emit(contracts.gelatoCore, "LogFundsProvided");

    expect(
      await contracts.gelatoCore.providerFunds(address.providerAddress)
    ).to.be.equal(TASK_AUTOMATION_FUNDS);

    //#endregion

    //#region Step 5 Provider choose a executor

    // Provider choose a executor who will execute futur task
    // for the provider, it will be compensated by the provider.

    await expect(
      contracts.gelatoCore
        .connect(address.providerWallet)
        .providerAssignsExecutor(address.executorAddress)
    ).to.emit(contracts.gelatoCore, "LogProviderAssignedExecutor");

    expect(
      await contracts.gelatoCore.executorByProvider(address.providerAddress)
    ).to.be.equal(address.executorAddress);

    //#endregion

    //#region Step 6 Provider will add a module

    // By adding a module the provider will format future task's
    // payload by adding some specificity like his address to the
    // Payment connector for receiving payment of User.

    await expect(
      contracts.gelatoCore
        .connect(address.providerWallet)
        .addProviderModules([contracts.dsaProviderModule.address])
    ).to.emit(contracts.gelatoCore, "LogProviderModuleAdded");

    expect(
      await contracts.gelatoCore
        .connect(address.providerWallet)
        .isModuleProvided(
          address.providerAddress,
          contracts.dsaProviderModule.address
        )
    ).to.be.true;

    //#endregion

    //#region Step 7 User create a DeFi Smart Account

    // User create a Instadapp DeFi Smart Account
    // who give him the possibility to interact
    // with a large list of DeFi protocol through one
    // Proxy account.

    const dsaAccountCount = await contracts.instaList.accounts();

    await expect(
      contracts.instaIndex.build(address.userAddress, 1, address.userAddress)
    ).to.emit(contracts.instaIndex, "LogAccountCreated");
    const dsaID = dsaAccountCount.add(1);
    await expect(await contracts.instaList.accounts()).to.be.equal(dsaID);

    // Instantiate the DSA
    dsa = await ethers.getContractAt(
      InstaAccount.abi,
      await contracts.instaList.accountAddr(dsaID)
    );

    contracts.dsa = dsa;

    //#endregion

    //#region Step 8 User open a Vault, put some ether on it and borrow some dai

    // User open a maker vault
    // He deposit 10 Eth on it
    // He borrow a 1000 DAI

    const openVault = await hre.run("abi-encode-withselector", {
      abi: ConnectMaker.abi,
      functionname: "open",
      inputs: ["ETH-A"],
    });

    await dsa.cast(
      [hre.network.config.ConnectMaker],
      [openVault],
      address.userAddress
    );

    const cdps = await contracts.getCdps.getCdpsAsc(
      contracts.dssCdpManager.address,
      dsa.address
    );
    vaultId = String(cdps.ids[0]);
    expect(cdps.ids[0].isZero()).to.be.false;

    await dsa.cast(
      [hre.network.config.ConnectMaker],
      [
        await hre.run("abi-encode-withselector", {
          abi: ConnectMaker.abi,
          functionname: "deposit",
          inputs: [vaultId, MAKER_INITIAL_ETH, 0, 0],
        }),
      ],
      address.userAddress,
      {
        value: MAKER_INITIAL_ETH,
      }
    );

    await dsa.cast(
      [hre.network.config.ConnectMaker],
      [
        await hre.run("abi-encode-withselector", {
          abi: ConnectMaker.abi,
          functionname: "borrow",
          inputs: [vaultId, MAKER_INITIAL_DEBT, 0, 0],
        }),
      ],
      address.userAddress
    );

    expect(await contracts.daiToken.balanceOf(dsa.address)).to.be.equal(
      MAKER_INITIAL_DEBT
    );

    //#endregion

    //#region Step 9 Provider should whitelist task

    // By WhiteList task, the provider can constrain the type
    // of task the user can submitting.

    //#region Actions

    let spells = [];

    const debtBridgeCalculationForFullRefinance = new GelatoCoreLib.Action({
      addr: contracts.connectGelatoDebtBridgeFromMaker.address,
      data: await hre.run("abi-encode-withselector", {
        abi: ConnectGelatoDebtBridgeFromMakerABI,
        functionname: "saveFullRefinanceDataToMemory",
        inputs: [vaultId, 0, 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(debtBridgeCalculationForFullRefinance);

    const flashBorrow = new GelatoCoreLib.Action({
      addr: contracts.connectInstaPool.address,
      data: await hre.run("abi-encode-withselector", {
        abi: ConnectInstaPool.abi,
        functionname: "flashBorrow",
        inputs: [hre.network.config.DAI, 0, "600", 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(flashBorrow);

    const paybackMaker = new GelatoCoreLib.Action({
      addr: contracts.connectMaker.address,
      data: await hre.run("abi-encode-withselector", {
        abi: ConnectMaker.abi,
        functionname: "payback",
        inputs: [vaultId, 0, "601", 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(paybackMaker);

    const withdrawMaker = new GelatoCoreLib.Action({
      addr: contracts.connectMaker.address,
      data: await hre.run("abi-encode-withselector", {
        abi: ConnectMaker.abi,
        functionname: "withdraw",
        inputs: [vaultId, 0, "602", 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(withdrawMaker);

    const depositCompound = new GelatoCoreLib.Action({
      addr: contracts.connectCompound.address,
      data: await hre.run("abi-encode-withselector", {
        abi: ConnectCompound.abi,
        functionname: "deposit",
        inputs: [ETH, 0, "603", 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(depositCompound);

    const borrowCompound = new GelatoCoreLib.Action({
      addr: contracts.connectCompound.address,
      data: await hre.run("abi-encode-withselector", {
        abi: ConnectCompound.abi,
        functionname: "borrow",
        inputs: [hre.network.config.DAI, 0, "604", 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(borrowCompound);

    const flashPayBack = new GelatoCoreLib.Action({
      addr: contracts.connectInstaPool.address,
      data: await hre.run("abi-encode-withselector", {
        abi: ConnectInstaPool.abi,
        functionname: "flashPayback",
        inputs: [hre.network.config.DAI, 0, 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(flashPayBack);

    const payProvider = new GelatoCoreLib.Action({
      addr: contracts.connectGelatoProviderPayment.address,
      data: await hre.run("abi-encode-withselector", {
        abi: ConnectGelatoProviderPaymentABI,
        functionname: "payProvider",
        inputs: [address.providerAddress, ETH, 0, "605", 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    spells.push(payProvider);

    const gasPriceCeil = ethers.constants.MaxUint256;

    const connectGelatoDebtBridgeFromMakerTaskSpec = new GelatoCoreLib.TaskSpec(
      {
        conditions: [contracts.conditionMakerVaultUnsafe.address],
        actions: spells,
        gasPriceCeil,
      }
    );

    await expect(
      contracts.gelatoCore
        .connect(address.providerWallet)
        .provideTaskSpecs([connectGelatoDebtBridgeFromMakerTaskSpec])
    ).to.emit(contracts.gelatoCore, "LogTaskSpecProvided");

    expect(
      await contracts.gelatoCore
        .connect(address.providerWallet)
        .isTaskSpecProvided(
          address.providerAddress,
          connectGelatoDebtBridgeFromMakerTaskSpec
        )
    ).to.be.equal("OK");

    expect(
      await contracts.gelatoCore
        .connect(address.providerWallet)
        .taskSpecGasPriceCeil(
          address.providerAddress,
          await contracts.gelatoCore
            .connect(address.providerWallet)
            .hashTaskSpec(connectGelatoDebtBridgeFromMakerTaskSpec)
        )
    ).to.be.equal(gasPriceCeil);

    //#endregion

    //#endregion
    return {
      address: address,
      contracts: contracts,
      vaultId: vaultId,
      spells: spells,
    };
  }

  async getABI() {
    return {
      PriceOracleResolverABI: PriceOracleResolverABI,
      ConnectGelatoABI: ConnectGelato.abi,
      ConnectAuthABI: ConnectAuth.abi,
    };
  }

  async getConstants() {
    return {
      MIN_COL_RATIO_MAKER: MIN_COL_RATIO_MAKER,
      GAS_PRICE_CEIL: GAS_PRICE_CEIL,
      GAS_LIMIT: GAS_LIMIT,
      MAKER_INITIAL_DEBT: MAKER_INITIAL_DEBT,
    };
  }

  getConnectAuth() {
    return ConnectAuth;
  }
}

module.exports = Helper;
