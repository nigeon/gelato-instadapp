// "SPDX-License-Identifier: UNLICENSED"
pragma solidity 0.6.12;

interface IMemoryInterface {
    function setUint(uint256 _id, uint256 _val) external;

    function getUint(uint256 _id) external returns (uint256);
}
