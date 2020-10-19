const {expect} = require("chai");
const bre = require("@nomiclabs/buidler");
const {ethers} = bre;

// #region Contracts ABI

const ConnectMaker = require("../pre-compiles/ConnectMaker.json");
const GetCdps = require("../pre-compiles/GetCdps.json");
const DssCdpManager = require("../pre-compiles/DssCdpManager.json");
const InstaList = require("../pre-compiles/InstaList.json");
const InstaAccount = require("../pre-compiles/InstaAccount.json");
const InstaIndex = require("../pre-compiles/InstaIndex.json");
const IERC20 = require("../pre-compiles/IERC20.json");

// #endregion

describe("ConditionMakerVaultIsSafe gelato condition contract unit test", function () {
  this.timeout(0);
  if (bre.network.name !== "ganache") {
    console.error("Test Suite is meant to be run on ganache only");
    process.exit(1);
  }

  let userWallet;
  let userAddress;

  let getCdps;
  let dssCdpManager;
  let instaList;
  let instaIndex;
  let daiToken;

  let conditionMakerVaultIsSafe;
  let oracleAggregator;

  let cdpId;
  let dsa;

  before(async function () {
    // Get Test Wallet for local testnet
    [userWallet] = await ethers.getSigners();
    userAddress = await userWallet.getAddress();

    // Ganache default accounts prefilled with 100 ETH
    expect(await userWallet.getBalance()).to.be.gt(
      ethers.utils.parseEther("10")
    );

    instaIndex = await ethers.getContractAt(
      InstaIndex.abi,
      bre.network.config.InstaIndex
    );
    instaList = await ethers.getContractAt(
      InstaList.abi,
      bre.network.config.InstaList
    );
    getCdps = await ethers.getContractAt(
      GetCdps.abi,
      bre.network.config.GetCdps
    );
    dssCdpManager = await ethers.getContractAt(
      DssCdpManager.abi,
      bre.network.config.DssCdpManager
    );
    daiToken = await ethers.getContractAt(IERC20.abi, bre.network.config.DAI);

    // ========== Test Setup ============

    const OracleAggregator = await ethers.getContractFactory(
      "OracleAggregator"
    );

    oracleAggregator = await OracleAggregator.deploy();
    await oracleAggregator.deployed();

    const ConditionMakerVaultIsSafe = await ethers.getContractFactory(
      "ConditionMakerVaultIsSafe"
    );

    conditionMakerVaultIsSafe = await ConditionMakerVaultIsSafe.deploy(
      oracleAggregator.address
    );
    await conditionMakerVaultIsSafe.deployed();

    // Create DeFi Smart Account

    const dsaAccountCount = await instaList.accounts();

    await expect(instaIndex.build(userAddress, 1, userAddress)).to.emit(
      instaIndex,
      "LogAccountCreated"
    );
    const dsaID = dsaAccountCount.add(1);
    await expect(await instaList.accounts()).to.be.equal(dsaID);

    // Instantiate the DSA
    dsa = await ethers.getContractAt(
      InstaAccount.abi,
      await instaList.accountAddr(dsaID)
    );

    // Create/Deposit/Borrow a Vault
    const openVault = await bre.run("abi-encode-withselector", {
      abi: ConnectMaker.abi,
      functionname: "open",
      inputs: ["ETH-A"],
    });

    await dsa.cast([bre.network.config.ConnectMaker], [openVault], userAddress);

    let cdps = await getCdps.getCdpsAsc(dssCdpManager.address, dsa.address);
    cdpId = String(cdps.ids[0]);

    expect(cdps.ids[0].isZero()).to.be.false;

    await dsa.cast(
      [bre.network.config.ConnectMaker],
      [
        await bre.run("abi-encode-withselector", {
          abi: ConnectMaker.abi,
          functionname: "deposit",
          inputs: [cdpId, ethers.utils.parseEther("10"), 0, 0],
        }),
      ],
      userAddress,
      {
        value: ethers.utils.parseEther("10"),
      }
    );
    await dsa.cast(
      [bre.network.config.ConnectMaker],
      [
        await bre.run("abi-encode-withselector", {
          abi: ConnectMaker.abi,
          functionname: "borrow",
          inputs: [cdpId, ethers.utils.parseUnits("1000", 18), 0, 0],
        }),
      ],
      userAddress
    );

    expect(await daiToken.balanceOf(dsa.address)).to.be.equal(
      ethers.utils.parseEther("1000")
    );
    // Add ETH/USD Maker Medianizer in the Oracle Aggregator

    await oracleAggregator.addOracle(
      "ETH/USD",
      "0x729D19f657BD0614b4985Cf1D82531c67569197B"
    );
  });

  it("#1: ok should return NotOKMakerVaultIsSafe when the ETH/USD price is above the defined limit", async function () {
    let data = await conditionMakerVaultIsSafe.getConditionData(
      cdpId,
      "ETH/USD",
      ethers.utils.parseUnits("30", 17)
    );

    expect(await conditionMakerVaultIsSafe.ok(0, data, 0)).to.be.equal(
      "NotOKMakerVaultIsSafe"
    );
  });

  it("#2: ok should return OK when the ETH/USD price is lower than the defined limit", async function () {
    let data = await conditionMakerVaultIsSafe.getConditionData(
      cdpId,
      "ETH/USD",
      ethers.utils.parseUnits("30", 17)
    );

    //#region Mock Part

    oracleAggregator.mock(true, ethers.utils.parseUnits("299", 18));

    //#endregion

    expect(await conditionMakerVaultIsSafe.ok(0, data, 0)).to.be.equal(
      "NotOKMakerVaultIsSafe"
    );
  });
});
