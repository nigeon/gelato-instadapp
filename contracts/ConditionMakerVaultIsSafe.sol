// "SPDX-License-Identifier: UNLICENSED"
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {
    GelatoConditionsStandard
} from "@gelatonetwork/core/contracts/conditions/GelatoConditionsStandard.sol";
import {GelatoBytes} from "./GelatoBytes.sol";
import "./DSMath.sol";

interface IOracleAggregator {
    function getMakerTokenPrice(string memory _pair)
        external
        view
        returns (uint256);
}

interface IVaultResolver {
    struct VaultData {
        uint256 id;
        address owner;
        string colType;
        uint256 collateral;
        uint256 art;
        uint256 debt;
        uint256 liquidatedCol;
        uint256 borrowRate;
        uint256 colPrice;
        uint256 liquidationRatio;
        address vaultAddress;
    }

    function getVaultById(uint256 id) external view returns (VaultData memory);
}

contract ConditionMakerVaultIsSafe is GelatoConditionsStandard, DSMath {
    using GelatoBytes for bytes;

    address public oracleAggregator;

    constructor(address _oracleAggregator) public {
        oracleAggregator = _oracleAggregator;
    }

    function getConditionData(
        uint256 _vaultID,
        string memory _pair,
        uint256 _unSafeLimit
    ) public pure virtual returns (bytes memory) {
        return abi.encode(_vaultID, _pair, _unSafeLimit);
    }

    function ok(
        uint256,
        bytes calldata _conditionData,
        uint256
    ) public view virtual override returns (string memory) {
        (uint256 vaultID, string memory pair, uint256 unSafeLimit) = abi.decode(
            _conditionData,
            (uint256, string, uint256)
        );

        return _isVaultUnSafe(vaultID, pair, unSafeLimit);
    }

    function _isVaultUnSafe(
        uint256 _vaultID,
        string memory _pair,
        uint256 _unSafeLimit
    ) internal view returns (string memory) {
        uint256 latestPriceInRay = _getLatestPrice(_pair);

        IVaultResolver.VaultData memory vault = IVaultResolver(
            _getVaultResolverAddress()
        )
            .getVaultById(_vaultID);
        uint256 colRatio = _vaultCollaterizationRatio(
            _wmul(vault.collateral, latestPriceInRay),
            vault.debt
        );
        if (_unSafeLimit > colRatio) {
            return OK;
        }
        return "NotOKMakerVaultIsSafe";
    }

    function _getVaultResolverAddress() internal pure returns (address) {
        return 0x0A7008B38E7015F8C36A49eEbc32513ECA8801E5;
    }

    function _vaultCollaterizationRatio(uint256 _col, uint256 _debt)
        internal
        pure
        returns (uint256)
    {
        return _wdiv(_col, _debt);
    }

    function _getLatestPrice(string memory _pair)
        internal
        view
        returns (uint256)
    {
        return IOracleAggregator(oracleAggregator).getMakerTokenPrice(_pair);
    }
}
