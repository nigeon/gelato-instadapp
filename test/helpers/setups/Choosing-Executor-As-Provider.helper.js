const {expect} = require("chai");

async function providerChooseExecutor(
  providerWallet,
  executorAddress,
  gelatoCore
) {
  //#region Provider choose a executor

  // Provider choose a executor who will execute futur task
  // for the provider, it will be compensated by the provider.

  let providerAddress = await providerWallet.getAddress();

  await expect(
    gelatoCore.connect(providerWallet).providerAssignsExecutor(executorAddress)
  ).to.emit(gelatoCore, "LogProviderAssignedExecutor");

  expect(await gelatoCore.executorByProvider(providerAddress)).to.be.equal(
    executorAddress
  );

  //#endregion
}

module.exports = providerChooseExecutor;
