const hre = require("hardhat");
const { ethers } = hre;
const assert = require("assert");
const { sleep } = require("@gelatonetwork/core");
const InstaConnector = require("../../pre-compiles/InstaConnectors.json");

module.exports = async (hre) => {
  if (hre.network.name === "mainnet") {
    console.log(
      "Deploying ConnectGelatoDataPartialRefinanceMaker to mainnet. Hit ctrl + c to abort"
    );
    console.log("❗ CONNECTOR DEPLOYMENT: VERIFY & HARDCODE CONNECTOR ID");
    await sleep(10000);
  }

  const { deployments } = hre;
  const { deploy } = deployments;
  const { deployer } = await hre.getNamedAccounts();

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

    const instaConnectors = await hre.ethers.getContractAt(
      InstaConnector.abi,
      hre.network.config.InstaConnectors
    );
    const connectorLength = await instaConnectors.connectorLength();
    const connectorId = connectorLength.add(1);

    await deploy("ConnectGelatoDataPartialRefinanceMaker", {
      from: deployer,
      args: [
        connectorId,
        (await deployments.get("ConnectGelatoProviderPayment")).address,
      ],
    });

    await instaConnectors
      .connect(instaMaster)
      .enable(
        (await ethers.getContract("ConnectGelatoDataPartialRefinanceMaker"))
          .address
      );

    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [await instaMaster.getAddress()],
    });
  } else {
    assert(process.env.ConnectGelatoDataPartialRefinanceMakerId);

    // the following will only deploy "ConnectGelatoDataPartialRefinanceMaker"
    // if the contract was never deployed or if the code changed since last deployment
    await deploy("ConnectGelatoDataPartialRefinanceMaker", {
      from: deployer,
      args: [
        parseInt(process.env.ConnectGelatoDataPartialRefinanceMakerId),
        (await deployments.get("ConnectGelatoProviderPayment")).address,
      ],
      gasPrice: hre.network.config.gasPrice,
      log: true,
    });
  }
};

module.exports.skip = async (hre) => {
  if (hre.network.name === "mainnet") return true;
  if (hre.network.name !== "hardhat")
    return process.env.ConnectGelatoDataPartialRefinanceMakerId === undefined;
  return false;
};
module.exports.tags = ["ConnectGelatoDataPartialRefinanceMaker"];
module.exports.dependencies = ["ConnectGelatoProviderPayment"];
