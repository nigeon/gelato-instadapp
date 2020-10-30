const {expect} = require("chai");

async function providerAddCustomModuleForPayment(
  providerWallet,
  gelatoCore,
  dsaProviderModuleAddr
) {
  //#region Provider will add a module

  // By adding a module the provider will format future task's
  // payload by adding some specificity like his address to the
  // Payment connector for receiving payment of User.

  let providerAddress = await providerWallet.getAddress();

  await expect(
    gelatoCore
      .connect(providerWallet)
      .addProviderModules([dsaProviderModuleAddr])
  ).to.emit(gelatoCore, "LogProviderModuleAdded");

  expect(
    await gelatoCore
      .connect(providerWallet)
      .isModuleProvided(providerAddress, dsaProviderModuleAddr)
  ).to.be.true;

  //#endregion
}

module.exports = providerAddCustomModuleForPayment;
