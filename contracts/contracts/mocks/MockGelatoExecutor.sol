// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

// import "hardhat/console.sol"; // Uncomment this line for using gasLeft Method
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

    // solhint-disable-next-line
    function exec(TaskReceipt memory _TR) external {
        // uint256 gasLeft = gasleft(); // Uncomment this line for using gasleft Method
        IGelatoCore(gelatoCore).exec(_TR);
        // solhint-disable-next-line
        // console.log("Gas Cost for Task Execution %s", gasLeft - gasleft());// Uncomment this line for using gasleft Method
    }

    function stakeExecutor() external payable {
        IGelatoExecutors(gelatoCore).stakeExecutor{value: msg.value}();
    }

    function canExec(
        // solhint-disable-next-line
        TaskReceipt calldata _TR,
        uint256 _gasLimit,
        uint256 _execTxGasPrice
    ) external view returns (string memory) {
        return IGelatoCore(gelatoCore).canExec(_TR, _gasLimit, _execTxGasPrice);
    }
}
