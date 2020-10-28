// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

/* solhint-disable */

interface ConnectorInterface {
    function connectorID() external view returns (uint256 _type, uint256 _id);

    function name() external view returns (string memory);
}

interface MemoryInterface {
    function setUint(uint256 _id, uint256 _val) external;

    function getUint(uint256 _id) external returns (uint256);
}

interface GelatoGasPriceOracle {
    function latestAnswer() external view returns (int256);
}

interface ManagerLike {
    function ilks(uint256) external view returns (bytes32);

    function urns(uint256) external view returns (address);

    function vat() external view returns (address);
}

interface VatLike {
    function ilks(bytes32)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        );

    function dai(address) external view returns (uint256);

    function urns(bytes32, address) external view returns (uint256, uint256);
}

library GelatoBytes {
    function revertWithErrorString(
        bytes memory _bytes,
        string memory _tracingInfo
    ) internal pure {
        // 68: 32-location, 32-length, 4-ErrorSelector, UTF-8 err
        if (_bytes.length % 32 == 4) {
            bytes4 selector;
            assembly {
                selector := mload(add(0x20, _bytes))
            }
            if (selector == 0x08c379a0) {
                // Function selector for Error(string)
                assembly {
                    _bytes := add(_bytes, 68)
                }
                revert(string(abi.encodePacked(_tracingInfo, string(_bytes))));
            } else {
                revert(
                    string(abi.encodePacked(_tracingInfo, "NoErrorSelector"))
                );
            }
        } else {
            revert(
                string(abi.encodePacked(_tracingInfo, "UnexpectedReturndata"))
            );
        }
    }
}

abstract contract DSMath {
    // _add, _sub, _mul to avoid clash with Inline Assembly op naming
    function _add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x + y) >= x, "ds-math-add-overflow");
    }

    function _sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x - y) <= x, "ds-math-sub-underflow");
    }

    function _mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x, "ds-math-_mul-overflow");
    }

    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        return x <= y ? x : y;
    }

    function max(uint256 x, uint256 y) internal pure returns (uint256 z) {
        return x >= y ? x : y;
    }

    function imin(int256 x, int256 y) internal pure returns (int256 z) {
        return x <= y ? x : y;
    }

    function imax(int256 x, int256 y) internal pure returns (int256 z) {
        return x >= y ? x : y;
    }

    uint256 constant WAD = 10**18;
    uint256 constant RAY = 10**27;

    //rounds to zero if x*y < WAD / 2
    function wmul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = _add(_mul(x, y), WAD / 2) / WAD;
    }

    //rounds to zero if x*y < WAD / 2
    function rmul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = _add(_mul(x, y), RAY / 2) / RAY;
    }

    //rounds to zero if x*y < WAD / 2
    function wdiv(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = _add(_mul(x, WAD), y / 2) / y;
    }

    //rounds to zero if x*y < RAY / 2
    function rdiv(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = _add(_mul(x, RAY), y / 2) / y;
    }

    // This famous algorithm is called "exponentiation by squaring"
    // and calculates x^n with x as fixed-point and n as regular unsigned.
    //
    // It's O(log n), instead of O(n) for naive repeated multiplication.
    //
    // These facts are why it works:
    //
    //  If n is even, then x^n = (x^2)^(n/2).
    //  If n is odd,  then x^n = x * x^(n-1),
    //   and applying the equation for even x gives
    //    x^n = x * (x^2)^((n-1) / 2).
    //
    //  Also, EVM division is flooring and
    //    floor[(n-1) / 2] = floor[n / 2].
    //
    function rpow(uint256 x, uint256 n) internal pure returns (uint256 z) {
        z = n % 2 != 0 ? x : RAY;

        for (n /= 2; n != 0; n /= 2) {
            x = rmul(x, x);

            if (n % 2 != 0) {
                z = rmul(z, x);
            }
        }
    }
}

abstract contract Helpers is ConnectorInterface, DSMath {
    uint256 internal __id;

    /**
     * @dev Return Maker MCD Manager Address.
     */
    function getMcdManager() internal pure returns (address) {
        return 0x5ef30b9986345249bc32d8928B7ee64DE9435E39;
    }

    /**
     * @dev Return ethereum address
     */
    function getAddressETH() internal pure returns (address) {
        return 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // ETH Address
    }

    /**
     * @dev Return Memory Variable Address
     */
    function getMemoryAddr() internal pure returns (address) {
        return 0x8a5419CfC711B2343c17a6ABf4B2bAFaBb06957F; // InstaMemory Address
    }

    /**
     * @dev Set Uint value in InstaMemory Contract.
     */
    function setUint(uint256 setId, uint256 val) internal {
        if (setId != 0) MemoryInterface(getMemoryAddr()).setUint(setId, val);
    }

    /**
     * @dev Get Uint value from InstaMemory Contract.
     */
    function getUint(uint256 getId, uint256 val)
        internal
        returns (uint256 returnVal)
    {
        returnVal = getId == 0
            ? val
            : MemoryInterface(getMemoryAddr()).getUint(getId);
    }

    /**
     * @dev Connector Details
     */
    function connectorID()
        public
        view
        override
        returns (uint256 _type, uint256 id)
    {
        (_type, id) = (1, __id); // Should put specific value.
    }

    function stringToBytes32(string memory str)
        internal
        pure
        returns (bytes32 result)
    {
        require(bytes(str).length != 0, "String-Empty");
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            result := mload(add(str, 32))
        }
    }
}

/* solhint-enable */

abstract contract GelatoHelpers is Helpers {
    function _getGelatoGasPriceOracle() internal pure returns (address) {
        return 0x169E633A2D1E6c10dD91238Ba11c4A708dfEF37C;
    }

    function _getGelatoGasPrice() internal view returns (uint256) {
        return
            uint256(
                GelatoGasPriceOracle(_getGelatoGasPriceOracle()).latestAnswer()
            );
    }
}

abstract contract MakerResolver is GelatoHelpers {
    function getMakerVaultDebt(uint256 _vaultId)
        public
        view
        returns (uint256 wad)
    {
        ManagerLike cdpManager = _getManager();

        (bytes32 ilk, address urn) = _getVaultData(cdpManager, _vaultId);
        VatLike vat = VatLike(cdpManager.vat());
        (, uint256 rate, , , ) = VatLike(vat).ilks(ilk);
        (, uint256 art) = VatLike(vat).urns(ilk, urn);
        uint256 dai = VatLike(vat).dai(urn);

        uint256 rad = _sub(_mul(art, rate), dai);
        wad = rad / RAY;

        wad = _mul(wad, RAY) < rad ? wad + 1 : wad;
    }

    function getMakerVaultCollateralBalance(uint256 _vaultId)
        public
        view
        returns (uint256)
    {
        ManagerLike cdpManager = _getManager();

        VatLike vat = VatLike(cdpManager.vat());
        (bytes32 ilk, address urn) = _getVaultData(cdpManager, _vaultId);
        (uint256 ink, ) = vat.urns(ilk, urn);

        return ink;
    }

    function _getVaultData(ManagerLike cdpManager, uint256 vault)
        internal
        view
        returns (bytes32 ilk, address urn)
    {
        ilk = cdpManager.ilks(vault);
        urn = cdpManager.urns(vault);
    }

    function _getManager() internal pure returns (ManagerLike) {
        return ManagerLike(getMcdManager());
    }
}

/// @title ConnectGelatoPartialDebtBridgeFromMaker
/// @notice InstaDapp connector for partial refinancing of Maker debt positions.
/// @author Gelato Team
contract ConnectGelatoPartialDebtBridgeFromMaker is MakerResolver {
    using GelatoBytes for bytes;

    string
        public constant
        override name = "ConnectGelatoPartialDebtBridgeFromMaker-v1.0"; // solhint-disable-line const-name-snakecase
    uint256 public constant GAS_COST = 1933090 + (19331 * 2); // 1933080 + ~2% (Estimated Value)

    constructor(uint256 _id) {
        __id = _id;
    }

    /// @notice Saves Data to InstaMemory that can be used for DebtBridge Maker->Compound
    /// @dev Use wad for colRatios. The user has no influence over setUint or getUint.
    /// @param _vaultId The id of the makerDAO vault.
    /// @param _wMinColRatioMaker Min col ratio (wad) on Maker debt position
    /// @param _wMinColRatioB Min col ratio (wad) on debt position B (e.g. Compound, Maker, ...)
    /// @param _priceOracle The price oracle contract to supply the collateral price
    ///  e.g. Maker's ETH/USD oracle for ETH collateral pricing.
    /// @param _oraclePayload The data for making the staticcall to the oracle's read
    ///  method e.g. the function selector of MakerOracle's read function.
    // @param _getId Id for writting in instaMemory.
    // @param _setId Id for loading from instaMemory.
    function savePartialRefinanceDataToMemory(
        uint256 _vaultId,
        uint256 _wMinColRatioMaker,
        uint256 _wMinColRatioB,
        address _priceOracle,
        bytes calldata _oraclePayload,
        uint256, /*_getId,*/
        uint256 /*_setId*/
    ) public payable virtual {
        (
            uint256 wDaiDebtToMove,
            uint256 wColToWithdrawFromMaker,
            uint256 gasFeesPaidFromCol
        ) = computeDebtBridge(
            _vaultId,
            _wMinColRatioMaker,
            _wMinColRatioB,
            _priceOracle,
            _oraclePayload
        );

        // For partial refinance we need to store exact values (no uint(-1) functionality)
        setUint(600, wDaiDebtToMove); // borrow flashloan
        setUint(601, wDaiDebtToMove); // payback maker
        setUint(602, wColToWithdrawFromMaker); // withdraw maker
        setUint(603, _sub(wColToWithdrawFromMaker, gasFeesPaidFromCol)); // deposit B
        setUint(604, wDaiDebtToMove); // borrow B
        setUint(605, gasFeesPaidFromCol); // pay the provider
    }

    /// @notice Computes values needed for DebtBridge Maker->ProtocolB
    /// @dev Use wad for colRatios.
    /// @param _vaultId The id of the makerDAO vault.
    /// @param _wMinColRatioMaker Min col ratio (wad) on Maker debt position
    /// @param _wMinColRatioB Min col ratio (wad) on debt position B (e.g. Compound, Maker, ...)
    /// @param _priceOracle The price oracle contract to supply the collateral price
    ///  e.g. Maker's ETH/USD oracle for ETH collateral pricing.
    /// @param _oraclePayload The data for making the staticcall to the oracle's read
    ///  method e.g. the function selector of MakerOracle's read function.
    /// @return wDaiDebtToMove DAI Debt (wad) to: flashBorrow->repay Maker->withdraw from B->flashPayback.
    /// @return wColToWithdrawFromMaker (wad) to: withdraw from Maker and deposit on B.
    /// @return gasFeesPaidFromCol Gelato automation-gas-fees paid from user's collateral
    // solhint-disable function-max-lines
    function computeDebtBridge(
        uint256 _vaultId,
        uint256 _wMinColRatioMaker,
        uint256 _wMinColRatioB,
        address _priceOracle,
        bytes calldata _oraclePayload
    )
        public
        view
        virtual
        returns (
            uint256 wDaiDebtToMove,
            uint256 wColToWithdrawFromMaker,
            uint256 gasFeesPaidFromCol
        )
    {
        uint256 wColPrice;

        // Stack too deep
        {
            (bool success, bytes memory returndata) = _priceOracle.staticcall(
                _oraclePayload
            );

            if (!success) {
                returndata.revertWithErrorString(
                    "ConnectGelatoPartialDebtBridgeFromMaker.computeDebtBridge:oracle:"
                );
            }

            wColPrice = abi.decode(returndata, (uint256));
        }

        // TO DO: add fee mechanism for non-ETH collateral debt bridge
        // uint256 gasFeesPaidFromCol = _mul(GAS_COST, wmul(_getGelatoGasPrice(), latestPrice));
        gasFeesPaidFromCol = _getGelatoProviderFees();

        uint256 wPricedCol = wmul(
            _sub(getMakerVaultCollateralBalance(_vaultId), gasFeesPaidFromCol),
            wColPrice
        );

        uint256 wDaiDebtOnMaker = getMakerVaultDebt(_vaultId);

        wColToWithdrawFromMaker = wCalcCollateralToWithdraw(
            _wMinColRatioMaker,
            _wMinColRatioB,
            wColPrice,
            wPricedCol,
            wDaiDebtOnMaker
        );

        wDaiDebtToMove = wCalcDebtToRepay(
            _wMinColRatioMaker,
            _wMinColRatioB,
            wPricedCol,
            wDaiDebtOnMaker
        );
    }

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
                _sub(
                    _wPricedCol,
                    wdiv(
                        _sub(
                            wmul(_wMinColRatioMaker, _wPricedCol),
                            wmul(
                                _wMinColRatioMaker,
                                wmul(_wMinColRatioB, _wDaiDebtOnMaker)
                            )
                        ),
                        _sub(_wMinColRatioMaker, _wMinColRatioB)
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
            _sub(
                _wDaiDebtOnMaker,
                wmul(
                    wdiv(1e18, _wMinColRatioMaker),
                    wdiv(
                        _sub(
                            wmul(_wMinColRatioMaker, _wPricedCol),
                            wmul(
                                _wMinColRatioMaker,
                                wmul(_wMinColRatioB, _wDaiDebtOnMaker)
                            )
                        ),
                        _sub(_wMinColRatioMaker, _wMinColRatioB)
                    )
                )
            );
    }

    function _getGelatoProviderFees()
        internal
        view
        virtual
        returns (uint256 gasCost)
    {
        gasCost = _mul(GAS_COST, _getGelatoGasPrice());
    }
}
