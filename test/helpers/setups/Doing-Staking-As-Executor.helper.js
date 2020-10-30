const {expect} = require("chai");

async function executorDoStaking(executorWallet, gelatoCore) {
  //#region Executor Stake on Gelato

  // For task execution provider will ask a executor to watch the
  // blockchain for possible execution autorization given by
  // the condition that user choose when submitting the task.
  // And if all condition are meet executor will execute the task.
  // For safety measure Gelato ask the executor to stake a minimum
  // amount.

  let executorAddress = await executorWallet.getAddress();

  await gelatoCore.connect(executorWallet).stakeExecutor({
    value: await gelatoCore.minExecutorStake(),
  });

  expect(await gelatoCore.isExecutorMinStaked(executorAddress)).to.be.true;

  //#endregion
}

module.exports = executorDoStaking;
