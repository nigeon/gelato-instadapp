const getWallets = require("./services/getWallets");
const getConstants = require("./services/getConstants");
const getContracts = require("./services/getContracts");
const stakeExecutor = require("./services/stakeExecutor");
const provideFunds = require("./services/provideFunds");
const providerAssignsExecutor = require("./services/providerAssignsExecutor");
const addProviderModuleDSA = require("./services/addProviderModuleDSA");
const createDSA = require("./services/createDSA");
const initializeMakerCdp = require("./services/initializeMakerCdp");
const providerWhiteListTaskForMakerToCompound = require("./services/providerWhiteListTaskForMakerToCompound");
const getABI = require("./services/getABI");

async function setupFullRefinanceMakerToCompound() {
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
  const vaultId = await initializeMakerCdp(
    wallets.userAddress,
    contracts.DAI,
    contracts.dsa,
    contracts.getCdps,
    contracts.dssCdpManager,
    constants.MAKER_INITIAL_ETH,
    constants.MAKER_INITIAL_DEBT
  );

  const spells = await providerWhiteListTaskForMakerToCompound(
    wallets,
    contracts,
    constants,
    vaultId
  );

  const ABI = getABI();

  return {
    wallets,
    contracts,
    constants,
    vaultId,
    spells,
    ABI,
  };
}

module.exports = setupFullRefinanceMakerToCompound;
