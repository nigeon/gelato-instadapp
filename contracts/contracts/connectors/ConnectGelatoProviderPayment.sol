// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;

import {ConnectorInterface} from "../../interfaces/InstaDapp/IInstaDapp.sol";
import {Address} from "../../vendor/Address.sol";
import {IERC20} from "../../interfaces/tokens/IERC20.sol";
import {SafeERC20} from "../../vendor/SafeERC20.sol";
import {getUint, setUint} from "../../functions/InstaDapp/FInstaDapp.sol";
import {ETH} from "../../constants/CInstaDapp.sol";

/// @title ConnectGelatoProviderPayment
/// @notice InstaDapp Connector to compensate Gelato automation-gas Providers.
/// @author Gelato Team
contract ConnectGelatoProviderPayment is ConnectorInterface {
    using Address for address payable;
    using SafeERC20 for IERC20;

    // solhint-disable-next-line const-name-snakecase
    string public constant override name = "ConnectGelatoProviderPayment-v1.0";

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

    /// @notice Transfers automation gas fees to Gelato Provider
    /// @dev Gelato Provider risks:
    ///    - _getId does not match actual InstaMemory provider payment slot
    ///    - _token balance not in DSA
    ///    - worthless _token risk
    /// @param _provider The Provider who pays the Gelato network for automation.
    //   This param should be verified / replaced by the ProviderModule in Gelato on-chain.
    //   In the latter case, it does not matter what address is passed off-chain.
    /// @param _token The token used to pay the Provider.
    /// @param _amt The amount of _token to pay the Gelato Provider.
    /// @param _getId The InstaMemory slot at which the payment amount was stored.
    /// @param _setId The InstaMemory slot to save the provider payout amound in.
    function payProvider(
        address _provider,
        address _token,
        uint256 _amt,
        uint256 _getId,
        uint256 _setId
    ) public payable virtual {
        require(
            _provider != address(0x0),
            "ConnectGelatoProviderPayment.payProvider:!_provider"
        );
        uint256 amt = getUint(_getId, _amt);
        setUint(_setId, amt);
        _token == ETH
            ? payable(_provider).sendValue(amt)
            : IERC20(_token).safeTransfer(_provider, amt);
    }
}
