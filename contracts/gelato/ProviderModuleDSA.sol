// "SPDX-License-Identifier: UNLICENSED"
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import {
    GelatoProviderModuleStandard
} from "@gelatonetwork/core/contracts/provider_modules/GelatoProviderModuleStandard.sol";
import {
    Task
} from "@gelatonetwork/core/contracts/gelato_core/interfaces/IGelatoCore.sol";
import {AccountInterface} from "../interfaces/InstaDapp.sol";
import {
    ConnectGelatoProviderPayment
} from "../connectors/ConnectGelatoProviderPayment.sol";

/// @notice Gelato Provider Module for the InstaDapp DSA
/// @dev Used by Provider to sanity check any third-party Tasks they pay for
/// @author Gelato Network Team
contract ProviderModuleDSA is GelatoProviderModuleStandard {
    /// @dev DSA must have gelatoCore as auth and gelatoCore is emitted as origin of cast
    address public immutable gelatoCore;

    /// @notice A trusted Connector to pay Provider for e.g. User's Gelato gas usage.
    /// @dev Automated InstaDapp Use Cases that rely on a third-party Gelato Provider
    ///  to pay for automation will likely have this Connector in their spells.
    address public immutable connectGelatoProviderPayment;

    // TO DO: remove `public` after hardhat file import bugfix
    // https://github.com/nomiclabs/hardhat/issues/916
    constructor(address _gelatoCore, address _connectGelatoProviderPayment)
        public
    {
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
                return "ProviderModuleDSA.isProvided:GelatoCoreNotAuth";
        } catch Error(string memory err) {
            return
                string(abi.encodePacked("ProviderModuleDSA.isProvided:", err));
        } catch {
            return "ProviderModuleDSA.isProvided:undefined";
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
        address[] memory targets = new address[](_task.actions.length);
        for (uint256 i = 0; i < _task.actions.length; i++)
            targets[i] = _task.actions[i].addr;

        bytes[] memory datas = new bytes[](_task.actions.length);
        for (uint256 i = 0; i < _task.actions.length; i++) {
            if (_task.actions[i].addr == connectGelatoProviderPayment)
                datas[i] = _replaceProvider(_provider, _task.actions[i].data);
            else datas[i] = _task.actions[i].data;
        }

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
        (, address token, uint256 amt, uint256 getID, uint256 setID) = abi
            .decode(_data[4:], (address, address, uint256, uint256, uint256));
        return
            abi.encodeWithSelector(
                ConnectGelatoProviderPayment.payProvider.selector,
                _provider,
                token,
                amt,
                getID,
                setID
            );
    }
}
