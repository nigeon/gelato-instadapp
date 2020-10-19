const {expect} = require("chai");
const hre = require("hardhat");
const {ethers} = hre;

const ORACLE_MAKER_ETH_USD = "ETH/USD-Maker-v1";
const ORACLE_MAKER_ETH_USD_ADDR = "0x729D19f657BD0614b4985Cf1D82531c67569197B";
const PRICE_ORACLE_MAKER_PAYLOAD = "0x57de26a4"; // IMakerOracle.read()

describe("PriceOracleResolver Unit Test", function () {
  this.timeout(0);
  if (hre.network.name !== "hardhat") {
    console.error("Test Suite is meant to be run on hardhat only");
    process.exit(1);
  }

  let priceOracleResolver;

  before(async function () {
    const PriceOracleResolver = await ethers.getContractFactory(
      "PriceOracleResolver"
    );
    priceOracleResolver = await PriceOracleResolver.deploy();
    priceOracleResolver.deployed();
  });

  it("#1: addOracle should add a maker medianizer for a currencyPair", async function () {
    await priceOracleResolver.addOracle(
      ORACLE_MAKER_ETH_USD,
      ORACLE_MAKER_ETH_USD_ADDR,
      PRICE_ORACLE_MAKER_PAYLOAD
    );
    expect(await priceOracleResolver.oracle(ORACLE_MAKER_ETH_USD)).to.be.equal(
      ORACLE_MAKER_ETH_USD_ADDR
    );
    expect(
      await priceOracleResolver.oraclePayload(ORACLE_MAKER_ETH_USD)
    ).to.be.equal(PRICE_ORACLE_MAKER_PAYLOAD);
  });

  it("#2: addOracle should revert when adding a maker medianizer and for this currency pair it was been already added", async function () {
    await expect(
      priceOracleResolver.addOracle(
        ORACLE_MAKER_ETH_USD,
        ethers.constants.AddressZero,
        PRICE_ORACLE_MAKER_PAYLOAD
      )
    ).to.be.revertedWith("PriceOracleResolver.addOracle: set");
  });

  it("#3: getPrice returns price", async function () {
    expect((await priceOracleResolver.getPrice(ORACLE_MAKER_ETH_USD)).isZero())
      .to.be.false;
  });

  it("#4: getMakerTokenPrice should return PriceOracleResolver.getMakerTokenPrice: CurrencyPairNotSupported. when currencyPair are not supported / not been added", async function () {
    await expect(priceOracleResolver.getPrice("ETH/DAI")).to.be.revertedWith(
      "PriceOracleResolver.getPrice: no oracle"
    );
  });
});
