const ConnectGelatoABI = require("../../../pre-compiles/ConnectGelato.json")
  .abi;
const ConnectAuthABI = require("../../../pre-compiles/ConnectAuth.json").abi;

module.exports = function () {
  return {
    ConnectGelatoABI: ConnectGelatoABI,
    ConnectAuthABI: ConnectAuthABI,
  };
};
