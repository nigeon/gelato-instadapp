// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.4;

import {IManager} from "../../interfaces/Maker/IManager.sol";
import {IVat} from "../../interfaces/Maker/IVat.sol";
import {RAY, sub, mul} from "../../vendor/DSMath.sol";

function _getMcdManager() pure returns (address) {
    return 0x5ef30b9986345249bc32d8928B7ee64DE9435E39;
}

function _getManager() pure returns (IManager) {
    return IManager(_getMcdManager());
}

function _getMakerVaultDebt(uint256 _vaultId) view returns (uint256 wad) {
    IManager cdpManager = _getManager();

    (bytes32 ilk, address urn) = _getVaultData(cdpManager, _vaultId);
    IVat vat = IVat(cdpManager.vat());
    (, uint256 rate, , , ) = vat.ilks(ilk);
    (, uint256 art) = vat.urns(ilk, urn);
    uint256 dai = vat.dai(urn);

    uint256 rad = sub(mul(art, rate), dai);
    wad = rad / RAY;

    wad = mul(wad, RAY) < rad ? wad + 1 : wad;
}

function _getMakerVaultCollateralBalance(uint256 _vaultId)
    view
    returns (uint256)
{
    IManager cdpManager = _getManager();

    IVat vat = IVat(cdpManager.vat());
    (bytes32 ilk, address urn) = _getVaultData(cdpManager, _vaultId);
    (uint256 ink, ) = vat.urns(ilk, urn);

    return ink;
}

function _getVaultData(IManager cdpManager, uint256 vault)
    view
    returns (bytes32 ilk, address urn)
{
    ilk = cdpManager.ilks(vault);
    urn = cdpManager.urns(vault);
}
