const {expect} = require("chai");
const hre = require("hardhat");
const {ethers} = hre;

async function getWallets() {
  let userWallet;
  let userAddress;
  let gelatoProviderWallet;
  let gelatoProviderAddress;
  let gelatoExecutorWallet;
  let gelatoExecutorAddress;

  [
    userWallet,
    gelatoProviderWallet,
    gelatoExecutorWallet,
  ] = await ethers.getSigners();
  userAddress = await userWallet.getAddress();
  gelatoProviderAddress = await gelatoProviderWallet.getAddress();
  gelatoExecutorAddress = await gelatoExecutorWallet.getAddress();

  // Hardhat default wallets prefilled with 100 ETH
  expect(await userWallet.getBalance()).to.be.gt(ethers.utils.parseEther("10"));

  return {
    userWallet: userWallet,
    userAddress: userAddress,
    gelatoProviderWallet: gelatoProviderWallet,
    gelatoProviderAddress: gelatoProviderAddress,
    gelatoExecutorWallet: gelatoExecutorWallet,
    gelatoExecutorAddress: gelatoExecutorAddress,
  };
}

module.exports = getWallets;
