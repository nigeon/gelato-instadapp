// "SPDX-License-Identifier: UNLICENSED"
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {
    GelatoProviderModuleStandard
} from "@gelatonetwork/core/contracts/provider_modules/GelatoProviderModuleStandard.sol";
import {
    Task
} from "@gelatonetwork/core/contracts/gelato_core/interfaces/IGelatoCore.sol";
import "./ConnectGelatoProviderPayment.sol";

/// @dev InstaDapp Index
interface IndexInterface {
    function connectors(uint256 version) external view returns (address);

    function list() external view returns (address);
}

/// @dev InstaDapp List
interface ListInterface {
    function accountID(address _account) external view returns (uint64);
}

/// @dev InstaDapp Defi Smart Account wallet
interface AccountInterface {
    function version() external view returns (uint256);

    function isAuth(address user) external view returns (bool);

    function shield() external view returns (bool);

    function cast(
        address[] calldata _targets,
        bytes[] calldata _datas,
        address _origin
    ) external payable returns (bytes32[] memory responses);
}

contract ProviderModuleDSA is GelatoProviderModuleStandard {
    IndexInterface public immutable index;
    address public immutable gelatoCore;
    address public immutable connectGelatoProviderPayment;

    constructor(
        IndexInterface _index,
        address _gelatoCore,
        address _connectGelatoProviderPayment
    ) public {
        index = _index;
        gelatoCore = _gelatoCore;
        connectGelatoProviderPayment = _connectGelatoProviderPayment;
    }

    // ================= GELATO PROVIDER MODULE STANDARD ================
    function isProvided(
        address _userProxy,
        address,
        Task calldata _task
    ) external view override returns (string memory) {
        // Verify InstaDapp account identity
        if (ListInterface(index.list()).accountID(_userProxy) == 0)
            return "ProviderModuleDSA.isProvided:InvalidUserProxy";

        // Is GelatoCore authorized
        if (!AccountInterface(_userProxy).isAuth(gelatoCore))
            return "ProviderModuleDSA.isProvided:GelatoCoreNotAuth";

        return OK;
    }

    /// @dev DS PROXY ONLY ALLOWS DELEGATE CALL for single actions, that's why we also use multisend
    function execPayload(
        uint256,
        address,
        address _provider,
        Task calldata _task,
        uint256
    ) external view override returns (bytes memory payload, bool) {
        address[] memory targets = new address[](_task.actions.length);
        for (uint256 i = 0; i < _task.actions.length; i++)
            targets[i] = _task.actions[i].addr;

        bytes[] memory datas = new bytes[](_task.actions.length);
        for (uint256 i = 0; i < _task.actions.length; i++) {
            if (_task.actions[i].addr == connectGelatoProviderPayment) {
                // input the exact address of the provider
                datas[i] = _getDelegateCallDataForProviderPaymentConnector(
                    _provider,
                    _task.actions[i].data
                );
            } else {
                datas[i] = _task.actions[i].data;
            }
        }

        payload = abi.encodeWithSelector(
            AccountInterface.cast.selector,
            targets,
            datas,
            gelatoCore
        );
    }

    function _getDelegateCallDataForProviderPaymentConnector(
        address _provider,
        bytes calldata _data
    ) internal pure returns (bytes memory) {
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
