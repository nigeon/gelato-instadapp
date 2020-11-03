const hre = require("hardhat");
const {ethers} = hre;

const getContracts = require("./Common-Contracts.helper");

async function getAllContracts(providerAddress) {
  let connectGelatoData;
  let contracts = await getContracts(providerAddress);

  const ConnectGelatoData = await ethers.getContractFactory(
    "ConnectGelatoDataForFullRefinance"
  );
  connectGelatoData = await ConnectGelatoData.deploy(
    (await contracts.instaConnectors.connectorLength()).add(1),
    contracts.connectGelatoProviderPayment.address
  );
  await connectGelatoData.deployed();

  contracts.connectGelatoData = connectGelatoData;

  return contracts;
}

module.exports = getAllContracts;
