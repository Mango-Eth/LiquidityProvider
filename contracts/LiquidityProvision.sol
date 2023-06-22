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


    // Methods:
    function ticks(
        uint24 tickSpacing,
        int24 slot0_tick
    ) internal pure returns(int24 lowerTick, int24 upperTick) {
        // Lets get 3 ticks separating the current price on each side:
            lowerTick = (roundTick(slot0_tick, tickSpacing) - (3 * int24(tickSpacing)));
            upperTick = (roundTick(slot0_tick, tickSpacing) + (3 * int24(tickSpacing)));
    }

    // Gets tick in correct tickSpacing:
    function roundTick(int24 tick, uint24 tickSpacing) internal pure returns (int24) {
        int24 roundedTick = (tick / int24(tickSpacing)) * int24(tickSpacing);
        if (tick < 0 && tick % int24(tickSpacing) != 0) {
            roundedTick -= int24(tickSpacing);
        }
        return roundedTick;
    }
}