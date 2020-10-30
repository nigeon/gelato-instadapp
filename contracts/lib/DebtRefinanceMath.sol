// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;

import {sub, wmul, wdiv} from "../vendor/DSMath.sol";

/* solhint-disable */

contract DebtRefinanceMath {
    /// @notice Compute collateral (wad) to move from Maker to B.
    /// @dev TO DO: explain or link to formula paper.
    /// @param _wMinColRatioMaker Min col ratio (wad) on Maker debt position
    /// @param _wMinColRatioB Min col ratio (wad) on debt position B (e.g. Compound, Maker, ...)
    /// @param _wColPrice Price of the collateral (wad) in oracle price units.
    /// @param _wPricedCol Collateral to move (wad) valued in oracle price.
    /// @param _wDaiDebtOnMaker Amount of DAI (wad) borrowed from Maker.
    /// @return collateral to withdraw from A in wad
    function wCalcCollateralToWithdraw(
        uint256 _wMinColRatioMaker,
        uint256 _wMinColRatioB,
        uint256 _wColPrice,
        uint256 _wPricedCol,
        uint256 _wDaiDebtOnMaker
    ) public pure virtual returns (uint256) {
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

    /// @notice Compute debt (wad) to flashBorrow->repay Maker->withdraw from B->flashPayback
    /// @dev TO DO: explain or link to formula paper.
    /// @param _wMinColRatioMaker Min col ratio (wad) on Maker debt position
    /// @param _wMinColRatioB Min col ratio (wad) on debt position B (e.g. Compound, Maker, ...)
    /// @param _wPricedCol Collateral to move (wad) valued in oracle price.
    /// @param _wDaiDebtOnMaker Amount of DAI (wad) borrowed from Maker.
    /// @return amount of borrowed token to pay back in wad
    function wCalcDebtToRepay(
        uint256 _wMinColRatioMaker,
        uint256 _wMinColRatioB,
        uint256 _wPricedCol,
        uint256 _wDaiDebtOnMaker
    ) public pure virtual returns (uint256) {
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
}
