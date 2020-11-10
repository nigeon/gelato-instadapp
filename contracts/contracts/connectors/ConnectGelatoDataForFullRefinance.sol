// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import {GelatoBytes} from "../../lib/GelatoBytes.sol";
import {sub, wmul} from "../../vendor/DSMath.sol";
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
    CONNECT_COMPOUND,
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
    _encodedWithdrawMakerVault,
    _encodeOpenMakerVault,
    _encodedDepositMakerVault,
    _encodeBorrowDaiMakerVault
} from "../../functions/InstaDapp/connectors/FConnectMaker.sol";
import {
    _encodePayGelatoProvider
} from "../../functions/InstaDapp/connectors/FConnectGelatoProviderPayment.sol";
import {
    _encodeDepositCompound,
    _encodeBorrowCompound
} from "../../functions/InstaDapp/connectors/FConnectCompound.sol";
import {_getGelatoProviderFees} from "../../functions/gelato/FGelato.sol";
import {
    _getFlashLoanRoute,
    _getGasCost,
    _getBorrowAmountWithDelta
} from "../../functions/gelato/FGelatoDebtBridge.sol";

contract ConnectGelatoDataForFullRefinance is ConnectorInterface {
    using GelatoBytes for bytes;

    // solhint-disable-next-line const-name-snakecase
    string public constant override name = "ConnectGelatoData-v1.0";
    uint256 internal immutable _id;
    address internal immutable _connectGelatoProviderPayment;

    uint256 public constant GAS_COST = 1850000;

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

    /// @notice Entry Point for DSA.cast DebtBridge from e.g ETH-A to ETH-B
    /// @dev payable to be compatible in conjunction with DSA.cast payable target
    /// @param _vaultAId Id of the unsafe vault of the client of Vault A Collateral.
    /// @param _vaultBId Id of the vault B Collateral of the client.
    /// @param _token  vault's col token address .
    /// @param _colType colType of the new vault. example : ETH-B, ETH-A.
    function getDataAndCastForFromMakerToMaker(
        uint256 _vaultAId,
        uint256 _vaultBId,
        address _token,
        string calldata _colType
    ) external payable {
        (
            address[] memory targets,
            bytes[] memory datas
        ) = _execPayloadForFullRefinanceFromMakerToMaker(
            _vaultAId,
            _vaultBId,
            _token,
            _colType
        );

        _cast(targets, datas);
    }

    /// @notice Entry Point for DSA.cast DebtBridge from Maker to Compound
    /// @dev payable to be compatible in conjunction with DSA.cast payable target
    /// @param _vaultId Id of the unsafe vault of the client.
    /// @param _token  vault's col token address .
    function getDataAndCastForFromMakerToCompound(
        uint256 _vaultId,
        address _token
    ) external payable {
        (
            address[] memory targets,
            bytes[] memory datas
        ) = _execPayloadForFullRefinanceFromMakerToCompound(_vaultId, _token);

        _cast(targets, datas);
    }

    function _cast(address[] memory targets, bytes[] memory datas) internal {
        // Instapool V2 / FlashLoan call
        bytes memory castData = abi.encodeWithSelector(
            AccountInterface.cast.selector,
            targets,
            datas,
            msg.sender // msg.sender == GelatoCore
        );

        (bool success, bytes memory returndata) = address(this).delegatecall(
            castData
        );
        if (!success)
            returndata.revertWithError(
                "ConnectGelatoDataForFullRefinance._cast:"
            );
    }

    /* solhint-disable function-max-lines */

    function _execPayloadForFullRefinanceFromMakerToMaker(
        uint256 _vaultAId,
        uint256 _vaultBId,
        address _token,
        string calldata _colType
    ) internal view returns (address[] memory targets, bytes[] memory datas) {
        targets = new address[](1);
        targets[0] = INSTA_POOL_V2;

        uint256 wDaiDebtToMove = _getMakerVaultDebt(_vaultAId);
        uint256 wDaiToBorrow = _getBorrowAmountWithDelta(wDaiDebtToMove);
        uint256 wColToWithdrawFromMaker = _getMakerVaultCollateralBalance(
            _vaultAId
        );
        uint256 route = _getFlashLoanRoute(DAI, wDaiDebtToMove);
        uint256 gasCost = _getGasCost(route);
        uint256 gasFeesPaidFromCol = _getGelatoProviderFees(gasCost);

        (address[] memory _targets, bytes[] memory _datas) = _vaultBId == 0
            ? _spellsDebtBridgeWithOpenVaultAction(
                _vaultAId,
                _token,
                _colType,
                wDaiToBorrow,
                wColToWithdrawFromMaker,
                gasFeesPaidFromCol
            )
            : _spellsDebtBridge(
                _vaultAId,
                _vaultBId,
                _token,
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

    function _execPayloadForFullRefinanceFromMakerToCompound(
        uint256 _vaultId,
        address _token
    ) internal view returns (address[] memory targets, bytes[] memory datas) {
        targets = new address[](1);
        targets[0] = INSTA_POOL_V2;

        uint256 wDaiDebtToMove = _getMakerVaultDebt(_vaultId);
        uint256 wColToWithdrawFromMaker = _getMakerVaultCollateralBalance(
            _vaultId
        );
        uint256 route = _getFlashLoanRoute(DAI, wDaiDebtToMove);
        uint256 gasCost = _getGasCost(route);
        uint256 gasFeesPaidFromCol = _getGelatoProviderFees(gasCost);

        uint256 wDaiToBorrow = _getBorrowAmountWithDelta(wDaiDebtToMove);

        address[] memory _targets = new address[](6);
        _targets[0] = CONNECT_MAKER; // payback
        _targets[1] = CONNECT_MAKER; // withdraw
        _targets[2] = CONNECT_COMPOUND; // deposit
        _targets[3] = CONNECT_COMPOUND; // borrow
        _targets[4] = _connectGelatoProviderPayment; // payProvider
        _targets[5] = INSTA_POOL_V2; // flashPayback

        bytes[] memory _datas = new bytes[](6);
        _datas[0] = _encodePaybackMakerVault(_vaultId, uint256(-1), 0, 600);
        _datas[1] = _encodedWithdrawMakerVault(_vaultId, uint256(-1), 0, 0);
        _datas[2] = _encodeDepositCompound(
            _token,
            sub(wColToWithdrawFromMaker, gasFeesPaidFromCol),
            0,
            0
        );
        _datas[3] = _encodeBorrowCompound(DAI, 0, 600, 0);
        _datas[4] = _encodePayGelatoProvider(_token, gasFeesPaidFromCol, 0, 0);
        _datas[5] = _encodeFlashPayback(DAI, wDaiToBorrow, 0, 0);

        datas = new bytes[](1);
        datas[0] = abi.encodeWithSelector(
            IConnectInstaPoolV2.flashBorrowAndCast.selector,
            DAI,
            wDaiToBorrow,
            route,
            abi.encode(_targets, _datas)
        );
    }

    function _spellsDebtBridgeWithOpenVaultAction(
        uint256 _vaultAId,
        address _token,
        string calldata _colType,
        uint256 _wDaiToBorrow,
        uint256 _wColToWithdrawFromMaker,
        uint256 _gasFeesPaidFromCol
    ) internal view returns (address[] memory targets, bytes[] memory datas) {
        targets = new address[](7);
        targets[0] = CONNECT_MAKER; // payback
        targets[1] = CONNECT_MAKER; // withdraw
        targets[2] = CONNECT_MAKER; // open ETH-B vault
        targets[3] = CONNECT_MAKER; // deposit
        targets[4] = CONNECT_MAKER; // borrow
        targets[5] = _connectGelatoProviderPayment; // payProvider
        targets[6] = INSTA_POOL_V2; // flashPayback

        datas = new bytes[](7);
        datas[0] = _encodePaybackMakerVault(_vaultAId, uint256(-1), 0, 600);
        datas[1] = _encodedWithdrawMakerVault(_vaultAId, uint256(-1), 0, 0);
        datas[2] = _encodeOpenMakerVault(_colType);
        datas[3] = _encodedDepositMakerVault(
            0,
            sub(_wColToWithdrawFromMaker, _gasFeesPaidFromCol),
            0,
            0
        );
        datas[4] = _encodeBorrowDaiMakerVault(0, 0, 600, 0);
        datas[5] = _encodePayGelatoProvider(_token, _gasFeesPaidFromCol, 0, 0);
        datas[6] = _encodeFlashPayback(DAI, _wDaiToBorrow, 0, 0);
    }

    function _spellsDebtBridge(
        uint256 _vaultAId,
        uint256 _vaultBId,
        address _token,
        uint256 _wDaiToBorrow,
        uint256 _wColToWithdrawFromMaker,
        uint256 _gasFeesPaidFromCol
    ) internal view returns (address[] memory targets, bytes[] memory datas) {
        targets = new address[](6);
        targets[0] = CONNECT_MAKER; // payback
        targets[1] = CONNECT_MAKER; // withdraw
        targets[2] = CONNECT_MAKER; // deposit
        targets[3] = CONNECT_MAKER; // borrow
        targets[4] = _connectGelatoProviderPayment; // payProvider
        targets[5] = INSTA_POOL_V2; // flashPayback

        datas = new bytes[](6);
        datas[0] = _encodePaybackMakerVault(_vaultAId, uint256(-1), 0, 600);
        datas[1] = _encodedWithdrawMakerVault(_vaultAId, uint256(-1), 0, 0);
        datas[2] = _encodedDepositMakerVault(
            _vaultBId,
            sub(_wColToWithdrawFromMaker, _gasFeesPaidFromCol),
            0,
            0
        );
        datas[3] = _encodeBorrowDaiMakerVault(_vaultBId, 0, 600, 0);
        datas[4] = _encodePayGelatoProvider(_token, _gasFeesPaidFromCol, 0, 0);
        datas[5] = _encodeFlashPayback(DAI, _wDaiToBorrow, 0, 0);
    }

    /* solhint-enable function-max-lines */
}
