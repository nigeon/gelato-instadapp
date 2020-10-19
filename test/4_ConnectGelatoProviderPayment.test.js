const {expect} = require("chai");
const bre = require("@nomiclabs/buidler");
const {ethers} = bre;

// #region Contracts ABI

const ConnectMaker = require("../pre-compiles/ConnectMaker.json");
const GetCdps = require("../pre-compiles/GetCdps.json");
const DssCdpManager = require("../pre-compiles/DssCdpManager.json");
const ConnectBasic = require("../pre-compiles/ConnectBasic.json");
const InstaList = require("../pre-compiles/InstaList.json");
const InstaAccount = require("../pre-compiles/InstaAccount.json");
const InstaIndex = require("../pre-compiles/InstaIndex.json");
const IERC20 = require("../pre-compiles/IERC20.json");
const InstaConnector = require("../pre-compiles/InstaConnectors.json");
const ConnectGelatoProviderPaymentABI = require("../artifacts/ConnectGelatoProviderPayment.json");

// #endregion

describe("Gelato Provider Payment Connector unit test", function () {
  this.timeout(0);
  if (bre.network.name !== "ganache") {
    console.error("Test Suite is meant to be run on ganache only");
    process.exit(1);
  }

  let userWallet;
  let userAddress;
  let providerWallet;
  let providerAddress;

  let instaList;
  let instaIndex;
  let daiToken;
  let instaConnectors;
  let instaMaster;
  let connectBasic;
  let getCdps;
  let dssCdpManager;

  let connectGelatoProviderPayment;

  let dsa;
  let cdpId;

  before(async function () {
    // Get Test Wallet for local testnet
    [userWallet] = await ethers.getSigners();
    userAddress = await userWallet.getAddress();

    [, providerWallet] = await ethers.getSigners();
    providerAddress = await providerWallet.getAddress();

    instaMaster = await ethers.provider.getSigner(
      bre.network.config.InstaMaster
    );

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
    connectBasic = await ethers.getContractAt(
      ConnectBasic.abi,
      bre.network.config.ConnectBasic
    );
    instaConnectors = await ethers.getContractAt(
      InstaConnector.abi,
      bre.network.config.InstaConnectors
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

    const connectorLength = await instaConnectors.connectorLength();
    const connectorId = connectorLength.add(1);

    const ConnectGelatoProviderPayment = await ethers.getContractFactory(
      "ConnectGelatoProviderPayment"
    );
    connectGelatoProviderPayment = await ConnectGelatoProviderPayment.deploy(
      connectorId
    );
    connectGelatoProviderPayment.deployed();

    await instaConnectors
      .connect(instaMaster)
      .enable(connectGelatoProviderPayment.address);

    await userWallet.sendTransaction({
      to: bre.network.config.InstaMaster,
      value: ethers.utils.parseEther("0.1"),
    });

    expect(
      await instaConnectors.isConnector([connectGelatoProviderPayment.address])
    ).to.be.true;

    // ========== Create DeFi Smart Account for User account ============

    const dsaAccountCount = await instaList.accounts();

    await expect(instaIndex.build(userAddress, 1, userAddress)).to.emit(
      instaIndex,
      "LogAccountCreated"
    );
    const dsaID = dsaAccountCount.add(1);
    await expect(await instaList.accounts()).to.be.equal(dsaID);

    // ========== Instantiate the DSA ============
    dsa = await ethers.getContractAt(
      InstaAccount.abi,
      await instaList.accountAddr(dsaID)
    );
  });

  it("#1: payProvider should pay to Provider 300x10^18 token dai", async function () {
    let providerDAIBalanceBefore = await daiToken.balanceOf(providerAddress);

    await dsa.cast(
      [bre.network.config.ConnectMaker],
      [
        await bre.run("abi-encode-withselector", {
          abi: ConnectMaker.abi,
          functionname: "open",
          inputs: ["ETH-A"],
        }),
      ],
      userAddress
    );

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

    await dsa.cast(
      [connectGelatoProviderPayment.address],
      [
        await bre.run("abi-encode-withselector", {
          abi: ConnectGelatoProviderPaymentABI.abi,
          functionname: "payProvider",
          inputs: [
            providerAddress,
            daiToken.address,
            ethers.utils.parseUnits("300", 18),
            0,
            0,
          ],
        }),
      ],
      userAddress
    );

    expect(await daiToken.balanceOf(providerAddress)).to.be.equal(
      providerDAIBalanceBefore.add(ethers.utils.parseUnits("300", 18))
    );
  });

  it("#2: payProvider should pay to Provider 1 ether", async function () {
    let providerBalanceBefore = await providerWallet.getBalance();

    await dsa.cast(
      [connectBasic.address, connectGelatoProviderPayment.address],
      [
        await bre.run("abi-encode-withselector", {
          abi: ConnectBasic.abi,
          functionname: "deposit",
          inputs: [
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            ethers.utils.parseEther("1"),
            0,
            "105",
          ],
        }),
        await bre.run("abi-encode-withselector", {
          abi: ConnectGelatoProviderPaymentABI.abi,
          functionname: "payProvider",
          inputs: [
            providerAddress,
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            0,
            "105",
            0,
          ],
        }),
      ],
      userAddress,
      {
        value: ethers.utils.parseEther("1"),
      }
    );

    expect(await providerWallet.getBalance()).to.be.equal(
      providerBalanceBefore.add(ethers.utils.parseEther("1"))
    );
  });

  it("#3: payProvider should return error message ConnectGelatoProviderPayment.payProvider:INVALIDADDESS when provider is Zero Address", async function () {
    expect(
      dsa.cast(
        [connectBasic.address, connectGelatoProviderPayment.address],
        [
          await bre.run("abi-encode-withselector", {
            abi: ConnectBasic.abi,
            functionname: "deposit",
            inputs: [
              "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
              ethers.utils.parseEther("1"),
              0,
              "105",
            ],
          }),
          await bre.run("abi-encode-withselector", {
            abi: ConnectGelatoProviderPaymentABI.abi,
            functionname: "payProvider",
            inputs: [
              ethers.constants.AddressZero,
              "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
              0,
              "105",
              0,
            ],
          }),
        ],
        userAddress,
        {
          value: ethers.utils.parseEther("1"),
        }
      )
    ).to.be.revertedWith(
      "ConnectGelatoProviderPayment.payProvider:INVALIDADDESS."
    );
  });
});
