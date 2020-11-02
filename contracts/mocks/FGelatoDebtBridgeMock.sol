// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;

import {
    _wCalcCollateralToWithdraw,
    _wCalcDebtToRepay
} from "../functions/gelato/FGelatoDebtBridge.sol";

contract FGelatoDebtBridgeMock {
    function wCalcCollateralToWithdraw(
        uint256 _wMinColRatioMaker,
        uint256 _wMinColRatioB,
        uint256 _wColPrice,
        uint256 _wPricedCol,
        uint256 _wDaiDebtOnMaker
    ) public pure returns (uint256) {
        return
            _wCalcCollateralToWithdraw(
                _wMinColRatioMaker,
                _wMinColRatioB,
                _wColPrice,
                _wPricedCol,
                _wDaiDebtOnMaker
            );
    }

    function wCalcDebtToRepay(
        uint256 _wMinColRatioMaker,
        uint256 _wMinColRatioB,
        uint256 _wPricedCol,
        uint256 _wDaiDebtOnMaker
    ) public pure returns (uint256) {
        return
            _wCalcDebtToRepay(
                _wMinColRatioMaker,
                _wMinColRatioB,
                _wPricedCol,
                _wDaiDebtOnMaker
            );
    }
}
