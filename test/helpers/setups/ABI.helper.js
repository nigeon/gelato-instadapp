const ConnectGelatoABI = require("./../../../pre-compiles/ConnectGelato.json")
  .abi;
const PriceOracleResolverABI = require("./../../../artifacts/contracts/contracts/resolvers/PriceOracleResolver.sol/PriceOracleResolver.json")
  .abi;
const ConnectAuthABI = require("./../../../pre-compiles/ConnectAuth.json").abi;

async function getABI() {
  return {
    PriceOracleResolverABI: PriceOracleResolverABI,
    ConnectGelatoABI: ConnectGelatoABI,
    ConnectAuthABI: ConnectAuthABI,
  };
}

module.exports = getABI;
