// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import {GelatoBytes} from "../../lib/GelatoBytes.sol";
import {
    AccountInterface,
    ConnectorInterface
} from "../../interfaces/InstaDapp/IInstaDapp.sol";
import {
    IConnectInstaPoolV2
} from "../../interfaces/InstaDapp/connectors/IConnectInstaPoolV2.sol";

contract ConnectGelatoData is ConnectorInterface {
    using GelatoBytes for bytes;

    // solhint-disable-next-line const-name-snakecase
    string public constant override name = "ConnectGelatoData-v1.0";
    uint256 internal immutable _id;

    constructor(uint256 id) {
        _id = id;
    }

    /// @dev Connector Details
    function connectorID()
        public
        view
        override
        returns (uint256 _type, uint256 id)
    {
        (_type, id) = (1, _id); // Should put specific value.
    }

    function getDataAndCast(address _target, bytes calldata _data)
        public
        payable
    {
        (bool success, bytes memory returndata) = _target.staticcall(_data);
        if (!success) {
            returndata.revertWithError(
                "ConnectGelatoData.getDataAndCast._target:"
            );
        }

        (address[] memory targets, bytes[] memory datas) = abi.decode(
            returndata,
            (address[], bytes[])
        );

        // Instapool V2 / FlashLoan call
        bytes memory castData = abi.encodeWithSelector(
            AccountInterface.cast.selector,
            targets,
            datas,
            msg.sender // msg.sender == GelatoCore
        );

        (success, returndata) = address(this).delegatecall(castData);
        if (!success)
            returndata.revertWithError("ConnectGelatoData.getDataAndCast:");
    }
}
