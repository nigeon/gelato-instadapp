const {expect} = require("chai");
const hre = require("hardhat");
const {ethers} = hre;

const WAD = ethers.utils.parseUnits("1", 18);

//#region DSMath function

let wdiv = (x, y) => {
  return x.mul(WAD).add(y.div(2)).div(y);
};

let wmul = (x, y) => {
  return x.mul(y).add(WAD.div(2)).div(WAD);
};

//#endregion

describe("Gelato Debt Bridge Connector Unit Test", function () {
  this.timeout(0);
  if (hre.network.name !== "hardhat") {
    console.error("Test Suite is meant to be run on hardhat only");
    process.exit(1);
  }

  let connectGelatoPartialDebtBridgeFromMaker;
  before(async function () {
    const ConnectGelatoPartialDebtBridgeFromMaker = await ethers.getContractFactory(
      "ConnectGelatoPartialDebtBridgeFromMaker"
    );
    connectGelatoPartialDebtBridgeFromMaker = await ConnectGelatoPartialDebtBridgeFromMaker.deploy(
      0
    );
    connectGelatoPartialDebtBridgeFromMaker.deployed();
  });

  it("#1: wCalcCollateralToWithdraw should return the amount of collateral to withdraw on protocol 1 and to put on protocol 2", async function () {
    // 3 times more collateral than borrowed amount in protocol 1
    let minColRatioOnMaker = ethers.utils.parseUnits("3", 18);
    // 1.5 times more collateral than borrowed amount in protocol 2
    let minColRatioOnPositionB = ethers.utils.parseUnits("15", 17);
    // The amount of collateral locked
    let col = ethers.utils.parseUnits("1", 18);
    // The amount of borrowed token
    let borrowedToken = ethers.utils.parseUnits("100", 18);
    // how much one collateral is worth on borrowed token
    let collateralPrice = ethers.utils.parseUnits("250", 18);
    // the amount of collateral in borrowed token
    let collateral = col
      .mul(collateralPrice)
      .div(ethers.utils.parseUnits("1", 18)); // div to have everything in wad standard

    // Check this document https://drive.google.com/file/d/1OV3ZbJPd2Yr-3l0rst6tK3ycfhhg6Nfh/view?usp=sharing for more details one the used formula

    //#region CALCULATION REPLICATION

    let expectedColToWithdraw = wmul(
      wmul(minColRatioOnMaker, minColRatioOnPositionB),
      borrowedToken
    ); // doc ref : c_r x comp_r x d_2
    expectedColToWithdraw = expectedColToWithdraw.sub(
      wmul(minColRatioOnMaker, collateral)
    ); // doc ref : c_r x comp_r x d_2 - c_r x e_2
    expectedColToWithdraw = wdiv(
      expectedColToWithdraw,
      minColRatioOnPositionB.sub(minColRatioOnMaker)
    ); // doc ref : (c_r x comp_r x d_2 - c_r x e_2)/ (comp_r - c_r)
    expectedColToWithdraw = collateral.sub(expectedColToWithdraw); // doc ref : e_2 - ((c_r x comp_r x d_2 - c_r x e_2)/ (comp_r - c_r))

    // Extra step to convert back to col type
    expectedColToWithdraw = wdiv(expectedColToWithdraw, collateralPrice);

    //#endregion

    expect(
      await connectGelatoPartialDebtBridgeFromMaker.wCalcCollateralToWithdraw(
        minColRatioOnMaker,
        minColRatioOnPositionB,
        collateralPrice,
        collateral,
        borrowedToken
      )
    ).to.be.equal(expectedColToWithdraw);
  });

  it("#2: _wCalcDebtToRepay should return the amount of borrowed token to pay back on protocol 1", async function () {
    // 3 times more collateral than borrowed amount in protocol 1
    let minColRatioOnMaker = ethers.utils.parseUnits("3", 18);
    // 1.5 times more collateral than borrowed amount in protocol 2
    let minColRatioOnPositionB = ethers.utils.parseUnits("15", 17);
    // The amount of collateral locked
    let col = ethers.utils.parseUnits("1", 18);
    // The amount of borrowed token
    let borrowedToken = ethers.utils.parseUnits("100", 18);
    // how much one collateral is worth on borrowed token
    let collateralPrice = ethers.utils.parseUnits("250", 18);
    // the amount of collateral in borrowed token
    let collateral = col
      .mul(collateralPrice)
      .div(ethers.utils.parseUnits("1", 18)); // div to have everything in wad standard

    // Check this document https://drive.google.com/file/d/1OV3ZbJPd2Yr-3l0rst6tK3ycfhhg6Nfh/view?usp=sharing for more details one the used formula

    //#region CALCULATION REPLICATION

    let expectedBorToPayBack = wmul(
      wmul(minColRatioOnMaker, minColRatioOnPositionB),
      borrowedToken
    ); // doc ref : c_r x comp_r x d_2
    expectedBorToPayBack = expectedBorToPayBack.sub(
      wmul(minColRatioOnMaker, collateral)
    ); // doc ref : c_r x comp_r x d_2 - c_r x e_2
    expectedBorToPayBack = wdiv(
      expectedBorToPayBack,
      minColRatioOnPositionB.sub(minColRatioOnMaker)
    ); // doc ref : (c_r x comp_r x d_2 - c_r x e_2)/ (comp_r - c_r)
    expectedBorToPayBack = wmul(
      wdiv(ethers.utils.parseUnits("1", 18), minColRatioOnMaker),
      expectedBorToPayBack
    ); // doc ref : (1/c_r)((c_r x comp_r x d_2 - c_r x e_2)/ (comp_r - c_r))
    expectedBorToPayBack = borrowedToken.sub(expectedBorToPayBack); // doc ref : d_2 - (1/c_r)((c_r x comp_r x d_2 - c_r x e_2)/ (comp_r - c_r))

    //#endregion

    expect(
      await connectGelatoPartialDebtBridgeFromMaker.wCalcDebtToRepay(
        minColRatioOnMaker,
        minColRatioOnPositionB,
        collateral,
        borrowedToken
      )
    ).to.be.equal(expectedBorToPayBack);
  });
});
