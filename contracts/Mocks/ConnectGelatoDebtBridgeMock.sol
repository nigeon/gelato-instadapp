pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "../ConnectGelatoDEbtBridge.sol";

contract ConnectGelatoDebtBridgeMock is ConnectGelatoDebtBridge {
    constructor(uint256 _iD, address _oracleAggregator)
        public
        ConnectGelatoDebtBridge(_iD, _oracleAggregator)
    {}

    function wcollateralToWithdraw(
        uint256 _p1LiqRatio,
        uint256 _p2LiqRatio,
        uint256 _col,
        uint256 _bor,
        uint256 _colPrice
    ) public pure returns (uint256) {
        return
            _wcollateralToWithdraw(
                _p1LiqRatio,
                _p2LiqRatio,
                _col,
                _bor,
                _colPrice
            );
    }

    function wborrowedTokenToPayback(
        uint256 _p1LiqRatio,
        uint256 _p2LiqRatio,
        uint256 _col,
        uint256 _bor
    ) public pure returns (uint256) {
        return _wborrowedTokenToPayback(_p1LiqRatio, _p2LiqRatio, _col, _bor);
    }
}
