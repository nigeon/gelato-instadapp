// "SPDX-License-Identifier: UNLICENSED"
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import {
    GelatoProviderModuleStandard
} from "@gelatonetwork/core/contracts/provider_modules/GelatoProviderModuleStandard.sol";
import {
    Task
} from "@gelatonetwork/core/contracts/gelato_core/interfaces/IGelatoCore.sol";
import {AccountInterface} from "../../../interfaces/InstaDapp/IInstaDapp.sol";
import {
    DebtBridgeFromMakerForFullRefinance
} from "../../gelato/data_generators/DebtBridgeFromMakerForFullRefinance.sol";
import {ConnectGelatoData} from "../../connectors/ConnectGelatoData.sol";

/// @notice Gelato Provider Module for the InstaDapp DSA
/// @dev Used by Provider to sanity check any third-party Tasks they pay for
/// @author Gelato Network Team
contract ProviderModuleDsaFromMakerToCompound is GelatoProviderModuleStandard {
    /// @dev DSA must have gelatoCore as auth and gelatoCore is emitted as origin of cast
    address public immutable gelatoCore;

    /// @notice A trusted Connector to pay Provider for e.g. User's Gelato gas usage.
    /// @dev Automated InstaDapp Use Cases that rely on a third-party Gelato Provider
    ///  to pay for automation will likely have this Connector in their spells.
    address public immutable connectGelatoProviderPayment;

    // TO DO: remove `public` after hardhat file import bugfix
    // https://github.com/nomiclabs/hardhat/issues/916
    constructor(address _gelatoCore, address _connectGelatoProviderPayment) {
        gelatoCore = _gelatoCore;
        connectGelatoProviderPayment = _connectGelatoProviderPayment;
    }

    // ================= GELATO PROVIDER MODULE STANDARD ================
    /// @notice Standard Gelato function for Provider's Task sanity checks
    /// @dev For more Provider security we should also check:
    ///  - ListInterface(index.list()).accountID(_userProxy)
    ///  - if (shield) connectors.isStaticConnector(targets)
    ///  - connectors.isConnector(targets)
    /// But we skip those here to save gas
    /// @param _userProxy The DSA which submitted the Task
    /// @return whether the Provider is pays for the Task.
    function isProvided(
        address _userProxy,
        address,
        Task calldata
    ) public view virtual override returns (string memory) {
        try AccountInterface(_userProxy).isAuth(gelatoCore) returns (
            bool gelatoCoreIsAuth
        ) {
            if (!gelatoCoreIsAuth)
                return
                    "ProviderModuleDsaFromMakerToCompound.isProvided:GelatoCoreNotAuth";
        } catch Error(string memory err) {
            return
                string(
                    abi.encodePacked(
                        "ProviderModuleDsaFromMakerToCompound.isProvided:",
                        err
                    )
                );
        } catch {
            return "ProviderModuleDsaFromMakerToCompound.isProvided:undefined";
        }

        return OK;
    }

    /// @notice Gelato Standard Provider function to retrieve payload for the DSA
    /// @dev This formats the Gelato Task into a DSA compatible payload and
    ///  it also inserts the _provider into the ConnectGelatoProviderPayment payload,
    ///  to make sure that it cannot be spoofed thus e.g. securing Provider payments.
    /// @param _provider the actual Provider address verified by GelatoCore system.
    /// @param _task The Task in Gelato format.
    /// @return The execution payload in DSA format
    /// @return bool=false because no execRevert checks must be handled on GelatoCore
    ///  because the DSA reverts, if a spell revert is caught during delegatecall.
    function execPayload(
        uint256,
        address,
        address _provider,
        Task calldata _task,
        uint256
    ) public view virtual override returns (bytes memory, bool) {
        require(
            _task.actions.length == 1,
            "ProviderModuleDsaFromMakerToCompound.execPayload: Task should 1 action."
        );
        address[] memory targets = new address[](_task.actions.length);
        targets[0] = _task.actions[0].addr;

        bytes[] memory datas = new bytes[](_task.actions.length);
        datas[0] = _replaceProvider(_provider, _task.actions[0].data);

        return (
            abi.encodeWithSelector(
                AccountInterface.cast.selector,
                targets,
                datas,
                gelatoCore
            ),
            false
        );
    }

    function _replaceProvider(address _provider, bytes calldata _data)
        internal
        pure
        returns (bytes memory)
    {
        address target = abi.decode(_data[4:36], (address));
        (uint256 vaultId, address token, ) = abi.decode(
            _data[104:],
            (uint256, address, address)
        );
        return
            abi.encodeWithSelector(
                ConnectGelatoData.getDataAndCast.selector,
                target,
                abi.encodeWithSelector(
                    DebtBridgeFromMakerForFullRefinance
                        .execPayloadForFullRefinanceFromMakerToCompound
                        .selector,
                    vaultId,
                    token,
                    _provider
                )
            );
    }
}
