// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;

import {sub, wmul, wdiv} from "../../vendor/DSMath.sol";

function _wCalcCollateralToWithdraw(
    uint256 _wMinColRatioA,
    uint256 _wMinColRatioB,
    uint256 _wColPrice,
    uint256 _wPricedCol,
    uint256 _wDebtOnA
) pure returns (uint256) {
    return
        wdiv(
            sub(
                _wPricedCol,
                wdiv(
                    sub(
                        wmul(_wMinColRatioA, _wPricedCol),
                        wmul(_wMinColRatioA, wmul(_wMinColRatioB, _wDebtOnA))
                    ),
                    sub(_wMinColRatioA, _wMinColRatioB)
                )
            ),
            _wColPrice
        );
}

function _wCalcDebtToRepay(
    uint256 _wMinColRatioA,
    uint256 _wMinColRatioB,
    uint256 _wPricedCol,
    uint256 _wDebtOnA
) pure returns (uint256) {
    return
        sub(
            _wDebtOnA,
            wmul(
                wdiv(1e18, _wMinColRatioA),
                wdiv(
                    sub(
                        wmul(_wMinColRatioA, _wPricedCol),
                        wmul(_wMinColRatioA, wmul(_wMinColRatioB, _wDebtOnA))
                    ),
                    sub(_wMinColRatioA, _wMinColRatioB)
                )
            )
        );
}
