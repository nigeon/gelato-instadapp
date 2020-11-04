const {expect} = require("chai");
const hre = require("hardhat");
const {ethers} = hre;

async function enableGelatoConnectorsForFromMaker(
  userWallet,
  connectGelatoProviderPaymentAddr,
  connectGelatoDataAddr,
  instaMaster,
  instaConnectors
) {
  //#region Enable Debt Bridge Connector and Gelato Provider Payment Connector

  // Debt Bridge Connector is used during refinancing of debt
  // This Connect help the user to split a position in one protocol.
  // to 2 protocol in a safe way. Both debt position will be safe.

  // Gelato Provider Payment Connector is used for paying the provider
  // for task execution. So when futur task will be executed, through a self financing
  // transaction (user will pay during the execution of the task) task will
  // be executed. Improvind user experience.

  await userWallet.sendTransaction({
    to: hre.network.config.InstaMaster,
    value: ethers.utils.parseEther("0.01"),
  });

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [await instaMaster.getAddress()],
  });

  await instaConnectors.connect(instaMaster).enable(connectGelatoDataAddr);

  await instaConnectors
    .connect(instaMaster)
    .enable(connectGelatoProviderPaymentAddr);

  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [await instaMaster.getAddress()],
  });

  expect(await instaConnectors.isConnector([connectGelatoDataAddr])).to.be.true;
  expect(await instaConnectors.isConnector([connectGelatoProviderPaymentAddr]))
    .to.be.true;

  //#endregion
}

module.exports = enableGelatoConnectorsForFromMaker;
