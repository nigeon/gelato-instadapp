const getWallets = require("../../../../../helpers/services/getWallets");
const getContracts = require("../../../../../helpers/services/getContracts");
const getDebtBridgeFromMakerConstants = require("../../../../../integration/debt_bridge/from_maker/services/getDebtBridgeFromMakerConstants");
const provideFunds = require("../../../../../helpers/services/gelato/provideFunds");
const providerAssignsExecutor = require("../../../../../helpers/services/gelato/providerAssignsExecutor");
const addProviderModuleDSA = require("../../../../../helpers/services/gelato/addProviderModuleDSA");
const createDSA = require("../../../../../helpers/services/InstaDapp/createDSA");
const addETHBGemJoinMapping = require("../../../../../helpers/services/maker/addETHBGemJoinMapping");
const initializeMakerCdp = require("../../../../../helpers/services/maker/initializeMakerCdp");
const createVaultForETHB = require("../../../../../helpers/services/maker/createVaultForETHB");
const mockGetSpellsETHAETHBWithVaultCreation = require("./services/getSpells-ETHA-ETHB-With-Vault-Creation.mock");
const getABI = require("../../../../../helpers/services/getABI");

module.exports = async function (mockRoute) {
  const wallets = await getWallets();
  const contracts = await getContracts();
  const constants = await getDebtBridgeFromMakerConstants();

  // Gelato Testing environment setup.
  await provideFunds(
    wallets.gelatoProviderWallet,
    contracts.gelatoCore,
    constants.GAS_LIMIT,
    constants.GAS_PRICE_CEIL
  );
  await providerAssignsExecutor(
    wallets.gelatoProviderWallet,
    contracts.mockDebtBridgeETHBExecutor.address,
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
  const vaultBId = await createVaultForETHB(
    wallets.userAddress,
    contracts.DAI,
    contracts.dsa,
    contracts.getCdps,
    contracts.dssCdpManager
  );
  const spells = await mockGetSpellsETHAETHBWithVaultCreation(
    wallets,
    contracts,
    constants,
    mockRoute,
    vaultAId,
    vaultBId
  );

  const ABI = getABI();

  return {
    wallets,
    contracts,
    constants,
    vaultAId,
    vaultBId,
    spells,
    ABI,
  };
};
