const {expect} = require("chai");
const bre = require("@nomiclabs/buidler");
const {ethers} = bre;

describe("Oracle Aggregator unit test", function () {
  this.timeout(0);
  if (bre.network.name !== "ganache") {
    console.error("Test Suite is meant to be run on ganache only");
    process.exit(1);
  }

  let oracleAggregator;

  before(async function () {
    const OracleAggregator = await ethers.getContractFactory(
      "OracleAggregator"
    );
    oracleAggregator = await OracleAggregator.deploy();
    oracleAggregator.deployed();
  });

  it("#1: addOracle should add a maker medianizer for a currencyPair", async function () {
    await oracleAggregator.addOracle(
      "ETH/USD",
      "0x729D19f657BD0614b4985Cf1D82531c67569197B"
    );
    expect(await oracleAggregator.makerOracle("ETH/USD")).to.be.equal(
      "0x729D19f657BD0614b4985Cf1D82531c67569197B"
    );
  });

  it("#2: addOracle should revert when adding a maker medianizer and for this currency pair it was been already added", async function () {
    expect(
      oracleAggregator.addOracle(
        "ETH/USD",
        "0x729D19f657BD0614b4985Cf1D82531c67569197B"
      )
    ).to.be.revertedWith("OracleAggregator.Maker: Oracle already set.");
  });

  it("#3: getMakerTokenPrice should return ETH/USD prize", async function () {
    expect((await oracleAggregator.getMakerTokenPrice("ETH/USD")).isZero()).to
      .be.false;
  });

  it("#4: getMakerTokenPrice should return OracleAggregator.getMakerTokenPrice: CurrencyPairNotSupported. when currencyPair are not supported / not been added", async function () {
    expect(oracleAggregator.getMakerTokenPrice("ETH/DAI")).to.be.revertedWith(
      "OracleAggregator.getMakerTokenPrice: CurrencyPairNotSupported."
    );
  });
});
