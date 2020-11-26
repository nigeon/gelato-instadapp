const { expect } = require("chai");
const hre = require("hardhat");
const { deployments, ethers } = hre;
const GelatoCoreLib = require("@gelatonetwork/core");

// Instadapp UI should do the same implementation for submitting debt bridge task
module.exports = async function (
  wallets,
  contracts,
  constants,
  mockRoute,
  vaultAId
) {
  //#region Step 9 Provider should whitelist task

  // By WhiteList task, the provider can constrain the type
  // of task the user can submitting.

  //#region Actions

  const spells = [];

  const calculationForFullLiquidation = new GelatoCoreLib.Action({
    addr: contracts.mockConnectGelatoDataFullLiquidateMaker.address,
    data: await hre.run("abi-encode-withselector", {
      abi: (
        await deployments.getArtifact("MockConnectGelatoDataFullLiquidateMaker")
      ).abi,
      functionname: "getDataAndCastLiquidation",
      inputs: [mockRoute, vaultAId, constants.ETH],
    }),
    operation: GelatoCoreLib.Operation.Delegatecall,
  });

  spells.push(calculationForFullLiquidation);

  const gasPriceCeil = ethers.constants.MaxUint256;

  const connectGelatoFullLiquidateMakerTaskSpec = new GelatoCoreLib.TaskSpec(
    {
      conditions: [
        contracts.conditionMakerVaultUnsafe.address,
      ],
      actions: spells,
      gasPriceCeil,
    }
  );

  await expect(
    contracts.gelatoCore
      .connect(wallets.gelatoProviderWallet)
      .provideTaskSpecs([connectGelatoFullLiquidateMakerTaskSpec])
  ).to.emit(contracts.gelatoCore, "LogTaskSpecProvided");

  expect(
    await contracts.gelatoCore
      .connect(wallets.gelatoProviderWallet)
      .isTaskSpecProvided(
        wallets.gelatoProviderAddress,
        connectGelatoFullLiquidateMakerTaskSpec
      )
  ).to.be.equal("OK");

  expect(
    await contracts.gelatoCore
      .connect(wallets.gelatoProviderWallet)
      .taskSpecGasPriceCeil(
        wallets.gelatoProviderAddress,
        await contracts.gelatoCore
          .connect(wallets.gelatoProviderWallet)
          .hashTaskSpec(connectGelatoFullLiquidateMakerTaskSpec)
      )
  ).to.be.equal(gasPriceCeil);

  //#endregion

  return spells;
};
