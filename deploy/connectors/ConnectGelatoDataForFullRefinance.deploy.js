const {sleep} = require("@gelatonetwork/core");

const InstaConnector = require("../../pre-compiles/InstaConnectors.json");

module.exports = async (hre) => {
  if (hre.network.name === "mainnet") {
    console.log(
      "Deploying ConnectGelatoDataForFullRefinance to mainnet. Hit ctrl + c to abort"
    );
    await sleep(10000);
  }

  const {deployments} = hre;
  const {deploy} = deployments;
  const {deployer} = await hre.getNamedAccounts();

  const instaConnectors = await hre.ethers.getContractAt(
    InstaConnector.abi,
    hre.network.config.InstaConnectors
  );
  const connectorLength = await instaConnectors.connectorLength();
  const connectorId = connectorLength.add(1);

  // the following will only deploy "ConnectGelatoDataForFullRefinance"
  // if the contract was never deployed or if the code changed since last deployment
  await deploy("ConnectGelatoDataForFullRefinance", {
    from: deployer,
    args: [
      connectorId,
      (await deployments.get("ConnectGelatoProviderPayment")).address,
    ],
    gasPrice: hre.network.config.gasPrice,
    log: hre.network.name === "mainnet" ? true : false,
  });
};

module.exports.dependencies = ["ConnectGelatoProviderPayment"];
module.exports.tags = ["ConnectGelatoDataForFullRefinance"];
