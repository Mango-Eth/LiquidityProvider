// SPDX-License-Identifier: BUILT by Mango
pragma solidity ^0.8.9;

import "./interfaces/IUniswapV3Pool.sol";
import "./interfaces/IERC20.sol";
import "./libraries/TickMath.sol";
import "./libraries/ABDKMath64x64.sol";
import "./libraries/LiquidityMath.sol";
import "./libraries/Math.sol";


contract SwapRouter {   // Needs approval from user.


    struct Estimate_Params {
            uint160 sqrtPriceX96;
            int24 tickLower;
            int24 tickUpper;
            uint128 liquidity;
        }

    uint8 internal constant RESOLUTION = 96;
    uint256 internal constant Q96 = 2**96;

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

        function _q96(               // Calculates the sqrtP regardless of token0 or token1.
        bool _zeroForOne,       
        int256 rate
    ) public pure returns(uint160 fn) {             // This function requires that the softCap needs to be atleast 1 bnb.
        if(_zeroForOne){    // rate/ETHERAMOUNT = price. 
            fn = _sqrtP(ABDKMath64x64.fromInt(rate));   // Remember that the rate is the sqrtP. Its a possitive value if weth is 0. Because we do: token/weth. Which is nothing else than: (weth*ratio)/weth.
        } else {    // ETHERAMOUNT// rate
            // Because token is 0 now. The division is like this: weth/token or weth/(weth*ratio) making the result a decimal and into negative ticks.
            // This side is just 1/ratio.
            int128 num = 1 << 64; 
            int128 den = ABDKMath64x64.fromInt(rate);
            int128 finalValue = ABDKMath64x64.div(num, den);
            fn = _sqrtP(finalValue);
        }
    }


    function _sqrtP(int128 val) internal pure returns(uint160) {
        return
            uint160(
                int160(
                    ABDKMath64x64.sqrt(int128(val)) <<
                        (RESOLUTION - 64)
                )
            );
    }

    function _time() public view returns(uint256) {
        return block.timestamp;
    }

    function roundTick(int24 tick, uint24 tickSpacing) public pure returns (int24) {
        int24 halfSpacing = int24(tickSpacing) / 2;
        if (tick >= 0) {
            return int24(((tick + halfSpacing) / int24(tickSpacing)) * int24(tickSpacing));
        } else {
            return int24(((tick - halfSpacing) / int24(tickSpacing)) * int24(tickSpacing));
        }
    }

    function estimate(
        Estimate_Params memory params
    ) public pure returns(int256 amount0, int256 amount1) {
            uint160 lower_sqrt = TickMath.getSqrtRatioAtTick(params.tickLower);
            uint160 upper_sqrt = TickMath.getSqrtRatioAtTick(params.tickUpper);


        amount0 = Math._calcAmount0Delta(
            params.sqrtPriceX96,
            upper_sqrt,
            int128(params.liquidity)
        );

        amount1 = Math._calcAmount1Delta(
            params.sqrtPriceX96,
            lower_sqrt,
            int128(params.liquidity)
        );
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