// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;

import {
    IConnectCompound
} from "../../../interfaces/InstaDapp/connectors/IConnectCompound.sol";

function _encodeDepositCompound(
    address _colToken,
    uint256 _amt,
    uint256 _getId,
    uint256 _setId
) pure returns (bytes memory) {
    return
        abi.encodeWithSelector(
            IConnectCompound.deposit.selector,
            _colToken,
            _amt,
            _getId,
            _setId
        );
}

function _encodeBorrowCompound(
    address _colToken,
    uint256 _amt,
    uint256 _getId,
    uint256 _setId
) pure returns (bytes memory) {
    return
        abi.encodeWithSelector(
            IConnectCompound.borrow.selector,
            _colToken,
            _amt,
            _getId,
            _setId
        );
}
