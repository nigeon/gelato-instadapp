// Buidler
const {task, usePlugin, types} = require("@nomiclabs/buidler/config");

// Libraries
const assert = require("assert");
const {utils} = require("ethers");

const GelatoCoreLib = require("@gelatonetwork/core");

// Process Env Variables
require("dotenv").config();
const INFURA_ID = process.env.INFURA_ID;
assert.ok(INFURA_ID, "no Infura ID in process.env");
const INSTA_MASTER = "0xb1DC62EC38E6E3857a887210C38418E4A17Da5B2";

// ================================= CONFIG =========================================
module.exports = {
  defaultNetwork: "ganache",
  networks: {
    ganache: {
      timeout: 150000,
      // Standard config
      url: "http://localhost:8545",
      fork: `https://mainnet.infura.io/v3/${INFURA_ID}`,
      unlocked_accounts: [INSTA_MASTER],
      // Custom
      GelatoCore: "0x1d681d76ce96E4d70a88A00EBbcfc1E47808d0b8",
      GelatoGasPriceOracle: "0x169E633A2D1E6c10dD91238Ba11c4A708dfEF37C",
      InstaMaster: INSTA_MASTER,
      InstaIndex: "0x2971AdFa57b20E5a416aE5a708A8655A9c74f723",
      InstaList: "0x4c8a1BEb8a87765788946D6B19C6C6355194AbEb",
      InstaConnectors: "0xD6A602C01a023B98Ecfb29Df02FBA380d3B21E0c",
      InstaAccount: "0x939Daad09fC4A9B8f8A9352A485DAb2df4F4B3F8",
      ConnectAuth: "0xd1aFf9f2aCf800C876c409100D6F39AEa93Fc3D9",
      ConnectBasic: "0x6a31c5982C5Bc5533432913cf06a66b6D3333a95",
      ConnectGelato: "0x37A7009d424951dd5D5F155fA588D9a03C455163",
      ConnectMaker: "0xac02030d8a8F49eD04b2f52C394D3F901A10F8A9",
      ConnectCompound: "0x07F81230d73a78f63F0c2A3403AD281b067d28F8",
      ConnectInstaPool: "0xCeF5f3c402d4fef76A038e89a4357176963e1464",
      MakerResolver: "0x0A7008B38E7015F8C36A49eEbc32513ECA8801E5",
      CompoundResolver: "0x1f22D77365d8BFE3b901C33C83C01B584F946617",
      DAI: "0x6b175474e89094c44da98b954eedeac495271d0f",
      DAI_UNISWAP: "0x2a1530C4C41db0B0b2bB646CB5Eb1A67b7158667",
      CDAI: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
      CETH: "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5",
      DssCdpManager: "0x5ef30b9986345249bc32d8928B7ee64DE9435E39",
      GetCdps: "0x36a724Bd100c39f0Ea4D3A20F7097eE01A8Ff573",
      ProviderModuleDSA: "0x0C25452d20cdFeEd2983fa9b9b9Cf4E81D6f2fE2",
    },
  },
  solc: {
    version: "0.6.12",
    optimizer: {enabled: true},
  },
};

// ================================= PLUGINS =========================================
usePlugin("@nomiclabs/buidler-ethers");
usePlugin("@nomiclabs/buidler-ganache");
usePlugin("@nomiclabs/buidler-waffle");

// ================================= TASKS =========================================
task("abi-encode-withselector")
  .addPositionalParam(
    "abi",
    "Contract ABI in array form",
    undefined,
    types.json
  )
  .addPositionalParam("functionname")
  .addOptionalVariadicPositionalParam(
    "inputs",
    "Array of function params",
    undefined,
    types.json
  )
  .addFlag("log")
  .setAction(async (taskArgs) => {
    try {
      if (taskArgs.log) console.log(taskArgs);

      if (!taskArgs.abi)
        throw new Error("abi-encode-withselector: no abi passed");

      const interFace = new utils.Interface(taskArgs.abi);

      let functionFragment;
      try {
        functionFragment = interFace.getFunction(taskArgs.functionname);
      } catch (error) {
        throw new Error(
          `\n ❌ abi-encode-withselector: functionname "${taskArgs.functionname}" not found`
        );
      }

      let payloadWithSelector;

      if (taskArgs.inputs) {
        let iterableInputs;
        try {
          iterableInputs = [...taskArgs.inputs];
        } catch (error) {
          iterableInputs = [taskArgs.inputs];
        }
        payloadWithSelector = interFace.encodeFunctionData(
          functionFragment,
          iterableInputs
        );
      } else {
        payloadWithSelector = interFace.encodeFunctionData(
          functionFragment,
          []
        );
      }

      if (taskArgs.log)
        console.log(`\nEncodedPayloadWithSelector:\n${payloadWithSelector}\n`);
      return payloadWithSelector;
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

task(
  "fetchGelatoGasPrice",
  `Returns the current gelato gas price used for calling canExec and exec`
)
  .addOptionalParam("gelatocoreaddress")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs, bre) => {
    try {
      const gelatoCore = await bre.ethers.getContractAt(
        GelatoCoreLib.GelatoCore.abi,
        taskArgs.gelatocoreaddress
          ? taskArgs.gelatocoreaddress
          : bre.network.config.GelatoCore
      );

      const oracleAbi = ["function latestAnswer() view returns (int256)"];

      const gelatoGasPriceOracleAddress = await gelatoCore.gelatoGasPriceOracle();

      // Get gelatoGasPriceOracleAddress
      const gelatoGasPriceOracle = await bre.ethers.getContractAt(
        oracleAbi,
        gelatoGasPriceOracleAddress
      );

      // lastAnswer is used by GelatoGasPriceOracle as well as the Chainlink Oracle
      const gelatoGasPrice = await gelatoGasPriceOracle.latestAnswer();

      if (taskArgs.log) {
        console.log(
          `\ngelatoGasPrice: ${utils.formatUnits(
            gelatoGasPrice.toString(),
            "gwei"
          )} gwei\n`
        );
      }

      return gelatoGasPrice;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
