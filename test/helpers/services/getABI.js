const ConnectGelatoABI = require("../../../pre-compiles/ConnectGelato.json")
  .abi;
const ConnectAuthABI = require("../../../pre-compiles/ConnectAuth.json").abi;

function getABI() {
  return {
    ConnectGelatoABI: ConnectGelatoABI,
    ConnectAuthABI: ConnectAuthABI,
  };
}

module.exports = getABI;
