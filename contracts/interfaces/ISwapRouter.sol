// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

interface ISwapRouter {

function swap(
        address _recipient,
        bool _direction,
        int256 _amount,
        uint160 _priceLimit,
        address[] calldata pools,
        address pool
    ) external returns(int256 amount0, int256 amount1);


}

    