const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, deployments } = hre;

const GelatoCoreLib = require("@gelatonetwork/core");

// #region Contracts ABI

const ConnectMaker = require("../../../pre-compiles/ConnectMaker.json");
const GetCdps = require("../../../pre-compiles/GetCdps.json");
const DssCdpManager = require("../../../pre-compiles/DssCdpManager.json");
const ConnectBasic = require("../../../pre-compiles/ConnectBasic.json");
const InstaList = require("../../../pre-compiles/InstaList.json");
const InstaAccount = require("../../../pre-compiles/InstaAccount.json");
const InstaIndex = require("../../../pre-compiles/InstaIndex.json");
const IERC20 = require("../../../pre-compiles/IERC20.json");

// #endregion

describe("ConnectGelatoProviderPayment Unit Test", function () {
  this.timeout(0);
  if (hre.network.name !== "hardhat") {
    console.error("Test Suite is meant to be run on hardhat only");
    process.exit(1);
  }

  let userWallet;
  let userAddress;
  let gelatoProviderWallet;
  let gelatoProviderAddress;

  let gelatoCore;

  let instaList;
  let instaIndex;
  let DAI;
  let connectBasic;
  let getCdps;
  let dssCdpManager;

  let connectGelatoProviderPayment;

  let dsa;
  let cdpId;

  beforeEach(async function () {
    // Deploy dependencies
    await deployments.fixture();

    // Get Test Wallet for local testnet
    [userWallet, gelatoProviderWallet] = await ethers.getSigners();
    userAddress = await userWallet.getAddress();
    gelatoProviderAddress = await gelatoProviderWallet.getAddress();

    gelatoCore = await ethers.getContractAt(
      GelatoCoreLib.GelatoCore.abi,
      hre.network.config.GelatoCore
    );

    // Hardhat default accounts prefilled with 100 ETH
    expect(await userWallet.getBalance()).to.be.gt(
      ethers.utils.parseEther("10")
    );

    instaIndex = await ethers.getContractAt(
      InstaIndex.abi,
      hre.network.config.InstaIndex
    );
    instaList = await ethers.getContractAt(
      InstaList.abi,
      hre.network.config.InstaList
    );
    connectBasic = await ethers.getContractAt(
      ConnectBasic.abi,
      hre.network.config.ConnectBasic
    );
    getCdps = await ethers.getContractAt(
      GetCdps.abi,
      hre.network.config.GetCdps
    );
    dssCdpManager = await ethers.getContractAt(
      DssCdpManager.abi,
      hre.network.config.DssCdpManager
    );
    DAI = await ethers.getContractAt(IERC20.abi, hre.network.config.DAI);

    // ========== Test Setup ============
    connectGelatoProviderPayment = await ethers.getContract(
      "ConnectGelatoProviderPayment"
    );

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

  it("#1: ConnectGelatoProviderPayment should have been deployed with providerAddress", async function () {
    expect(await connectGelatoProviderPayment.gelatoProvider()).to.be.eq(
      gelatoProviderAddress
    );
  });

  it("#2: setProvider should revert for AddressZero", async function () {
    await expect(
      connectGelatoProviderPayment.setProvider(ethers.constants.AddressZero)
    ).to.be.revertedWith("ConnectGelatoProviderPayment.noAddressZeroProvider");
  });

  it("#3: setProvider should change the provider address", async function () {
    await connectGelatoProviderPayment.setProvider(userAddress);

    expect(await connectGelatoProviderPayment.gelatoProvider()).to.be.equal(
      userAddress
    );
  });

  it("#4: payProvider should pay to Provider 300 Dai", async function () {
    const providerDAIBalanceBefore = await DAI.balanceOf(gelatoProviderAddress);

    await dsa.cast(
      [hre.network.config.ConnectMaker],
      [
        await hre.run("abi-encode-withselector", {
          abi: ConnectMaker.abi,
          functionname: "open",
          inputs: ["ETH-A"],
        }),
      ],
      userAddress
    );

    const cdps = await getCdps.getCdpsAsc(dssCdpManager.address, dsa.address);
    cdpId = String(cdps.ids[0]);

    expect(cdps.ids[0].isZero()).to.be.false;

    await dsa.cast(
      [hre.network.config.ConnectMaker],
      [
        await hre.run("abi-encode-withselector", {
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
      [hre.network.config.ConnectMaker],
      [
        await hre.run("abi-encode-withselector", {
          abi: ConnectMaker.abi,
          functionname: "borrow",
          inputs: [cdpId, ethers.utils.parseUnits("1000", 18), 0, 0],
        }),
      ],
      userAddress
    );

    expect(await DAI.balanceOf(dsa.address)).to.be.equal(
      ethers.utils.parseEther("1000")
    );

    await dsa.cast(
      [connectGelatoProviderPayment.address],
      [
        await hre.run("abi-encode-withselector", {
          abi: (
            await hre.artifacts.readArtifact("ConnectGelatoProviderPayment")
          ).abi,
          functionname: "payProvider",
          inputs: [DAI.address, ethers.utils.parseUnits("300", 18), 0, 0],
        }),
      ],
      userAddress
    );

    expect(await DAI.balanceOf(gelatoProviderAddress)).to.be.equal(
      providerDAIBalanceBefore.add(ethers.utils.parseUnits("300", 18))
    );
  });

  it("#5: payProvider should pay to Provider 1 ether", async function () {
    const providerBalanceOnGelatoCoreBefore = await gelatoCore.providerFunds(
      gelatoProviderAddress
    );

    await dsa.cast(
      [connectBasic.address, connectGelatoProviderPayment.address],
      [
        await hre.run("abi-encode-withselector", {
          abi: ConnectBasic.abi,
          functionname: "deposit",
          inputs: [
            "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
            ethers.utils.parseEther("1"),
            0,
            "105",
          ],
        }),
        await hre.run("abi-encode-withselector", {
          abi: (
            await hre.artifacts.readArtifact("ConnectGelatoProviderPayment")
          ).abi,
          functionname: "payProvider",
          inputs: ["0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", 0, "105", 0],
        }),
      ],
      userAddress,
      {
        value: ethers.utils.parseEther("1"),
      }
    );

    expect(await gelatoCore.providerFunds(gelatoProviderAddress)).to.be.equal(
      providerBalanceOnGelatoCoreBefore.add(ethers.utils.parseEther("1"))
    );
  });
});
