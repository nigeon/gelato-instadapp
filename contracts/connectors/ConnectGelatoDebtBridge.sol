// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import {GelatoBytes} from "../lib/GelatoBytes.sol";
import {IFlashLoan} from "../interfaces/IFlashLoan.sol";
import {DSAInterface} from "../interfaces/DSAInterface.sol";

/* solhint-disable */

interface ConnectorInterface {
    function connectorID() external view returns (uint256 _type, uint256 _id);

    function name() external view returns (string memory);
}

abstract contract Helper is ConnectorInterface {
    uint256 internal __id;

    /**
     * @dev Connector Details
     */
    function connectorID()
        public
        view
        override
        returns (uint256 _type, uint256 id)
    {
        (_type, id) = (1, __id); // Should put specific value.
    }
}

contract ConnectGelatoDebtBridge is Helper {
    using GelatoBytes for bytes;

    // solhint-disable-next-line const-name-snakecase
    string public constant override name = "GelatoDebtBridge-v1.0";
    address public immutable connectAddr;

    constructor(uint256 _id) {
        __id = _id;
        connectAddr = address(this);
    }

    function computeRefinanceDataAndCast(address _target, bytes calldata _data)
        public
        payable
    {
        (bool success, bytes memory returndata) = _target.staticcall(_data);
        if (!success) {
            revert(
                returndata.generateErrorString(
                    "ConnectGelatoDebtBridge.computeRefinanceDataAndCast._target:"
                )
            );
        }

        (address target, bytes memory data) = abi.decode(
            returndata,
            (address, bytes)
        );

        address[] memory targets = new address[](1);
        targets[0] = target;
        bytes[] memory datas = new bytes[](1);
        datas[0] = data;

        // Instapool V2 / FlashLoan call
        bytes memory castData = abi.encodeWithSelector(
            DSAInterface.cast.selector,
            targets,
            datas,
            connectAddr
        );

        _cast(address(this), castData);
    }

    function _cast(address _target, bytes memory _data) internal {
        require(_target != address(0), "target-invalid");
        assembly {
            let succeeded := delegatecall(
                gas(),
                _target,
                add(_data, 0x20),
                mload(_data),
                0,
                0
            )

            switch iszero(succeeded)
                case 1 {
                    // throw if delegatecall failed
                    let size := returndatasize()
                    returndatacopy(0x00, 0x00, size)
                    revert(0x00, size)
                }
        }
    }
}
