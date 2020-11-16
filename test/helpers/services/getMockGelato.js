const hre = require("hardhat");
const { ethers } = hre;

async function getMockGelato() {
  return await ethers.getContract("MockGelatoExecutor");
}

module.exports = getMockGelato;
