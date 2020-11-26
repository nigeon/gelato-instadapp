// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import {GelatoBytes} from "../../lib/GelatoBytes.sol";
import {sub} from "../../vendor/DSMath.sol";
import {
    AccountInterface,
    ConnectorInterface
} from "../../interfaces/InstaDapp/IInstaDapp.sol";
import {
    IConnectInstaPoolV2
} from "../../interfaces/InstaDapp/connectors/IConnectInstaPoolV2.sol";
import {
    DAI,
    CONNECT_MAKER,
    INSTA_POOL_V2
} from "../../constants/CInstaDapp.sol";
import {
    _getMakerVaultDebt,
    _getMakerVaultCollateralBalance
} from "../../functions/dapps/FMaker.sol";
import {
    _encodeFlashPayback
} from "../../functions/InstaDapp/connectors/FInstaPoolV2.sol";
import {
    _encodePaybackMakerVault,
    _encodedWithdrawMakerVault
} from "../../functions/InstaDapp/connectors/FConnectMaker.sol";
import {
    _encodePayGelatoProvider
} from "../../functions/InstaDapp/connectors/FConnectGelatoProviderPayment.sol";

import {_getGelatoProviderFees} from "../../functions/gelato/FGelato.sol";
import {
    _getGasCostMakerToMaker,
    _getRealisedDebt
} from "../../functions/gelato/FGelatoDebtBridge.sol";

contract MockConnectGelatoDataFullLiquidateMaker is ConnectorInterface {
    using GelatoBytes for bytes;

    // solhint-disable const-name-snakecase
    string public constant override name =
        "MockConnectGelatoDataFullLiquidateMaker-v1.0";
    uint256 internal immutable _id;
    address internal immutable _connectGelatoProviderPayment;

    constructor(uint256 id, address connectGelatoProviderPayment) {
        _id = id;
        _connectGelatoProviderPayment = connectGelatoProviderPayment;
    }

    /// @dev Connector Details
    function connectorID()
        external
        view
        override
        returns (uint256 _type, uint256 id)
    {
        (_type, id) = (1, _id); // Should put specific value.
    }

    /// @dev payable to be compatible in conjunction with DSA.cast payable target
    /// @param _route we mock this behavior for gas-reporter testing
    /// @param _vaultAId Id of the unsafe vault of the client of Vault A Collateral.
    /// @param _colToken  vault's col token address .
    function getDataAndCastLiquidation(
        uint256 _route,
        uint256 _vaultAId,
        address _colToken
    ) external payable {
        (address[] memory targets, bytes[] memory datas) =
            _dataMaker(_route, _vaultAId, _colToken);

        _cast(targets, datas);
    }

    function _cast(address[] memory targets, bytes[] memory datas) internal {
        // Instapool V2 / FlashLoan call
        bytes memory castData =
            abi.encodeWithSelector(
                AccountInterface.cast.selector,
                targets,
                datas,
                msg.sender // msg.sender == GelatoCore
            );

        (bool success, bytes memory returndata) =
            address(this).delegatecall(castData);
        if (!success) {
            returndata.revertWithError(
                "ConnectGelatoDataFullLiquidateMaker._cast:"
            );
        }
    }

    /* solhint-disable function-max-lines */
    // @param _route we mock this behavior for gas-reporter testing
    function _dataMaker(
        uint256 _route,    
        uint256 _vaultAId,
        address _colToken
    ) internal view returns (address[] memory targets, bytes[] memory datas) {
        targets = new address[](1);
        targets[0] = INSTA_POOL_V2;

        uint256 wDaiToBorrow = _getRealisedDebt(_getMakerVaultDebt(_vaultAId));
        uint256 wColToWithdrawFromMaker =
            _getMakerVaultCollateralBalance(_vaultAId);
        uint256 route = _route;
        uint256 gasCost = _getGasCostMakerToMaker(false, route);
        uint256 gasFeesPaidFromCol = _getGelatoProviderFees(gasCost);

        (address[] memory _targets, bytes[] memory _datas) = _spellsMakerLiquidate(
                                                                    _vaultAId,
                                                                    _colToken,
                                                                    wDaiToBorrow,
                                                                    wColToWithdrawFromMaker,
                                                                    gasFeesPaidFromCol
                                                                );

        datas = new bytes[](1);
        datas[0] = abi.encodeWithSelector(
            IConnectInstaPoolV2.flashBorrowAndCast.selector,
            DAI,
            wDaiToBorrow,
            route,
            abi.encode(_targets, _datas)
        );
    }

    function _spellsMakerLiquidate(
        uint256 _vaultAId,
        address _colToken,
        uint256 _wDaiToBorrow,
        uint256 _wColToWithdrawFromMaker,
        uint256 _gasFeesPaidFromCol
    ) internal view returns (address[] memory targets, bytes[] memory datas) {
        targets = new address[](6);
        targets[0] = CONNECT_MAKER; // payback
        targets[1] = CONNECT_MAKER; // withdraw
        targets[2] = _connectGelatoProviderPayment; // payProvider
        targets[3] = INSTA_POOL_V2; // flashPayback

        datas = new bytes[](6);
        datas[0] = _encodePaybackMakerVault(_vaultAId, uint256(-1), 0, 600);
        datas[1] = _encodedWithdrawMakerVault(_vaultAId, uint256(-1), 0, 0);
        datas[2] = _encodePayGelatoProvider(
            _colToken,
            _gasFeesPaidFromCol,
            0,
            0
        );
        datas[3] = _encodeFlashPayback(DAI, _wDaiToBorrow, 0, 0);
    }

    /* solhint-enable function-max-lines */
}
