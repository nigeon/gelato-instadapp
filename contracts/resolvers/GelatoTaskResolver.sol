// "SPDX-License-Identifier: UNLICENSED"
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import {Ownable} from "../vendor/Ownable.sol";
import {GelatoBytes} from "../lib/GelatoBytes.sol";
import {IGelatoTaskGenerator} from "../interfaces/IGelatoTaskGenerator.sol";
import {
    Task
} from "@gelatonetwork/core/contracts/gelato_core/interfaces/IGelatoCore.sol";

/// @title GelatoTaskResolver
/// @notice Convenience contract with methods to retrieve Task objects from Task Generators.
/// @dev Can be used by Frontends and Maintainers to:
///  - Frontends: Retrieve Task structs from Task Generators for submission to GelatoCore
///  - Maintainer: Add new version of Task Generators
contract GelatoTaskResolver is Ownable {
    using GelatoBytes for bytes;

    /// @notice The contract that has the function returning a Task object
    mapping(string => IGelatoTaskGenerator) public taskGenerator;

    /// @notice Adds a new TaskGenerator address
    /// @dev Only owner can call this, but existing taskGenerator entries are immutable
    /// @param _taskGenerator The descriptor of the taskGenerator e.g. GelatoDebtBridgeFromMaker
    /// @param _taskGeneratorAddr The address of the taskGenerator contract
    function addTaskGenerator(
        string memory _taskGenerator,
        IGelatoTaskGenerator _taskGeneratorAddr
    ) external onlyOwner {
        require(
            taskGenerator[_taskGenerator] == IGelatoTaskGenerator(0),
            "GelatoTaskResolver.addTaskGenerator: set"
        );
        taskGenerator[_taskGenerator] = _taskGeneratorAddr;
    }

    /// @notice A generelized getter for a price supplied by an taskGenerator contract.
    /// @dev The taskGenerator returndata must be formatted as a single uint256.
    /// @param _taskGenerator The descriptor of our taskGenerator e.g. ETH/USD-Maker-v1
    /// @return The uint256 taskGenerator price
    function getTask(
        string calldata _taskGenerator,
        bytes calldata _abiEncodedParams
    ) external view returns (Task memory) {
        address taskGeneratorAddr = address(taskGenerator[_taskGenerator]);

        if (taskGeneratorAddr == address(0))
            revert("GelatoTaskResolver.getTask: !taskGenerator");

        (bool success, bytes memory returndata) = taskGeneratorAddr.staticcall(
            abi.encodePacked(
                taskGenerator[_taskGenerator].SELECTOR(),
                _abiEncodedParams
            )
        );

        if (!success)
            returndata.revertWithErrorString("GelatoTaskResolver.getTask:");
        return abi.decode(returndata, (Task));
    }
}
