// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;

interface IERC20 {
    function transfer(address recipient, uint256 amount)
        external
        returns (bool);
}
