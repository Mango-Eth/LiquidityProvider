// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./interfaces/IUniswapV3Pool.sol";
import "./interfaces/IERC20.sol";
import "./libraries/TickMath.sol";


contract SwapRouter {   // Needs approval from user.

    function swap(
        address _recipient,
        bool _direction,
        int256 _amount,
        uint160 _priceLimit,
        address[] calldata pools,
        address pool
    ) public returns(int256 amount0, int256 amount1){
        bytes memory data = abi.encode(pools, _recipient);

        (amount0, amount1)= IUniswapV3Pool(pool).swap(
            _recipient,
            _direction,
            _amount,
            _priceLimit,
            data
        );
    }

    // TBD.
    function multiPoolArray(uint8 length, address[] calldata _pools) public pure returns(address[] memory pool){
        require(length == _pools.length, "Oof");
        address[] memory blob = new address[](length);
        for(uint i; i < length; i++){
            blob[i] = _pools[i];
        }
        pool = blob;
    }






    // View:
    function returnLowestSqrt() public pure returns(uint160){
        return 4295128739 + 1;
    }

    function returnHighestSqrt() public pure returns(uint160){
        return 1461446703485210103287273052203988822378723970342 - 1;
    }


    // Callback:
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) public {
        // emit SwapCallback(amount0Delta, amount1Delta);

        (address[] memory pools, address payer) = abi.decode(data, (address[], address));

        if (pools.length == 1) {
            // get the address and amount of the token that we need to pay
            address tokenToBePaid =
                amount0Delta > 0 ? IUniswapV3Pool(msg.sender).token0() : IUniswapV3Pool(msg.sender).token1();
            int256 amountToBePaid = amount0Delta > 0 ? amount0Delta : amount1Delta;

            bool zeroForOne = tokenToBePaid == IUniswapV3Pool(pools[0]).token1();
            IUniswapV3Pool(pools[0]).swap(
                msg.sender,
                zeroForOne,
                -amountToBePaid,
                zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1,
                abi.encode(new address[](0), payer)
            );
        } else {
            if (amount0Delta > 0) {
                IERC20_(IUniswapV3Pool(msg.sender).token0()).transferFrom(
                    payer,
                    msg.sender,
                    uint256(amount0Delta)
                );
            } else {
                IERC20_(IUniswapV3Pool(msg.sender).token1()).transferFrom(
                    payer,
                    msg.sender,
                    uint256(amount1Delta)
                );
            }
        }
    }
}