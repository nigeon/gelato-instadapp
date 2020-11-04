const getWallets = require("./services/getWallets");
const getContracts = require("./services/getContracts");
const getConstants = require("./services/getConstants");
const stakeExecutor = require("./services/stakeExecutor");
const provideFunds = require("./services/provideFunds");
const providerAssignsExecutor = require("./services/providerAssignsExecutor");
const addProviderModuleDSA = require("./services/addProviderModuleDSA");
const createDSA = require("./services/createDSA");
const addETHBGemJoinMapping = require("./services/addETHBGemJoinMapping");
const initializeMakerCdp = require("./services/initializeMakerCdp");
const providerWhiteListTaskForMakerETHAToMakerETHB = require("./services/providerWhiteListTaskForMakerETHAToMakerETHB");
const getABI = require("./services/getABI");

async function setupFullRefinanceMakerToMaker() {
  const wallets = await getWallets();
  const contracts = await getContracts();
  const constants = await getConstants();

  // Gelato Testing environment setup.
  await stakeExecutor(wallets.gelatoExecutorWallet, contracts.gelatoCore);
  await provideFunds(
    wallets.gelatoProviderWallet,
    contracts.gelatoCore,
    constants.GAS_LIMIT,
    constants.GAS_PRICE_CEIL
  );
  await providerAssignsExecutor(
    wallets.gelatoProviderWallet,
    wallets.gelatoExecutorAddress,
    contracts.gelatoCore
  );
  await addProviderModuleDSA(
    wallets.gelatoProviderWallet,
    contracts.gelatoCore,
    contracts.dsaProviderModule.address
  );
  contracts.dsa = await createDSA(
    wallets.userAddress,
    contracts.instaIndex,
    contracts.instaList
  );
  await addETHBGemJoinMapping(
    wallets.userWallet,
    contracts.instaMapping,
    contracts.instaMaster
  );
  const vaultAId = await initializeMakerCdp(
    wallets.userAddress,
    contracts.DAI,
    contracts.dsa,
    contracts.getCdps,
    contracts.dssCdpManager,
    constants.MAKER_INITIAL_ETH,
    constants.MAKER_INITIAL_DEBT
  );

  const spells = await providerWhiteListTaskForMakerETHAToMakerETHB(
    wallets,
    contracts,
    constants,
    vaultAId
  );

  const ABI = getABI();

  return {
    wallets,
    contracts,
    constants,
    vaultAId,
    spells,
    ABI,
  };
}

module.exports = setupFullRefinanceMakerToMaker;
