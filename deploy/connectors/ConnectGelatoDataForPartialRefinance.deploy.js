const hre = require("hardhat");
const {ethers} = hre;

const {sleep} = require("@gelatonetwork/core");

const InstaConnector = require("../../pre-compiles/InstaConnectors.json");

module.exports = async (hre) => {
  if (hre.network.name === "mainnet") {
    console.log(
      "Deploying ConnectGelatoDataForPartialRefinance to mainnet. Hit ctrl + c to abort"
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

  // the following will only deploy "ConnectGelatoDataForPartialRefinance"
  // if the contract was never deployed or if the code changed since last deployment
  await deploy("ConnectGelatoDataForPartialRefinance", {
    from: deployer,
    args: [
      connectorId,
      (await deployments.get("ConnectGelatoProviderPayment")).address,
    ],
    gasPrice: hre.network.config.gasPrice,
    log: hre.network.name === "mainnet" ? true : false,
  });

  if (hre.network.name === "hardhat") {
    const deployerWallet = await ethers.provider.getSigner(deployer);
    const instaMaster = await ethers.provider.getSigner(
      hre.network.config.InstaMaster
    );

    await deployerWallet.sendTransaction({
      to: await instaMaster.getAddress(),
      value: ethers.utils.parseEther("0.1"),
    });

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [await instaMaster.getAddress()],
    });

    await instaConnectors
      .connect(instaMaster)
      .enable(
        (await ethers.getContract("ConnectGelatoDataForPartialRefinance"))
          .address
      );

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [await instaMaster.getAddress()],
    });
  }
};

module.exports.skip = async (hre) => {
  return hre.network.name === "mainnet" ? true : false;
};
module.exports.tags = ["ConnectGelatoDataForPartialRefinance"];
module.exports.dependencies = ["ConnectGelatoProviderPayment"];
