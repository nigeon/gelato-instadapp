// "SPDX-License-Identifier: UNLICENSED"
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {Ownable} from "@gelatonetwork/core/contracts/external/Ownable.sol";
import "./DSMath.sol";

interface IMakerPriceFeed {
    function read() external view returns (bytes32);
}

contract OracleAggregatorStorage {
    mapping(string => address) public makerOracle;
    mapping(string => address) public compoundOracle;
    mapping(string => address) public chainlinkOracle;
}

// 0x729D19f657BD0614b4985Cf1D82531c67569197B for ETH/USD medianizer it return value in wad standard.
contract OracleAggregator is OracleAggregatorStorage, Ownable, DSMath {
    bool public mockMode;
    uint256 public mockValue;

    constructor() public Ownable() {
        mockMode = false;
        mockValue = 0;
    }

    function mock(bool _mockMode, uint256 _mockValue) public onlyOwner {
        mockMode = _mockMode;
        mockValue = _mockValue;
    }

    function addOracle(string memory _pair, address _oracleAddress)
        external
        onlyOwner
    {
        // Desable linter for too long require statement
        // solhint-disable-next-line
        require(
            makerOracle[_pair] == address(0x0),
            "OracleAggregator.Maker: Oracle already set."
        );
        makerOracle[_pair] = _oracleAddress;
    }

    function getMakerTokenPrice(string memory _pair)
        external
        view
        returns (uint256)
    {
        // Desable linter for too long require statement
        // solhint-disable-next-line
        require(
            makerOracle[_pair] != address(0x0),
            "OracleAggregator.getMakerTokenPrice: CurrencyPairNotSupported."
        );
        if (mockMode) {
            return mockValue;
        }
        return uint256(IMakerPriceFeed(makerOracle[_pair]).read());
    }
}
