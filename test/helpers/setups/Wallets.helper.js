const {expect} = require("chai");
const hre = require("hardhat");
const {ethers} = hre;

async function getWallets() {
  let userWallet;
  let userAddress;
  let providerWallet;
  let providerAddress;
  let executorWallet;
  let executorAddress;

  [userWallet, providerWallet, executorWallet] = await ethers.getSigners();
  userAddress = await userWallet.getAddress();
  providerAddress = await providerWallet.getAddress();
  executorAddress = await executorWallet.getAddress();

  // Hardhat default wallets prefilled with 100 ETH
  expect(await userWallet.getBalance()).to.be.gt(ethers.utils.parseEther("10"));

  return {
    userWallet: userWallet,
    userAddress: userAddress,
    providerWallet: providerWallet,
    providerAddress: providerAddress,
    executorWallet: executorWallet,
    executorAddress: executorAddress,
  };
}

module.exports = getWallets;
