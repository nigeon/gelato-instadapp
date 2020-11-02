// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;

import {sub, wmul, wdiv} from "../../vendor/DSMath.sol";

function _wCalcCollateralToWithdraw(
    uint256 _wMinColRatioMaker,
    uint256 _wMinColRatioB,
    uint256 _wColPrice,
    uint256 _wPricedCol,
    uint256 _wDaiDebtOnMaker
) pure returns (uint256) {
    return
        wdiv(
            sub(
                _wPricedCol,
                wdiv(
                    sub(
                        wmul(_wMinColRatioMaker, _wPricedCol),
                        wmul(
                            _wMinColRatioMaker,
                            wmul(_wMinColRatioB, _wDaiDebtOnMaker)
                        )
                    ),
                    sub(_wMinColRatioMaker, _wMinColRatioB)
                )
            ),
            _wColPrice
        );
}

function _wCalcDebtToRepay(
    uint256 _wMinColRatioMaker,
    uint256 _wMinColRatioB,
    uint256 _wPricedCol,
    uint256 _wDaiDebtOnMaker
) pure returns (uint256) {
    return
        sub(
            _wDaiDebtOnMaker,
            wmul(
                wdiv(1e18, _wMinColRatioMaker),
                wdiv(
                    sub(
                        wmul(_wMinColRatioMaker, _wPricedCol),
                        wmul(
                            _wMinColRatioMaker,
                            wmul(_wMinColRatioB, _wDaiDebtOnMaker)
                        )
                    ),
                    sub(_wMinColRatioMaker, _wMinColRatioB)
                )
            )
        );
}
