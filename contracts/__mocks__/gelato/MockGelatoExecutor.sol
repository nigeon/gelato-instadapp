// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

// import {console} from "hardhat/console.sol"; // Uncomment this line for using gasLeft Method
import {
    TaskReceipt
} from "@gelatonetwork/core/contracts/gelato_core/interfaces/IGelatoCore.sol";
import {
    IGelatoCore
} from "@gelatonetwork/core/contracts/gelato_core/interfaces/IGelatoCore.sol";
import {
    IGelatoExecutors
} from "@gelatonetwork/core/contracts/gelato_core/interfaces/IGelatoExecutors.sol";
import {GelatoBytes} from "../../lib/GelatoBytes.sol";

contract MockGelatoExecutor {
    using GelatoBytes for bytes;
    address public gelatoCore;

    constructor(address _gelatoCore) {
        gelatoCore = _gelatoCore;
    }

    function exec(TaskReceipt memory _taskReceipt) external {
        // uint256 gasLeft = gasleft();
        IGelatoCore(gelatoCore).exec(_taskReceipt);
        // console.log("Gas Cost for Task Execution %s", gasLeft - gasleft());
    }

    function stakeExecutor() external payable {
        IGelatoExecutors(gelatoCore).stakeExecutor{value: msg.value}();
    }

    function canExec(
        TaskReceipt calldata _taskReceipt,
        uint256 _gasLimit,
        uint256 _execTxGasPrice
    ) external view returns (string memory) {
        return
            IGelatoCore(gelatoCore).canExec(
                _taskReceipt,
                _gasLimit,
                _execTxGasPrice
            );
    }
}
