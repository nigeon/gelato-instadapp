// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;

import {ConnectorInterface} from "../IInstaDapp.sol";

interface IConnectGelatoProviderPayment is ConnectorInterface {
    function getProvider() external returns (address);

    function payProvider(
        address _token,
        uint256 _amt,
        uint256 _getId,
        uint256 _setId
    ) external payable;
}
