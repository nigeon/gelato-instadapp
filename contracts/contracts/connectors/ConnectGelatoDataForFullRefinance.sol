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

contract ConnectGelatoDataForFullRefinance is ConnectorInterface {
    using GelatoBytes for bytes;

    // solhint-disable-next-line const-name-snakecase
    string public constant override name = "ConnectGelatoData-v1.0";
    uint256 internal immutable _id;
    address internal immutable _connectGelatoProviderPayment;

    uint256 public constant GAS_COST = 1490779 + (14908 * 2); // 1490779 + ~2% (Estimated Value)

    constructor(uint256 id, address connectGelatoProviderPayment) {
        _id = id;
        _connectGelatoProviderPayment = connectGelatoProviderPayment;
    }

    /// @dev Connector Details
    function connectorID()
        public
        view
        override
        returns (uint256 _type, uint256 id)
    {
        (_type, id) = (1, _id); // Should put specific value.
    }

    function getDataAndCastForFromMakerToMaker(
        uint256 _vaultId,
        address _token,
        string memory _colType,
        address _provider
    ) public payable {
        (
            address[] memory targets,
            bytes[] memory datas
        ) = _execPayloadForFullRefinanceFromMakerToMaker(
            _vaultId,
            _token,
            _colType,
            _provider
        );

        _cast(targets, datas);
    }

    function getDataAndCastForFromMakerToCompound(
        uint256 _vaultId,
        address _token,
        address _provider
    ) public payable {
        (
            address[] memory targets,
            bytes[] memory datas
        ) = _execPayloadForFullRefinanceFromMakerToCompound(
            _vaultId,
            _token,
            _provider
        );

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

    /// @notice Generate Task for a full refinancing between Maker to Compound.
    /// @param _vaultId Id of the unsafe vault of the client.
    /// @param _token  vault's col token address .
    /// @param _provider address of the paying provider.
    /// @return targets : flashloan contract address
    /// @return datas : calldata for flashloan
    function _execPayloadForFullRefinanceFromMakerToCompound(
        uint256 _vaultId,
        address _token,
        address _provider
    ) internal view returns (address[] memory targets, bytes[] memory datas) {
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
        _targets[4] = _connectGelatoProviderPayment;
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

    /// @notice Generate Task for a full refinancing between Maker e.g. ETH-A to ETH-B.
    /// @param _vaultId Id of the unsafe vault of the client.
    /// @param _token  vault's col token address .
    /// @param _colType colType of the new vault, exemple : ETH-B, ETH-A.
    /// @param _provider address of the paying provider.
    /// @return targets : flashloan contract address
    /// @return datas : calldata for flashloan
    function _execPayloadForFullRefinanceFromMakerToMaker(
        uint256 _vaultId,
        address _token,
        string memory _colType,
        address _provider
    ) internal view returns (address[] memory targets, bytes[] memory datas) {
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
        _targets[5] = _connectGelatoProviderPayment;
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

    /* solhint-enable function-max-lines */
}
