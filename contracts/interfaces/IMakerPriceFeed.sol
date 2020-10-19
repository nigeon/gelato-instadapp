// "SPDX-License-Identifier: UNLICENSED"
pragma solidity 0.7.4;

interface IMakerPriceFeed {
    function read() external view returns (bytes32);
}
