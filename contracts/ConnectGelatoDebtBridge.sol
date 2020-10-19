// "SPDX-License-Identifier: UNLICENSED"
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./IMemoryInterface.sol";
import "./DSMath.sol";

interface ConnectorInterface {
    function connectorID() external view returns (uint256 _type, uint256 _id);

    function name() external view returns (string memory);
}

interface OracleAggregator {
    function getMakerTokenPrice(string memory _pair)
        external
        view
        returns (uint256);
}

interface GelatoGasPriceOracle {
    function latestAnswer() external view returns (int256);
}

interface IMakerResolver {
    struct VaultData {
        uint256 id;
        address owner;
        string colType;
        uint256 collateral;
        uint256 art;
        uint256 debt;
        uint256 liquidatedCol;
        uint256 borrowRate;
        uint256 colPrice;
        uint256 liquidationRatio;
        address vaultAddress;
    }

    function getVaultById(uint256 id) external view returns (VaultData memory);
}

interface ICompoundResolver {
    struct CompData {
        uint256 tokenPriceInEth;
        uint256 tokenPriceInUsd;
        uint256 exchangeRateStored;
        uint256 balanceOfUser;
        uint256 borrowBalanceStoredUser;
        uint256 supplyRatePerBlock;
        uint256 borrowRatePerBlock;
    }

    function getCompoundData(address owner, address[] memory cAddress)
        external
        view
        returns (CompData[] memory);
}

interface IAaveResolver {
    struct AaveTokenData {
        uint256 ltv;
        uint256 threshold;
        bool usageAsCollEnabled;
        bool borrowEnabled;
        bool stableBorrowEnabled;
        bool isActive;
    }

    struct AaveUserTokenData {
        uint256 tokenPriceInEth;
        uint256 tokenPriceInUsd;
        uint256 supplyBalance;
        uint256 borrowBalance;
        uint256 borrowFee;
        uint256 supplyRate;
        uint256 borrowRate;
        uint256 borrowModal;
        AaveTokenData aaveTokenData;
    }

    struct AaveUserData {
        uint256 totalSupplyETH;
        uint256 totalCollateralETH;
        uint256 totalBorrowsETH;
        uint256 totalFeesETH;
        uint256 availableBorrowsETH;
        uint256 currentLiquidationThreshold;
        uint256 ltv;
        uint256 healthFactor;
        uint256 ethPriceInUsd;
    }

    function getPosition(address user, address[] memory tokens)
        external
        view
        returns (AaveUserTokenData[] memory, AaveUserData memory);
}

abstract contract Helpers is ConnectorInterface, DSMath {
    uint256 internal _id;

    /**
     * @dev Return ethereum address
     */
    function _getAddressETH() internal pure returns (address) {
        return 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE; // ETH Address
    }

    /**
     * @dev Return Memory Variable Address
     */
    function _getMemoryAddr() internal pure returns (address) {
        return 0x8a5419CfC711B2343c17a6ABf4B2bAFaBb06957F; // InstaMemory Address
    }

    /**
     * @dev Set Uint value in InstaMemory Contract.
     */
    function _setUint(uint256 setId, uint256 val) internal {
        if (setId != 0) IMemoryInterface(_getMemoryAddr()).setUint(setId, val);
    }

    /**
     * @dev Get Uint value from InstaMemory Contract.
     */
    function _getUint(uint256 getId, uint256 val)
        internal
        returns (uint256 returnVal)
    {
        returnVal = getId == 0
            ? val
            : IMemoryInterface(_getMemoryAddr()).getUint(getId);
    }

    /**
     * @dev Connector Details
     */
    function connectorID()
        public
        view
        override
        returns (uint256 _type, uint256 _iD)
    {
        (_type, _iD) = (1, _id); // Should put specific value.
    }

    function _stringToBytes32(string memory str)
        internal
        pure
        returns (bytes32 result)
    {
        require(bytes(str).length != 0, "String-Empty");
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            result := mload(add(str, 32))
        }
    }
}

abstract contract ConnectGelatoDebtBridgeHelpers is Helpers {
    function _getMakerResolver() internal pure returns (address) {
        return 0x0A7008B38E7015F8C36A49eEbc32513ECA8801E5;
    }

    function _getCompoundResolver() internal pure returns (address) {
        return 0x1f22D77365d8BFE3b901C33C83C01B584F946617;
    }

    function _getAaveResolver() internal pure returns (address) {
        return 0xe04Cd009fF68628BC663058dDAA7E5Bf7979BEaF;
    }

    function _getGelatoGasPriceOracle() internal pure returns (address) {
        return 0x169E633A2D1E6c10dD91238Ba11c4A708dfEF37C;
    }

    function _getGasPrice() internal view returns (uint256) {
        return
            uint256(
                GelatoGasPriceOracle(_getGelatoGasPriceOracle()).latestAnswer()
            );
    }
}

abstract contract ConnectGelatoDebtBridgeResolver is
    ConnectGelatoDebtBridgeHelpers
{
    mapping(address => address) internal _priceFeeds;

    function getMakerVault(uint256 _vaultID)
        public
        view
        returns (IMakerResolver.VaultData memory)
    {
        // call maker resolver.
        return IMakerResolver(_getMakerResolver()).getVaultById(_vaultID);
    }

    function getMakerVaultDebt(uint256 _vaultID) public view returns (uint256) {
        return getMakerVault(_vaultID).debt;
    }

    function getMakerVaultCollateralBalance(uint256 _vaultID)
        public
        view
        returns (uint256)
    {
        return getMakerVault(_vaultID).collateral;
    }

    function getMakerVaultCollateralType(uint256 _vaultID)
        public
        view
        returns (string memory)
    {
        return getMakerVault(_vaultID).colType;
    }

    function getCompoundData(address _owner, address _cAddress)
        public
        view
        returns (ICompoundResolver.CompData memory)
    {
        address[] memory cAddressArray;
        cAddressArray[0] = _cAddress;
        return
            ICompoundResolver(_getCompoundResolver()).getCompoundData(
                _owner,
                cAddressArray
            )[0];
    }

    function getCompoundDebt(address _owner, address _cAddress)
        public
        view
        returns (uint256)
    {
        return getCompoundData(_owner, _cAddress).borrowBalanceStoredUser;
    }

    function getCompoundCollateralBalance(address _owner, address _cAddress)
        public
        view
        returns (uint256)
    {
        return getCompoundData(_owner, _cAddress).balanceOfUser;
    }

    function getAaveTokenData(address _owner, address _atoken)
        public
        view
        returns (
            IAaveResolver.AaveUserTokenData memory,
            IAaveResolver.AaveUserData memory
        )
    {
        address[] memory aTokenArray;
        aTokenArray[0] = _atoken;
        (
            IAaveResolver.AaveUserTokenData[] memory tokensData,
            IAaveResolver.AaveUserData memory etherUserData
        ) = IAaveResolver(_getAaveResolver()).getPosition(_owner, aTokenArray);
        return (tokensData[0], etherUserData);
    }

    function getAaveTokenDebt(address _owner, address _atoken)
        public
        view
        returns (uint256)
    {
        (IAaveResolver.AaveUserTokenData memory tokenData, ) = getAaveTokenData(
            _owner,
            _atoken
        );
        return tokenData.supplyBalance;
    }

    function getAaveTokenCollateralBalance(address _owner, address _atoken)
        public
        view
        returns (uint256)
    {
        (IAaveResolver.AaveUserTokenData memory tokenData, ) = getAaveTokenData(
            _owner,
            _atoken
        );
        return tokenData.borrowBalance;
    }
}

contract ConnectGelatoDebtBridge is ConnectGelatoDebtBridgeResolver {
    // Constant name must be in capitalized SNAKE_CASE
    // solhint-disable-next-line
    string public constant override name = "GelatoDebtBridge-v1.0";
    uint256 public constant GASLIMIT = 1933090 + (19331 * 2); // 1933080 + ~2% (Estimated Value)
    address public immutable oracleAggregator;

    constructor(uint256 _iD, address _oracleAggregator) public {
        _id = _iD;
        oracleAggregator = _oracleAggregator;
    }

    /// @notice Write in instaMemory the needed values for doing the refinancing between makerDAO and Compound.
    /// @param _vaultID is the id of the makerDAO vault.
    /// @param _vaultCollateralizationRatio is the collateralization ratio wanted by the client.
    /// @param _compPosCollateralizationRatio is the collateralization ratio wanted by the client.
    /// @param _pair crypto currency pair used (collateral token/ borrowed token).
    /// @param _getID Id for writting in instaMemory.
    /// @param _setID Id for loading from instaMemory.
    function debtBridgeMakerToCompound(
        uint256 _vaultID,
        uint256 _vaultCollateralizationRatio, // should be in ray because maker use ray standard
        uint256 _compPosCollateralizationRatio, // should be in wad because compound use wad standard
        string memory _pair,
        uint256 _getID,
        uint256 _setID
    ) external payable {
        (
            uint256 paybackAmount,
            uint256 collateralToWithdraw,
            uint256 fees
        ) = debtBridgeCompute(
            _vaultID,
            _vaultCollateralizationRatio,
            _compPosCollateralizationRatio,
            _pair
        );

        _setUint(100, paybackAmount);
        _setUint(101, paybackAmount); // payback maker
        _setUint(102, _add(collateralToWithdraw, fees)); // withdraw maker
        _setUint(103, collateralToWithdraw); // deposit compound
        _setUint(104, paybackAmount); // borrow compound
        _setUint(105, fees); // pay the provider
    }

    // Price Oracle

    function debtBridgeCompute(
        uint256 _vaultID,
        uint256 _vaultLiquidationRatio, // should be in ray because maker use ray standard
        uint256 _compPosLiquidationRatio, // should be in wad because compound use wad standard
        string memory _pair
    )
        public
        view
        returns (
            uint256 paybackAmount,
            uint256 collateralToWithdraw,
            uint256 fees
        )
    {
        uint256 latestPrice = _getLatestPrice(_pair);
        // uint256 fees = mul(GASLIMIT, wmul(_getGasPrice(), latestPrice));
        fees = _mul(GASLIMIT, _getGasPrice());

        uint256 debt = getMakerVaultDebt(_vaultID);
        uint256 collateral = _sub(
            _wmul(getMakerVaultCollateralBalance(_vaultID), latestPrice),
            fees
        );

        collateralToWithdraw = _wcollateralToWithdraw(
            _vaultLiquidationRatio,
            _compPosLiquidationRatio,
            collateral,
            debt,
            latestPrice
        );
        paybackAmount = _wborrowedTokenToPayback(
            _vaultLiquidationRatio,
            _compPosLiquidationRatio,
            collateral,
            debt
        );
    }

    function _getLatestPrice(string memory _pair)
        internal
        view
        returns (uint256)
    {
        return OracleAggregator(oracleAggregator).getMakerTokenPrice(_pair);
    }

    /// Computation in ray
    /// @notice return the amount of collateral we need to withdraw during the debt refinancing in ray standard.
    /// @param _p1LiqRatio the liquidation ratio of protocol 1.
    /// @param _p2LiqRatio the liquidation ratio of protocol 2.
    /// @param _col token1 collateral to put on protocol 1.
    /// @param _bor amount of borrowed token2 on protocol 1.
    /// @param _colPrice price of the collateral.
    /// @return collateral to withdraw in ray standard
    function _rcollateralToWithdraw(
        uint256 _p1LiqRatio,
        uint256 _p2LiqRatio,
        uint256 _col,
        uint256 _bor,
        uint256 _colPrice
    ) internal pure returns (uint256) {
        return
            _rdiv(
                _sub(
                    _col,
                    _rdiv(
                        _sub(
                            _rmul(_p1LiqRatio, _col),
                            _rmul(_p1LiqRatio, _rmul(_p2LiqRatio, _bor))
                        ),
                        _sub(_p1LiqRatio, _p2LiqRatio)
                    )
                ),
                _colPrice
            );
    }

    /// Computation in ray
    /// @notice return the amount of borrowed token we need to payback during the debt refinancing in ray standard.
    /// @param _p1LiqRatio the liquidation ratio of protocol 1.
    /// @param _p2LiqRatio the liquidation ratio of protocol 2.
    /// @param _col token1 collateral to put on protocol 1.
    /// @param _bor amount of borrowed token2 on protocol 1.
    /// @return amount of borrowed token to pay back in ray standard
    function _rborrowedTokenToPayback(
        uint256 _p1LiqRatio,
        uint256 _p2LiqRatio,
        uint256 _col,
        uint256 _bor
    ) internal pure returns (uint256) {
        return
            _sub(
                _bor,
                _rmul(
                    _rdiv(1e18, _p1LiqRatio),
                    _rdiv(
                        _sub(
                            _rmul(_p1LiqRatio, _col),
                            _rmul(_p1LiqRatio, _rmul(_p2LiqRatio, _bor))
                        ),
                        _sub(_p1LiqRatio, _p2LiqRatio)
                    )
                )
            );
    }

    /// Computation in wad
    /// @notice return the amount of collateral we need to withdraw during the debt refinancing in wad standard.
    /// @param _p1LiqRatio the liquidation ratio of protocol 1.
    /// @param _p2LiqRatio the liquidation ratio of protocol 2.
    /// @param _col token1 collateral to put on protocol 1.
    /// @param _bor amount of borrowed token2 on protocol 1.
    /// @param _colPrice price of the collateral.
    /// @return collateral to withdraw in wad standard
    function _wcollateralToWithdraw(
        uint256 _p1LiqRatio,
        uint256 _p2LiqRatio,
        uint256 _col,
        uint256 _bor,
        uint256 _colPrice
    ) internal pure returns (uint256) {
        return
            _wdiv(
                _sub(
                    _col,
                    _wdiv(
                        _sub(
                            _wmul(_p1LiqRatio, _col),
                            _wmul(_p1LiqRatio, _wmul(_p2LiqRatio, _bor))
                        ),
                        _sub(_p1LiqRatio, _p2LiqRatio)
                    )
                ),
                _colPrice
            );
    }

    /// Computation in wad
    /// @notice return the amount of borrowed token we need to payback during the debt refinancing in wad standard.
    /// @param _p1LiqRatio the liquidation ratio of protocol 1.
    /// @param _p2LiqRatio the liquidation ratio of protocol 2.
    /// @param _col token1 collateral to put on protocol 1.
    /// @param _bor amount of borrowed token2 on protocol 1.
    /// @return amount of borrowed token to pay back in wad standard
    function _wborrowedTokenToPayback(
        uint256 _p1LiqRatio,
        uint256 _p2LiqRatio,
        uint256 _col,
        uint256 _bor
    ) internal pure returns (uint256) {
        return
            _sub(
                _bor,
                _wmul(
                    _wdiv(1e18, _p1LiqRatio),
                    _wdiv(
                        _sub(
                            _wmul(_p1LiqRatio, _col),
                            _wmul(_p1LiqRatio, _wmul(_p2LiqRatio, _bor))
                        ),
                        _sub(_p1LiqRatio, _p2LiqRatio)
                    )
                )
            );
    }
}
