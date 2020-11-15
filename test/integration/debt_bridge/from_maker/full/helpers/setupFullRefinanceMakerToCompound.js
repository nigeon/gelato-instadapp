const getWallets = require("../../../../../helpers/services/getWallets");
const getDebtBridgeFromMakerConstants = require("../../services/getDebtBridgeFromMakerConstants");
const getContracts = require("../../../../../helpers/services/getContracts");
const stakeExecutor = require("../../../../../helpers/services/gelato/stakeExecutor");
const provideFunds = require("../../../../../helpers/services/gelato/provideFunds");
const providerAssignsExecutor = require("../../../../../helpers/services/gelato/providerAssignsExecutor");
const addProviderModuleDSA = require("../../../../../helpers/services/gelato/addProviderModuleDSA");
const createDSA = require("../../../../../helpers/services/InstaDapp/createDSA");
const initializeMakerCdp = require("../../../../../helpers/services/maker/initializeMakerCdp");
const providerWhiteListTaskForMakerToCompound = require("./services/providerWhiteListTaskForMakerToCompound");
const getABI = require("../../../../../helpers/services/getABI");

module.exports = async function () {
  const wallets = await getWallets();
  const contracts = await getContracts();
  const constants = await getDebtBridgeFromMakerConstants();

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
};
