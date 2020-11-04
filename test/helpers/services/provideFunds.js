const {expect} = require("chai");

async function provideFunds(
  gelatoProviderWallet,
  gelatoCore,
  gasLimit,
  gasPriceCeil
) {
  //#region Provider put some fund on gelato for paying future tasks executions

  // Provider put some funds in gelato system for paying the
  // Executor when this one will execute task on behalf of the
  // Provider. At each provider's task execution, some funds (approximatively
  // the gas cost value) will be transfered to the Executor stake.

  let gelatoProviderAddress = await gelatoProviderWallet.getAddress();

  const TASK_AUTOMATION_FUNDS = await gelatoCore.minExecProviderFunds(
    gasLimit,
    gasPriceCeil
  );

  await expect(
    gelatoCore
      .connect(gelatoProviderWallet)
      .provideFunds(gelatoProviderAddress, {
        value: TASK_AUTOMATION_FUNDS,
      })
  ).to.emit(gelatoCore, "LogFundsProvided");

  expect(await gelatoCore.providerFunds(gelatoProviderAddress)).to.be.equal(
    TASK_AUTOMATION_FUNDS
  );

  //#endregion
}

module.exports = provideFunds;
