// "SPDX-License-Identifier: UNLICENSED"
pragma solidity 0.6.12;

contract DSMath {
    function _add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x + y) >= x, "ds-math-_add-overflow");
    }

    function _sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x - y) <= x, "ds-math-_sub-underflow");
    }

    function _mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x, "ds-math-_mul-overflow");
    }

    function _min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        return x <= y ? x : y;
    }

    function _max(uint256 x, uint256 y) internal pure returns (uint256 z) {
        return x >= y ? x : y;
    }

    function _imin(int256 x, int256 y) internal pure returns (int256 z) {
        return x <= y ? x : y;
    }

    function _imax(int256 x, int256 y) internal pure returns (int256 z) {
        return x >= y ? x : y;
    }

    uint256 internal constant _WAD = 10**18;
    uint256 internal constant _RAY = 10**27;

    //rounds to zero if x*y < _WAD / 2
    function _wmul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = _add(_mul(x, y), _WAD / 2) / _WAD;
    }

    //rounds to zero if x*y < _WAD / 2
    function _rmul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = _add(_mul(x, y), _RAY / 2) / _RAY;
    }

    //rounds to zero if x*y < _WAD / 2
    function _wdiv(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = _add(_mul(x, _WAD), y / 2) / y;
    }

    //rounds to zero if x*y < _RAY / 2
    function _rdiv(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = _add(_mul(x, _RAY), y / 2) / y;
    }

    // This famous algorithm is called "exponentiation by squaring"
    // and calculates x^n with x as fixed-point and n as regular unsigned.
    //
    // It's O(log n), instead of O(n) for naive repeated _multiplication.
    //
    // These facts are why it works:
    //
    //  If n is even, then x^n = (x^2)^(n/2).
    //  If n is odd,  then x^n = x * x^(n-1),
    //   and applying the equation for even x gives
    //    x^n = x * (x^2)^((n-1) / 2).
    //
    //  Also, EVM division is flooring and
    //    floor[(n-1) / 2] = floor[n / 2].
    //
    function _rpow(uint256 x, uint256 n) internal pure returns (uint256 z) {
        z = n % 2 != 0 ? x : _RAY;

        for (n /= 2; n != 0; n /= 2) {
            x = _rmul(x, x);

            if (n % 2 != 0) {
                z = _rmul(z, x);
            }
        }
    }
}
