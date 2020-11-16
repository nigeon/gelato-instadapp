const { expect } = require("chai");

async function addProviderModuleDSA(
  gelatoProviderWallet,
  gelatoCore,
  dsaProviderModuleAddr
) {
  //#region Provider will add a module

  // By adding a module the provider will format future task's
  // payload by adding some specificity like his address to the
  // Payment connector for receiving payment of User.

  const gelatoProviderAddress = await gelatoProviderWallet.getAddress();

  await expect(
    gelatoCore
      .connect(gelatoProviderWallet)
      .addProviderModules([dsaProviderModuleAddr])
  ).to.emit(gelatoCore, "LogProviderModuleAdded");

  expect(
    await gelatoCore
      .connect(gelatoProviderWallet)
      .isModuleProvided(gelatoProviderAddress, dsaProviderModuleAddr)
  ).to.be.true;

  //#endregion
}

module.exports = addProviderModuleDSA;
