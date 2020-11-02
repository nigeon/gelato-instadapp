const hre = require("hardhat");
const {ethers} = hre;

const getContracts = require("./Common-Contracts.helper");

async function getAllContracts() {
  let dsaProviderModule;
  let connectGelatoData;
  let contracts = await getContracts();

  const ConnectGelatoData = await ethers.getContractFactory(
    "ConnectGelatoDataForFullRefinance"
  );
  connectGelatoData = await ConnectGelatoData.deploy(
    (await contracts.instaConnectors.connectorLength()).add(1),
    contracts.connectGelatoProviderPayment.address
  );
  await connectGelatoData.deployed();

  const ProviderModuleDsa = await ethers.getContractFactory(
    "ProviderModuleDsaFromMakerToCompound"
  );
  dsaProviderModule = await ProviderModuleDsa.deploy(
    hre.network.config.GelatoCore,
    contracts.connectGelatoProviderPayment.address
  );
  await dsaProviderModule.deployed();

  contracts.dsaProviderModule = dsaProviderModule;
  contracts.connectGelatoData = connectGelatoData;

  return contracts;
}

module.exports = getAllContracts;
