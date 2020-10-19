// "SPDX-License-Identifier: UNLICENSED"
pragma solidity 0.6.12;

import "./IMemoryInterface.sol";
import {IERC20} from "@gelatonetwork/core/contracts/external/IERC20.sol";

interface ConnectorInterface {
    function connectorID() external view returns (uint256 _type, uint256 _id);

    function name() external view returns (string memory);
}

abstract contract ConnectGelatoProviderPaymentHelper is ConnectorInterface {
    uint256 internal _id;

    function connectorID()
        public
        view
        override
        returns (uint256 _type, uint256 _iD)
    {
        (_type, _iD) = (1, _id); // Should put specific value.
    }

    function _getMemoryAddr() internal pure returns (address) {
        return 0x8a5419CfC711B2343c17a6ABf4B2bAFaBb06957F; // InstaMemory Address
    }

    function _getUint(uint256 _getId, uint256 _val)
        internal
        returns (uint256 returnVal)
    {
        returnVal = _getId == 0
            ? _val
            : IMemoryInterface(_getMemoryAddr()).getUint(_getId);
    }

    function _setUint(uint256 setId, uint256 val) internal {
        if (setId != 0) IMemoryInterface(_getMemoryAddr()).setUint(setId, val);
    }

    function _getAddressETH() internal pure returns (address) {
        return 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // ETH Address
    }
}

contract ConnectGelatoProviderPayment is ConnectGelatoProviderPaymentHelper {
    // Constant name must be in capitalized SNAKE_CASE
    // solhint-disable-next-line
    string public constant override name = "GelatoProviderPayement-v1.0";

    constructor(uint256 _iD) public {
        _id = _iD;
    }

    function payProvider(
        address _provider,
        address _token,
        uint256 _amt,
        uint256 _getID,
        uint256 _setID
    ) public payable {
        // Desable linter for too long require statement
        // solhint-disable-next-line
        require(
            _provider != address(0x0),
            "ConnectGelatoProviderPayment.payProvider:INVALIDADDESS."
        );
        uint256 amt = _getUint(_getID, _amt);
        if (_token == _getAddressETH()) {
            payable(_provider).transfer(amt);
            return;
        }
        IERC20(_token).transfer(_provider, amt);
    }
}
