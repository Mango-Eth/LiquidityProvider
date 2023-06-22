// SPDX-License-Identifier: BUILT BY MANGO
pragma solidity ^0.8.9;

// Interfaces:
import "./interfaces/IUniswapV3Pool.sol";
import "./interfaces/INonFungiblePositionManager.sol";
import "./interfaces/IERC20.sol";

contract LiquidityProvision {

    function provision(
        address pool,
        address manager,
        uint256 amount0,
        uint256 amount1,
        uint24 fee,
        uint24 tickSpacing
    ) external returns(uint256 spent_amount0, uint256 spent_amount1) {  
        //Getting token0 & token1:
        address token0;
        address token1;
        int24 tickLower;
        int24 tickUpper;
        // For accounting:
        uint256 amount0_prior;
        uint256 amount1_prior;
        {
            token0= IUniswapV3Pool(pool).token0();
            token1 = IUniswapV3Pool(pool).token1();

            // Approving Manager to spend:
            amount0_prior = IERC20_(token0).balanceOf(msg.sender);
            amount1_prior = IERC20_(token1).balanceOf(msg.sender);
            IERC20_(token0).approve(manager, amount0);
            IERC20_(token1).approve(manager, amount1);

            // Getting slot0.tick:
            (,int24 slot0_tick,,,,,) = IUniswapV3Pool(pool).slot0();

            // Getting ticks:
            (tickLower, tickUpper) = ticks(tickSpacing, slot0_tick);
        }

        // Liquidity provision:
        INonFungiblePositionManager(manager).mint(
            INonFungiblePositionManager.MintParams({
                    token0: token0,
                    token1: token1,
                    fee: fee,
                    tickLower: tickLower,
                    tickUpper: tickUpper,
                    amount0Desired: amount0,
                    amount1Desired: amount1,
                    amount0Min: 0,
                    amount1Min: 0,
                    recipient: msg.sender,
                    deadline: block.timestamp + 300
                }));

        uint256 finalBalance0 = IERC20_(token0).balanceOf(msg.sender);
        uint256 finalBalance1 = IERC20_(token1).balanceOf(msg.sender);
        spent_amount0= amount0_prior - finalBalance0;
        spent_amount1 = amount1_prior - finalBalance1;
    }



    // // Methods:
    // function ticks(
    //     uint24 tickSpacing,
    //     int24 slot0_tick
    // ) public pure returns(int24 lowerTick, int24 upperTick) {
    //     (int24 closest_tick, bool zer) = roundTick(slot0_tick, tickSpacing);

    //     if(zer) {   // Means raw tick is closest to perfect tick above it. (LowerTick * 1 space, UpperTick * 2 spaces)
    //         lowerTick = closest_tick - (3 * int24(tickSpacing));
    //         upperTick = closest_tick + (5 * int24(tickSpacing));
    //     } else {    // Raw tick roundsDOWN. (LowerTick * 2 spaces, UpperTick * 1 space)
    //         lowerTick = closest_tick - (5 * int24(tickSpacing));
    //         upperTick = closest_tick + (3 * int24(tickSpacing));
    //     }
    // }

    //     function roundTick(int24 tick, uint24 tickSpacing) public pure returns (int24 closest_tick, bool zer) {
    //         int24 plus_1 = int24(tickSpacing) / 2;
            
    //         if (tick >= 0) {
    //             closest_tick = int24(((tick + plus_1) / int24(tickSpacing)) * int24(tickSpacing));
    //             zer = closest_tick > tick;
    //         } else {
    //             closest_tick = int24(((tick - plus_1) / int24(tickSpacing)) * int24(tickSpacing));
    //             zer = closest_tick < tick;
    //         }
    //     }

    // Methods:
            function roundTick_dir(int24 tick, uint24 tickSpacing) public pure returns (int24 closest_tick, bool wasRoundedUp, int24 diff) {
                int24 plus_1 = int24(tickSpacing) / 2;

                if (tick >= 0) {
                    closest_tick = int24(((tick + plus_1 + 1) / int24(tickSpacing)) * int24(tickSpacing));
                    wasRoundedUp = closest_tick > tick;
                    diff = closest_tick - tick;
                } else {
                    closest_tick = int24(((tick - plus_1 - 1) / int24(tickSpacing)) * int24(tickSpacing));
                    wasRoundedUp = closest_tick < tick;
                    diff = tick - closest_tick;
                }

                // Always pos
                if (diff < 0) {
                    diff = -diff;
                }
            }

            function ticks(
                uint24 tickSpacing,
                int24 slot0_tick
            ) public pure returns(int24 lowerTick, int24 upperTick) {
                (int24 closest_tick, bool zer, int24 diff) = roundTick_dir(slot0_tick, tickSpacing);

                if(diff > 39) {
                if(zer) {   // Means raw tick is closest to perfect tick above it. (LowerTick * 1 space, UpperTick * 2 spaces)
                    lowerTick = closest_tick - (3 * int24(tickSpacing));
                    upperTick = closest_tick + (2 * int24(tickSpacing));
                } else {    // Raw tick roundsDOWN. (LowerTick * 2 spaces, UpperTick * 1 space)
                    lowerTick = closest_tick - (2 * int24(tickSpacing));
                    upperTick = closest_tick + (3 * int24(tickSpacing));
                }
                } else {
                    // Here the raw tick is close enough to simply add and subtract 3 times for range.
                    lowerTick = closest_tick - (3 * int24(tickSpacing));
                    upperTick = closest_tick + (3 * int24(tickSpacing));
                }
            }
        
}