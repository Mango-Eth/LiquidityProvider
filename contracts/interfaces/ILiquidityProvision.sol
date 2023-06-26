
// SPDX-License-Identifier: BUILT BY MANGO
pragma solidity ^0.8.9;

interface ILiquidityProvision {

    struct Amounts {
        uint256 amount0;
        uint256 amount1;
    }

    struct Position {
        address deployer;
        int24 tickLower;
        int24 tickUpper;
    }   

    struct Params {
        address pool;
        address manager;
        uint256 amount0;
        uint256 amount1;
        uint24 fee;
        uint24 tickSpacing;
        bool zer;
    }

    struct Rebase {
        address pool;
        address manager;
        address swapRouter;
        uint256 cntr;
        bool zer;           // Direction
        uint24 fee;
        uint24 tickSpacing;
    }

    struct Rebase_prov {
        address token0;
        address token1;
        address manager;
        address pool;
        uint24 fee;
        uint24 tickSpacing;
        bool zer;
    }

    struct LiquidityParams {
        uint160 sqrtPriceX96;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0;
        uint256 amount1;
    }

    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }

    struct Info {
        // the amount of liquidity owned by this position
        uint128 liquidity;
        // fee growth per unit of liquidity as of the last update to liquidity or fees owed
        uint256 feeGrowthInside0LastX128;
        uint256 feeGrowthInside1LastX128;
        // the fees owed to the position owner in token0/token1
        uint128 tokensOwed0;
        uint128 tokensOwed1;
    }








    function provision(
        Params calldata params
    ) external;

    function roundTick_dir(int24 tick, uint24 tickSpacing) external pure returns (int24 closest_tick, bool wasRoundedUp, int24 diff);
    
    function ticks(
                uint24 tickSpacing,
                int24 slot0_tick
            ) external pure returns(int24 lowerTick, int24 upperTick);

}