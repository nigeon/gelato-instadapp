const { sleep } = require("@gelatonetwork/core");
const hre = require("hardhat");
const { ethers } = hre;
const GelatoCoreLib = require("@gelatonetwork/core");

module.exports = async (hre) => {
  if (hre.network.name === "mainnet") {
    console.log(
      "Deploying MockGelatoExecutor to mainnet. Hit ctrl + c to abort"
    );
    await sleep(6000);
  }

  const { deployments } = hre;
  const { deploy } = deployments;
  const { deployer } = await hre.getNamedAccounts();
  const gelatoCore = await ethers.getContractAt(
    GelatoCoreLib.GelatoCore.abi,
    hre.network.config.GelatoCore
  );

  // the following will only deploy "MockGelatoExecutor"
  // if the contract was never deployed or if the code changed since last deployment
  await deploy("MockGelatoExecutor", {
    from: deployer,
    args: [gelatoCore.address],
    gasPrice: hre.network.config.gasPrice,
    log: hre.network.name === "mainnet" ? true : false,
  });
};
module.exports.skip = async (hre) => {
  return hre.network.name === "mainnet" ? true : false;
};
module.exports.tags = ["MockGelatoExecutor"];
