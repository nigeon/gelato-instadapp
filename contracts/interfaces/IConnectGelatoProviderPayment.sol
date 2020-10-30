// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;

interface IConnectGelatoProviderPayment {
    function payProvider(
        address _provider,
        address _token,
        uint256 _amt,
        uint256 _getId,
        uint256 _setId
    ) external payable;
}
