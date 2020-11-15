const hre = require("hardhat");
const { ethers } = hre;

module.exports = async function () {
  return await ethers.getContract("MockGelatoExecutor");
};
