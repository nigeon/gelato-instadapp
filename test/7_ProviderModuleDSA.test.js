const {expect} = require("chai");
const hre = require("hardhat");
const {ethers} = hre;
const GelatoCoreLib = require("@gelatonetwork/core");

// #region Contracts ABI

const ConnectAuth = require("../pre-compiles/ConnectAuth.json");
const InstaList = require("../pre-compiles/InstaList.json");
const InstaAccount = require("../pre-compiles/InstaAccount.json");
const InstaIndex = require("../pre-compiles/InstaIndex.json");
const InstaConnectors = require("../pre-compiles/InstaConnectors.json");

const ETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// #endregion

describe("Provider Module Unit Test", function () {
  this.timeout(0);
  if (hre.network.name !== "hardhat") {
    console.error("Test Suite is meant to be run on hardhat only");
    process.exit(1);
  }

  let providerModuleDSA;
  let connectGelatoProviderPayment;

  let instaIndex;
  let gelatoCore;
  let instaConnectors;
  let instaList;

  let userWallet;
  let userAddress;
  let providerWallet;
  let providerAddress;
  let dsa;

  before(async function () {
    // Get Test Wallet for local testnet
    [userWallet] = await ethers.getSigners();
    userAddress = await userWallet.getAddress();

    [, providerWallet] = await ethers.getSigners();
    providerAddress = await providerWallet.getAddress();

    // Hardhat default accounts prefilled with 100 ETH
    expect(await userWallet.getBalance()).to.be.gt(
      ethers.utils.parseEther("10")
    );
    /////////////////// Get Deployed Contract //////////////////
    instaIndex = await ethers.getContractAt(
      InstaIndex.abi,
      hre.network.config.InstaIndex
    );
    instaConnectors = await ethers.getContractAt(
      InstaConnectors.abi,
      hre.network.config.InstaConnectors
    );
    gelatoCore = await ethers.getContractAt(
      GelatoCoreLib.GelatoCore.abi,
      hre.network.config.GelatoCore
    );
    instaList = await ethers.getContractAt(
      InstaList.abi,
      hre.network.config.InstaList
    );

    ////////////////// Deploy Needed Contracts ////////////////////////
    const connectorLength = await instaConnectors.connectorLength();
    const connectorId = connectorLength.add(1);

    const ConnectGelatoProviderPayment = await ethers.getContractFactory(
      "ConnectGelatoProviderPayment"
    );
    connectGelatoProviderPayment = await ConnectGelatoProviderPayment.deploy(
      connectorId
    );
    await connectGelatoProviderPayment.deployed();

    const ProviderModuleDSA = await ethers.getContractFactory(
      "ProviderModuleDSA"
    );
    providerModuleDSA = await ProviderModuleDSA.deploy(
      gelatoCore.address,
      connectGelatoProviderPayment.address
    );
    await providerModuleDSA.deployed();

    ///////////////// Setup /////////////////////////
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
  });

  // Uncomment when ethers bug will be solved. revertedWith produce the following during call "AssertionError: Expected transaction to be reverted"
  // it("isProvided should revert due to none listing of userProxy", async function () {
  //   expect(
  //     providerModuleDSA.isProvided(
  //       ethers.constants.AddressZero,
  //       ethers.constants.AddressZero,
  //       [[], [], 0, 0]
  //     )
  //   ).to.be.revertedWith("ProviderModuleDSA.isProvided:InvalidUserProxy");
  // });

  // it("isProvided should revert due to lack of right of gelatoCore to act on the dsa behalf", async function () {
  //   expect(
  //     providerModuleDSA.isProvided(
  //       dsa.address,
  //       ethers.constants.AddressZero,
  //       [[], [], 0, 0]
  //     )
  //   ).to.be.revertedWith("ProviderModuleDSA.isProvided:GelatoCoreNotAuth");
  // });

  it("#1: isProvided should return OK", async function () {
    expect(await dsa.isAuth(gelatoCore.address)).to.be.false;

    expect(
      await providerModuleDSA.isProvided(
        dsa.address,
        ethers.constants.AddressZero,
        [[], [], 0, 0]
      )
    ).to.not.be.equal("OK");

    // Give authorization to Gelato on user DSA
    await dsa.cast(
      [hre.network.config.ConnectAuth],
      [
        await hre.run("abi-encode-withselector", {
          abi: ConnectAuth.abi,
          functionname: "add",
          inputs: [gelatoCore.address],
        }),
      ],
      userAddress
    );

    expect(await dsa.isAuth(gelatoCore.address)).to.be.true;

    expect(
      await providerModuleDSA.isProvided(
        dsa.address,
        ethers.constants.AddressZero,
        [[], [], 0, 0]
      )
    ).to.be.equal("OK");
  });

  it("#2: execPayload should return payload with the right provider", async function () {
    // Task creation for sending to execPayload
    const payProvider = new GelatoCoreLib.Action({
      addr: connectGelatoProviderPayment.address,
      data: await hre.run("abi-encode-withselector", {
        abi: (await hre.artifacts.readArtifact("ConnectGelatoProviderPayment"))
          .abi,
        functionname: "payProvider",
        inputs: [ethers.constants.AddressZero, ETH, 0, "105", 0],
      }),
      operation: GelatoCoreLib.Operation.Delegatecall,
    });

    const task = new GelatoCoreLib.Task({
      conditions: [],
      actions: [payProvider],
    });

    const result = await providerModuleDSA.execPayload(
      0,
      ethers.constants.AddressZero,
      providerAddress,
      task,
      0
    );

    //#region retrieving the replaced provider address from the payload
    const abi = new ethers.utils.AbiCoder();

    const datas = abi.decode(
      ["address[]", "bytes[]", "address"],
      ethers.utils.hexDataSlice(result[0], 4)
    )[1];

    const paymentReceivingAddress = abi.decode(
      ["address", "address", "uint256", "uint256", "uint256"],
      ethers.utils.hexDataSlice(datas[0], 4)
    )[0];
    //#endregion
    expect(paymentReceivingAddress).to.be.equal(providerAddress);
  });
});
