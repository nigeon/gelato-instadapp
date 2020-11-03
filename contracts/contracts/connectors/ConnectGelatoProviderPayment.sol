// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;

import {
    IConnectGelatoProviderPayment
} from "../../interfaces/InstaDapp/connectors/IConnectGelatoProviderPayment.sol";
import {Address} from "../../vendor/Address.sol";
import {IERC20} from "../../interfaces/tokens/IERC20.sol";
import {SafeERC20} from "../../vendor/SafeERC20.sol";
import {_getUint, _setUint} from "../../functions/InstaDapp/FInstaDapp.sol";
import {ETH} from "../../constants/CInstaDapp.sol";
import {Ownable} from "../../vendor/Ownable.sol";

/// @title ConnectGelatoProviderPayment
/// @notice InstaDapp Connector to compensate Gelato automation-gas Providers.
/// @author Gelato Team
contract ConnectGelatoProviderPayment is
    IConnectGelatoProviderPayment,
    Ownable
{
    using Address for address payable;
    using SafeERC20 for IERC20;

    // solhint-disable-next-line const-name-snakecase
    string public constant override name = "ConnectGelatoProviderPayment-v1.0";

    address public override gelatoProvider;

    uint256 internal immutable _id;
    address internal immutable _this;

    constructor(uint256 id, address _gelatoProvider) {
        _id = id;
        gelatoProvider = _gelatoProvider;
        _this = address(this);
    }

    /// @dev Connector Details
    function connectorID()
        external
        view
        override
        returns (uint256 _type, uint256 id)
    {
        (_type, id) = (1, _id); // Should put specific value.
    }

    /// @notice Set the gelatoProvider address that will be paid for executing a task
    function setProvider(address _gelatoProvider) external override onlyOwner {
        gelatoProvider = _gelatoProvider;
    }

    /// @notice Transfers automation gas fees to Gelato Provider
    /// @dev Gelato Provider risks:
    ///    - _getId does not match actual InstaMemory gelatoProvider payment slot
    ///    - _token balance not in DSA
    ///    - worthless _token risk
    /// @param _gelatoProvider The Provider who pays the Gelato network for automation.
    //   This param should be verified / replaced by the ProviderModule in Gelato on-chain.
    //   In the latter case, it does not matter what address is passed off-chain.
    /// @param _token The token used to pay the Provider.
    /// @param _amt The amount of _token to pay the Gelato Provider.
    /// @param _getId The InstaMemory slot at which the payment amount was stored.
    /// @param _setId The InstaMemory slot to save the gelatoProvider payout amound in.
    function payProvider(
        address _token,
        uint256 _amt,
        uint256 _getId,
        uint256 _setId
    ) external payable override {
        address _gelatoProvider = IConnectGelatoProviderPayment(_this)
            .gelatoProvider();
        require(
            _gelatoProvider != address(0x0),
            "ConnectGelatoProviderPayment.payProvider:!_gelatoProvider"
        );
        uint256 amt = _getUint(_getId, _amt);
        _setUint(_setId, amt);
        _token == ETH
            ? payable(_gelatoProvider).sendValue(amt)
            : IERC20(_token).safeTransfer(_gelatoProvider, amt);
    }
}
