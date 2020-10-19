const {expect} = require("chai");
const bre = require("@nomiclabs/buidler");
const {ethers} = bre;

const WAD = ethers.utils.parseUnits("1", 18);

//#region DSMath function

let wdiv = (x, y) => {
  return x.mul(WAD).add(y.div(2)).div(y);
};

let wmul = (x, y) => {
  return x.mul(y).add(WAD.div(2)).div(WAD);
};

//#endregion

describe("Gelato Debt Bridge Connector unit test", function () {
  this.timeout(0);
  if (bre.network.name !== "ganache") {
    console.error("Test Suite is meant to be run on ganache only");
    process.exit(1);
  }

  let connectGelatoDebtBridge;
  before(async function () {
    const ConnectGelatoDebtBridge = await ethers.getContractFactory(
      "ConnectGelatoDebtBridgeMock"
    );
    connectGelatoDebtBridge = await ConnectGelatoDebtBridge.deploy(
      0,
      ethers.constants.AddressZero
    );
    connectGelatoDebtBridge.deployed();
  });

  it("#1: _wcollateralToWithdraw should return the amount of collateral to withdraw on protocol 1 and to put on protocol 2", async function () {
    // 3 times more collateral than borrowed amount in protocol 1
    let wantedLiquidationRatioOnProtocol1 = ethers.utils.parseUnits("3", 18);
    // 1.5 times more collateral than borrowed amount in protocol 2
    let wantedLiquidationRatioOnProtocol2 = ethers.utils.parseUnits("15", 17);
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
      wmul(
        wantedLiquidationRatioOnProtocol1,
        wantedLiquidationRatioOnProtocol2
      ),
      borrowedToken
    ); // doc ref : c_r x comp_r x d_2
    expectedColToWithdraw = expectedColToWithdraw.sub(
      wmul(wantedLiquidationRatioOnProtocol1, collateral)
    ); // doc ref : c_r x comp_r x d_2 - c_r x e_2
    expectedColToWithdraw = wdiv(
      expectedColToWithdraw,
      wantedLiquidationRatioOnProtocol2.sub(wantedLiquidationRatioOnProtocol1)
    ); // doc ref : (c_r x comp_r x d_2 - c_r x e_2)/ (comp_r - c_r)
    expectedColToWithdraw = collateral.sub(expectedColToWithdraw); // doc ref : e_2 - ((c_r x comp_r x d_2 - c_r x e_2)/ (comp_r - c_r))

    // Extra step to convert back to col type
    expectedColToWithdraw = wdiv(expectedColToWithdraw, collateralPrice);

    //#endregion

    expect(
      await connectGelatoDebtBridge.wcollateralToWithdraw(
        wantedLiquidationRatioOnProtocol1,
        wantedLiquidationRatioOnProtocol2,
        collateral,
        borrowedToken,
        collateralPrice
      )
    ).to.be.equal(expectedColToWithdraw);
  });

  it("#2: _wborrowedTokenToPayback should return the amount of borrowed token to pay back on protocol 1", async function () {
    // 3 times more collateral than borrowed amount in protocol 1
    let wantedLiquidationRatioOnProtocol1 = ethers.utils.parseUnits("3", 18);
    // 1.5 times more collateral than borrowed amount in protocol 2
    let wantedLiquidationRatioOnProtocol2 = ethers.utils.parseUnits("15", 17);
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
      wmul(
        wantedLiquidationRatioOnProtocol1,
        wantedLiquidationRatioOnProtocol2
      ),
      borrowedToken
    ); // doc ref : c_r x comp_r x d_2
    expectedBorToPayBack = expectedBorToPayBack.sub(
      wmul(wantedLiquidationRatioOnProtocol1, collateral)
    ); // doc ref : c_r x comp_r x d_2 - c_r x e_2
    expectedBorToPayBack = wdiv(
      expectedBorToPayBack,
      wantedLiquidationRatioOnProtocol2.sub(wantedLiquidationRatioOnProtocol1)
    ); // doc ref : (c_r x comp_r x d_2 - c_r x e_2)/ (comp_r - c_r)
    expectedBorToPayBack = wmul(
      wdiv(ethers.utils.parseUnits("1", 18), wantedLiquidationRatioOnProtocol1),
      expectedBorToPayBack
    ); // doc ref : (1/c_r)((c_r x comp_r x d_2 - c_r x e_2)/ (comp_r - c_r))
    expectedBorToPayBack = borrowedToken.sub(expectedBorToPayBack); // doc ref : d_2 - (1/c_r)((c_r x comp_r x d_2 - c_r x e_2)/ (comp_r - c_r))

    //#endregion

    expect(
      await connectGelatoDebtBridge.wborrowedTokenToPayback(
        wantedLiquidationRatioOnProtocol1,
        wantedLiquidationRatioOnProtocol2,
        collateral,
        borrowedToken
      )
    ).to.be.equal(expectedBorToPayBack);
  });
});
