// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import {sub} from "../../../vendor/DSMath.sol";
import {
    _getMakerVaultDebt,
    _getMakerVaultCollateralBalance
} from "../../../functions/dapps/FMaker.sol";
import {
    DAI,
    CONNECT_MAKER,
    CONNECT_COMPOUND,
    INSTA_POOL_V2
} from "../../../constants/CInstaDapp.sol";
import {
    _encodePaybackMakerVault,
    _encodedWithdrawMakerVault,
    _encodeOpenMakerVault,
    _encodedDepositMakerVault,
    _encodeBorrowDaiMakerVault
} from "../../../functions/InstaDapp/connectors/FConnectMaker.sol";
import {
    _encodeDepositCompound,
    _encodeBorrowCompound
} from "../../../functions/InstaDapp/connectors/FConnectCompound.sol";
import {
    _encodePayGelatoProvider
} from "../../../functions/InstaDapp/connectors/FConnectGelatoProviderPayment.sol";
import {
    _encodeFlashPayback
} from "../../../functions/InstaDapp/connectors/FInstaPoolV2.sol";
import {_getGelatoProviderFees} from "../../../functions/gelato/FGelato.sol";
import {
    IConnectInstaPoolV2
} from "../../../interfaces/InstaDapp/connectors/IConnectInstaPoolV2.sol";

/// @title DebtBridgeFromMakerForFullRefinance
/// @notice Task Generator contract that generate task for a full refinancing from maker protocol to another protocol (can be Maker).
/// @author Gelato Team
contract DebtBridgeFromMakerForFullRefinance {
    uint256 public constant GAS_COST = 1490779 + (14908 * 2); // 1933080 + ~2% (Estimated Value)

    // To retrieve when the connector is deployed and replace with the address of the deployed instance
    address public connectGelatoProviderPayment;

    constructor(address _connectGelatoProviderPayment) {
        connectGelatoProviderPayment = _connectGelatoProviderPayment;
    }

    /// @notice Generate Task for a full refinancing between Maker to Compound.
    /// @param _vaultId Id of the unsafe vault of the client.
    /// @param _token  vault's col token address .
    /// @param _provider address of the paying provider.
    /// @return targets : flashloan contract address
    /// @return datas : calldata for flashloan
    function execPayloadForFullRefinanceFromMakerToCompound(
        uint256 _vaultId,
        address _token,
        address _provider
    ) public view returns (address[] memory targets, bytes[] memory datas) {
        targets = new address[](1);
        targets[0] = INSTA_POOL_V2;

        uint256 wDaiDebtToMove = _getMakerVaultDebt(_vaultId);
        uint256 wColToWithdrawFromMaker = _getMakerVaultCollateralBalance(
            _vaultId
        );
        uint256 gasFeesPaidFromCol = _getGelatoProviderFees(GAS_COST);

        address[] memory _targets = new address[](6);
        _targets[0] = CONNECT_MAKER; // payback
        _targets[1] = CONNECT_MAKER; // withdraw
        _targets[2] = CONNECT_COMPOUND; // deposit
        _targets[3] = CONNECT_COMPOUND; // borrow
        _targets[4] = connectGelatoProviderPayment;
        _targets[5] = INSTA_POOL_V2;

        bytes[] memory _datas = new bytes[](6);
        _datas[0] = _encodePaybackMakerVault(_vaultId, uint256(-1), 0, 0);
        _datas[1] = _encodedWithdrawMakerVault(_vaultId, uint256(-1), 0, 0);
        _datas[2] = _encodeDepositCompound(
            _token,
            sub(wColToWithdrawFromMaker, gasFeesPaidFromCol),
            0,
            0
        );
        _datas[3] = _encodeBorrowCompound(DAI, wDaiDebtToMove, 0, 0);
        _datas[4] = _encodePayGelatoProvider(
            _provider,
            _token,
            gasFeesPaidFromCol,
            0,
            0
        );
        _datas[5] = _encodeFlashPayback(DAI, wDaiDebtToMove, 0, 0);

        datas = new bytes[](1);
        datas[0] = abi.encodeWithSelector(
            IConnectInstaPoolV2.flashBorrowAndCast.selector,
            DAI,
            wDaiDebtToMove,
            0,
            abi.encode(_targets, _datas)
        );
    }

    /// @notice Generate Task for a full refinancing between Maker (exemple : ETH-A) to Maker (exemple: ETH-B).
    /// @param _vaultId Id of the unsafe vault of the client.
    /// @param _token  vault's col token address .
    /// @param _colType colType of the new vault, exemple : ETH-B, ETH-A.
    /// @param _provider address of the paying provider.
    /// @return targets : flashloan contract address
    /// @return datas : calldata for flashloan
    function execPayloadForFullRefinanceFromMakerToMaker(
        uint256 _vaultId,
        address _token,
        string memory _colType,
        address _provider
    ) public view returns (address[] memory targets, bytes[] memory datas) {
        targets = new address[](1);
        targets[0] = INSTA_POOL_V2;

        uint256 wDaiDebtToMove = _getMakerVaultDebt(_vaultId);
        uint256 wColToWithdrawFromMaker = _getMakerVaultCollateralBalance(
            _vaultId
        );
        uint256 gasFeesPaidFromCol = _getGelatoProviderFees(GAS_COST);

        address[] memory _targets = new address[](7);
        _targets[0] = CONNECT_MAKER; // payback
        _targets[1] = CONNECT_MAKER; // withdraw
        _targets[2] = CONNECT_MAKER; // open ETH-B vault
        _targets[3] = CONNECT_MAKER; // deposit
        _targets[4] = CONNECT_MAKER; // borrow
        _targets[5] = connectGelatoProviderPayment;
        _targets[6] = targets[0];

        bytes[] memory _datas = new bytes[](7);
        _datas[0] = _encodePaybackMakerVault(_vaultId, uint256(-1), 0, 0);
        _datas[1] = _encodedWithdrawMakerVault(_vaultId, uint256(-1), 0, 0);
        _datas[2] = _encodeOpenMakerVault(_colType);
        _datas[3] = _encodedDepositMakerVault(
            0,
            sub(wColToWithdrawFromMaker, gasFeesPaidFromCol),
            0,
            0
        );
        _datas[4] = _encodeBorrowDaiMakerVault(0, wDaiDebtToMove, 0, 0);
        _datas[5] = _encodePayGelatoProvider(
            _provider,
            _token,
            gasFeesPaidFromCol,
            0,
            0
        );
        _datas[6] = _encodeFlashPayback(DAI, wDaiDebtToMove, 0, 0);

        datas = new bytes[](1);
        datas[0] = abi.encodeWithSelector(
            IConnectInstaPoolV2.flashBorrowAndCast.selector,
            DAI,
            wDaiDebtToMove,
            0,
            abi.encode(_targets, _datas)
        );
    }

    /// @notice Generate Data for calling execPayloadForFullRefinanceFromMakerToMaker via a static call.
    /// @param _vaultId Id of the unsafe vault of the client.
    /// @param _token  vault's col token address .
    /// @param _colType colType of the new vault, exemple : ETH-B, ETH-A.
    /// @param _provider address of the paying provider.
    /// @return a call data for a static call of execPayloadForFullRefinanceFromMakerToMaker.
    function getDebtBridgeFullRefinanceMakerToMakerData(
        uint256 _vaultId,
        address _token,
        string memory _colType,
        address _provider
    ) public pure returns (bytes memory) {
        return
            abi.encodeWithSelector(
                this.execPayloadForFullRefinanceFromMakerToMaker.selector,
                _vaultId,
                _token,
                _colType,
                _provider
            );
    }

    /// @notice Generate Data for calling execPayloadForFullRefinanceFromMakerToCompound via a static call.
    /// @param _vaultId Id of the unsafe vault of the client.
    /// @param _token  vault's col token address .
    /// @param _provider address of the paying provider.
    /// @return a call data for a static call of execPayloadForFullRefinanceFromMakerToMaker.
    function getDebtBridgeFullRefinanceMakerToCompoundData(
        uint256 _vaultId,
        address _token,
        address _provider
    ) public pure returns (bytes memory) {
        return
            abi.encodeWithSelector(
                this.execPayloadForFullRefinanceFromMakerToCompound.selector,
                _vaultId,
                _token,
                _provider
            );
    }
}
