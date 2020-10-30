const hre = require("hardhat");
const {ethers} = hre;
const GelatoCoreLib = require("@gelatonetwork/core");

const InstaIndex = require("../../../pre-compiles/InstaIndex.json");
const InstaList = require("../../../pre-compiles/InstaList.json");
const ConnectGelato = require("../../../pre-compiles/ConnectGelato.json");
const ConnectMaker = require("../../../pre-compiles/ConnectMaker.json");
const ConnectCompound = require("../../../pre-compiles/ConnectCompound.json");
const ConnectInstaPool = require("../../../pre-compiles/ConnectInstaPool.json");

const InstaConnector = require("../../../pre-compiles/InstaConnectors.json");
const InstaMapping = require("../../../pre-compiles/InstaMapping.json");
const DssCdpManager = require("../../../pre-compiles/DssCdpManager.json");
const GetCdps = require("../../../pre-compiles/GetCdps.json");
const IERC20 = require("../../../pre-compiles/IERC20.json");
const CTokenInterface = require("../../../pre-compiles/CTokenInterface.json");
const CompoundResolver = require("../../../pre-compiles/InstaCompoundResolver.json");

async function getContracts() {
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
  let instaMapping;
  let instaConnectors;
  let compoundResolver;
  // Contracts to deploy and use for local testing
  let conditionMakerVaultUnsafe;
  let connectGelatoProviderPayment;
  let priceOracleResolver;
  let connectGelatoDebtBridge;
  let debtBridgeFromMaker;

  instaMaster = await ethers.provider.getSigner(hre.network.config.InstaMaster);

  // ===== Get Deployed Contract Instance ==================
  instaIndex = await ethers.getContractAt(
    InstaIndex.abi,
    hre.network.config.InstaIndex
  );
  instaMapping = await ethers.getContractAt(
    InstaMapping.abi,
    hre.network.config.InstaMapping
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
  getCdps = await ethers.getContractAt(GetCdps.abi, hre.network.config.GetCdps);
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

  const ConnectGelatoProviderPayment = await ethers.getContractFactory(
    "ConnectGelatoProviderPayment"
  );
  connectGelatoProviderPayment = await ConnectGelatoProviderPayment.deploy(
    (await instaConnectors.connectorLength()).add(2)
  );
  await connectGelatoProviderPayment.deployed();

  return {
    connectGelato: connectGelato,
    connectMaker: connectMaker,
    connectInstaPool: connectInstaPool,
    connectCompound: connectCompound,
    instaIndex: instaIndex,
    instaList: instaList,
    instaMapping: instaMapping,
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
    connectGelatoProviderPayment: connectGelatoProviderPayment,
    priceOracleResolver: priceOracleResolver,
    dsa: ethers.constants.AddressZero,
    connectGelatoDebtBridge: connectGelatoDebtBridge,
    debtBridgeFromMaker: debtBridgeFromMaker,
  };
}

module.exports = getContracts;
