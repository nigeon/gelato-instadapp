const hre = require("hardhat");
const {ethers} = hre;

const getContracts = require("./Common-Contracts.helper");

async function getAllContracts() {
  let connectGelatoDebtBridge;
  let debtBridgeFromMaker;
  let dsaProviderModule;
  let contracts = await getContracts();

  const ConnectGelatoDebtBridge = await ethers.getContractFactory(
    "ConnectGelatoDebtBridge"
  );
  connectGelatoDebtBridge = await ConnectGelatoDebtBridge.deploy(
    (await contracts.instaConnectors.connectorLength()).add(1)
  );
  await connectGelatoDebtBridge.deployed();

  const DebtBridgeFromMaker = await ethers.getContractFactory(
    "DebtBridgeFromMakerForFullRefinance"
  );
  debtBridgeFromMaker = await DebtBridgeFromMaker.deploy(
    contracts.connectGelatoProviderPayment.address
  );
  await debtBridgeFromMaker.deployed();

  const ProviderModuleDSA = await ethers.getContractFactory(
    "ProviderModuleDSAFromMakerToMaker"
  );
  dsaProviderModule = await ProviderModuleDSA.deploy(
    hre.network.config.GelatoCore,
    contracts.connectGelatoProviderPayment.address
  );
  await dsaProviderModule.deployed();

  contracts.connectGelatoDebtBridge = connectGelatoDebtBridge;
  contracts.debtBridgeFromMaker = debtBridgeFromMaker;
  contracts.dsaProviderModule = dsaProviderModule;

  return contracts;
}

module.exports = getAllContracts;
