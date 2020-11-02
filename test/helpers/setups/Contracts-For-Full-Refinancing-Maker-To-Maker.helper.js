const hre = require("hardhat");
const {ethers} = hre;

const getContracts = require("./Common-Contracts.helper");

async function getAllContracts() {
  let connectGelatoData;
  let debtBridgeFromMakerForFullRefinance;
  let dsaProviderModule;
  let contracts = await getContracts();

  const ConnectGelatoData = await ethers.getContractFactory(
    "ConnectGelatoData"
  );
  connectGelatoData = await ConnectGelatoData.deploy(
    (await contracts.instaConnectors.connectorLength()).add(1)
  );
  await connectGelatoData.deployed();

  const DebtBridgeFromMakerForFullRefinance = await ethers.getContractFactory(
    "DebtBridgeFromMakerForFullRefinance"
  );
  debtBridgeFromMakerForFullRefinance = await DebtBridgeFromMakerForFullRefinance.deploy(
    contracts.connectGelatoProviderPayment.address
  );
  await debtBridgeFromMakerForFullRefinance.deployed();

  const ProviderModuleDSA = await ethers.getContractFactory(
    "ProviderModuleDsaFromMakerToMaker"
  );
  dsaProviderModule = await ProviderModuleDSA.deploy(
    hre.network.config.GelatoCore,
    contracts.connectGelatoProviderPayment.address
  );
  await dsaProviderModule.deployed();

  contracts.connectGelatoData = connectGelatoData;
  contracts.debtBridgeFromMakerForFullRefinance = debtBridgeFromMakerForFullRefinance;
  contracts.dsaProviderModule = dsaProviderModule;

  return contracts;
}

module.exports = getAllContracts;
