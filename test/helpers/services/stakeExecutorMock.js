const { expect } = require("chai");

async function stakeExecutor(
  gelatoExecutorWallet,
  gelatoExecutorMock,
  gelatoCore
) {
  //#region Executor Stake on Gelato

  // For task execution provider will ask a executor to watch the
  // blockchain for possible execution autorization given by
  // the condition that user choose when submitting the task.
  // And if all condition are meet executor will execute the task.
  // For safety measure Gelato ask the executor to stake a minimum
  // amount.
  // In our Mock case this executor will be a contract, who will call the gelatoCore smart contract

  await gelatoExecutorMock.connect(gelatoExecutorWallet).stakeExecutor({
    value: await gelatoCore.minExecutorStake(),
  });

  expect(await gelatoCore.isExecutorMinStaked(gelatoExecutorMock.address)).to.be
    .true;

  //#endregion
}

module.exports = stakeExecutor;
