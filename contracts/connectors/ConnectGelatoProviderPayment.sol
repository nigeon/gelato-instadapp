// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;

/* solhint-disable */

interface MemoryInterface {
    function setUint(uint256 _id, uint256 _val) external;

    function getUint(uint256 _id) external returns (uint256);
}

interface ConnectorInterface {
    function connectorID() external view returns (uint256 _type, uint256 _id);

    function name() external view returns (string memory);
}

interface IERC20 {
    function transfer(address recipient, uint256 amount)
        external
        returns (bool);
}

library Address {
    /**
     * @dev Returns true if `account` is a contract.
     *
     * [IMPORTANT]
     * ====
     * It is unsafe to assume that an address for which this function returns
     * false is an externally-owned account (EOA) and not a contract.
     *
     * Among others, `isContract` will return false for the following
     * types of addresses:
     *
     *  - an externally-owned account
     *  - a contract in construction
     *  - an address where a contract will be created
     *  - an address where a contract lived, but was destroyed
     * ====
     */
    function isContract(address account) internal view returns (bool) {
        // This method relies on extcodesize, which returns 0 for contracts in
        // construction, since the code is only stored at the end of the
        // constructor execution.

        uint256 size;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://diligence.consensys.net/posts/2019/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.5.11/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     */
    function sendValue(address payable recipient, uint256 amount) internal {
        require(
            address(this).balance >= amount,
            "Address: insufficient balance"
        );

        // solhint-disable-next-line avoid-low-level-calls, avoid-call-value
        (bool success, ) = recipient.call{value: amount}("");
        require(
            success,
            "Address: unable to send value, recipient may have reverted"
        );
    }

    /**
     * @dev Performs a Solidity function call using a low level `call`. A
     * plain`call` is an unsafe replacement for a function call: use this
     * function instead.
     *
     * If `target` reverts with a revert reason, it is bubbled up by this
     * function (like regular Solidity function calls).
     *
     * Returns the raw returned data. To convert to the expected return value,
     * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].
     *
     * Requirements:
     *
     * - `target` must be a contract.
     * - calling `target` with `data` must not revert.
     *
     * _Available since v3.1._
     */
    function functionCall(address target, bytes memory data)
        internal
        returns (bytes memory)
    {
        return functionCall(target, data, "Address: low-level call failed");
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`], but with
     * `errorMessage` as a fallback revert reason when `target` reverts.
     *
     * _Available since v3.1._
     */
    function functionCall(
        address target,
        bytes memory data,
        string memory errorMessage
    ) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0, errorMessage);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but also transferring `value` wei to `target`.
     *
     * Requirements:
     *
     * - the calling contract must have an ETH balance of at least `value`.
     * - the called Solidity function must be `payable`.
     *
     * _Available since v3.1._
     */
    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value
    ) internal returns (bytes memory) {
        return
            functionCallWithValue(
                target,
                data,
                value,
                "Address: low-level call with value failed"
            );
    }

    /**
     * @dev Same as {xref-Address-functionCallWithValue-address-bytes-uint256-}[`functionCallWithValue`], but
     * with `errorMessage` as a fallback revert reason when `target` reverts.
     *
     * _Available since v3.1._
     */
    function functionCallWithValue(
        address target,
        bytes memory data,
        uint256 value,
        string memory errorMessage
    ) internal returns (bytes memory) {
        require(
            address(this).balance >= value,
            "Address: insufficient balance for call"
        );
        require(isContract(target), "Address: call to non-contract");

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = target.call{value: value}(
            data
        );
        return _verifyCallResult(success, returndata, errorMessage);
    }

    function _verifyCallResult(
        bool success,
        bytes memory returndata,
        string memory errorMessage
    ) private pure returns (bytes memory) {
        if (success) {
            return returndata;
        } else {
            // Look for revert reason and bubble it up if present
            if (returndata.length > 0) {
                // The easiest way to bubble the revert reason is using memory via assembly

                // solhint-disable-next-line no-inline-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert(errorMessage);
            }
        }
    }
}

library SafeERC20 {
    using Address for address;

    function safeTransfer(
        IERC20 token,
        address to,
        uint256 value
    ) internal {
        _callOptionalReturn(
            token,
            abi.encodeWithSelector(token.transfer.selector, to, value)
        );
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves. We use {Address.functionCall} to perform this call, which verifies that
        // the target address contains contract code and also asserts for success in the low-level call.

        bytes memory returndata = address(token).functionCall(
            data,
            "SafeERC20: low-level call failed"
        );
        if (returndata.length > 0) {
            // Return data is optional
            // solhint-disable-next-line max-line-length
            require(
                abi.decode(returndata, (bool)),
                "SafeERC20: ERC20 operation did not succeed"
            );
        }
    }
}

/* solhint-enable */

/* solhint-disable private-vars-leading-underscore */

abstract contract Helpers is ConnectorInterface {
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

    /**
     * @dev Return ethereum address
     */
    function getAddressETH() internal pure returns (address) {
        return 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // ETH Address
    }

    /**
     * @dev Return Memory Variable Address
     */
    function getMemoryAddr() internal pure returns (address) {
        return 0x8a5419CfC711B2343c17a6ABf4B2bAFaBb06957F; // InstaMemory Address
    }

    /**
     * @dev Set Uint value in InstaMemory Contract.
     */
    function setUint(uint256 setId, uint256 val) internal {
        if (setId != 0) MemoryInterface(getMemoryAddr()).setUint(setId, val);
    }

    /**
     * @dev Get Uint value from InstaMemory Contract.
     */
    function getUint(uint256 getId, uint256 val)
        internal
        returns (uint256 returnVal)
    {
        returnVal = getId == 0
            ? val
            : MemoryInterface(getMemoryAddr()).getUint(getId);
    }
}

/// @title ConnectGelatoProviderPayment
/// @notice InstaDapp Connector to compensate Gelato automation-gas Providers.
/// @author Gelato Team
contract ConnectGelatoProviderPayment is Helpers {
    using Address for address payable;
    using SafeERC20 for IERC20;

    // solhint-disable-next-line const-name-snakecase
    string public constant override name = "GelatoProviderPayement-v1.0";

    constructor(uint256 _id) {
        __id = _id;
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
            "ConnectGelatoProviderPayment.payProvider:addr0"
        );
        uint256 amt = getUint(_getId, _amt);
        setUint(_setId, amt);
        _token == getAddressETH()
            ? payable(_provider).sendValue(amt)
            : IERC20(_token).safeTransfer(_provider, amt);
    }
}
