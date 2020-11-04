const {sleep} = require("@gelatonetwork/core");

const InstaConnector = require("../../pre-compiles/InstaConnectors.json");

module.exports = async (hre) => {
  if (hre.network.name === "mainnet") {
    console.log(
      "Deploying ConnectGelatoProviderPayment to mainnet. Hit ctrl + c to abort"
    );
    await sleep(10000);
  }
  const {deployments} = hre;
  const {deploy} = deployments;
  const {deployer, gelatoProvider} = await hre.getNamedAccounts();

  const instaConnectors = await hre.ethers.getContractAt(
    InstaConnector.abi,
    hre.network.config.InstaConnectors
  );
  const connectorLength = await instaConnectors.connectorLength();
  const connectorId = connectorLength.add(1);

  // the following will only deploy "ConnectGelatoProviderPayment"
  // if the contract was never deployed or if the code changed since last deployment
  await deploy("ConnectGelatoProviderPayment", {
    from: deployer,
    args: [connectorId, gelatoProvider],
    gasPrice: hre.network.config.gasPrice,
    log: hre.network.name === "mainnet" ? true : false,
  });
};

module.exports.tags = ["ConnectGelatoProviderPayment"];
