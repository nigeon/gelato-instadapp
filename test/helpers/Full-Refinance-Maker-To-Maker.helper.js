const {expect} = require("chai");
const hre = require("hardhat");
const {ethers} = hre;
const GelatoCoreLib = require("@gelatonetwork/core");

const executorDoStaking = require("./setups/Doing-Staking-As-Executor.helper");
const providerDoFunding = require("./setups/Doing-Funding-As-Provider.helper");
const providerAddCustomModuleForPayment = require("./setups/Adding-Custom-Module-As-Provider.helper");
const providerChooseExecutor = require("./setups/Choosing-Executor-As-Provider.helper");
const userCreateADSA = require("./setups/Creating-DSA-As-User.helper");
const masterAddETHBOnGemJoinMapping = require("./setups/Adding-ETHB-On-InstaMapping-As-InstaMaster.helper");
const userOpenDepositBorrowOnMakerVault = require("./setups/Open-Deposit-Borrow-On-Maker-As-User.helper");
const getWallets = require("./setups/Wallets.helper");
const getConstants = require("./setups/Constants.helper");
const getABI = require("./setups/ABI.helper");
const getAllContracts = require("./setups/Contracts-For-Full-Refinancing-Maker-To-Maker.helper");
const enableGelatoConnectorsForFromMaker = require("./setups/Enabling-New-Connectors-For-Full-Refinance.helper");

const ConnectGelatoDataForFullRefinance = require("../../artifacts/contracts/contracts/connectors/ConnectGelatoDataForFullRefinance.sol/ConnectGelatoDataForFullRefinance.json")
  .abi;

async function makerETHAToMakerETHBSetup() {
  const wallets = await getWallets();
  const contracts = await getAllContracts();
  const constants = await getConstants();
  let vaultAId;
  // Gelato Testing environment setup.
  await enableGelatoConnectorsForFromMaker(
    wallets.userWallet,
    contracts.connectGelatoProviderPayment.address,
    contracts.connectGelatoData.address,
    contracts.instaMaster,
    contracts.instaConnectors
  );
  await executorDoStaking(wallets.executorWallet, contracts.gelatoCore);
  await providerDoFunding(
    wallets.providerWallet,
    contracts.gelatoCore,
    constants.GAS_LIMIT,
    constants.GAS_PRICE_CEIL
  );
  await providerChooseExecutor(
    wallets.providerWallet,
    wallets.executorAddress,
    contracts.gelatoCore
  );
  await providerAddCustomModuleForPayment(
    wallets.providerWallet,
    contracts.gelatoCore,
    contracts.dsaProviderModule.address
  );
  contracts.dsa = await userCreateADSA(
    wallets.userAddress,
    contracts.instaIndex,
    contracts.instaList
  );
  await masterAddETHBOnGemJoinMapping(
    wallets.userWallet,
    contracts.instaMapping,
    contracts.instaMaster
  );
  vaultAId = await userOpenDepositBorrowOnMakerVault(
    wallets.userAddress,
    contracts.DAI,
    contracts.dsa,
    contracts.getCdps,
    contracts.dssCdpManager,
    constants.MAKER_INITIAL_ETH,
    constants.MAKER_INITIAL_DEBT
  );

  let ABI = await getABI();

  const spells = await providerWhiteListTaskForMakerETHAToMakerETHB(
    wallets,
    contracts,
    constants,
    vaultAId
  );

  return {
    wallets,
    contracts,
    vaultAId,
    spells,
    constants,
    ABI,
  };
}

// Instadapp UI should do the same implementation for submitting debt bridge task
async function providerWhiteListTaskForMakerETHAToMakerETHB(
  wallets,
  contracts,
  constants,
  vaultId
) {
  //#region Step 9 Provider should whitelist task

  // By WhiteList task, the provider can constrain the type
  // of task the user can submitting.

  //#region Actions

  const spells = [];

  const debtBridgeCalculationForFullRefinance = new GelatoCoreLib.Action({
    addr: contracts.connectGelatoData.address,
    data: await hre.run("abi-encode-withselector", {
      abi: ConnectGelatoDataForFullRefinance,
      functionname: "getDataAndCastForFromMakerToMaker",
      inputs: [vaultId, constants.ETH, "ETH-B", wallets.providerAddress],
    }),
    operation: GelatoCoreLib.Operation.Delegatecall,
  });

  spells.push(debtBridgeCalculationForFullRefinance);

  const gasPriceCeil = ethers.constants.MaxUint256;

  const connectGelatoFullDebtBridgeFromMakerTaskSpec = new GelatoCoreLib.TaskSpec(
    {
      conditions: [contracts.conditionMakerVaultUnsafe.address],
      actions: spells,
      gasPriceCeil,
    }
  );

  await expect(
    contracts.gelatoCore
      .connect(wallets.providerWallet)
      .provideTaskSpecs([connectGelatoFullDebtBridgeFromMakerTaskSpec])
  ).to.emit(contracts.gelatoCore, "LogTaskSpecProvided");

  expect(
    await contracts.gelatoCore
      .connect(wallets.providerWallet)
      .isTaskSpecProvided(
        wallets.providerAddress,
        connectGelatoFullDebtBridgeFromMakerTaskSpec
      )
  ).to.be.equal("OK");

  expect(
    await contracts.gelatoCore
      .connect(wallets.providerWallet)
      .taskSpecGasPriceCeil(
        wallets.providerAddress,
        await contracts.gelatoCore
          .connect(wallets.providerWallet)
          .hashTaskSpec(connectGelatoFullDebtBridgeFromMakerTaskSpec)
      )
  ).to.be.equal(gasPriceCeil);

  //#endregion

  return spells;
}

module.exports = makerETHAToMakerETHBSetup;