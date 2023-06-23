// SPDX-License-Identifier: BUILT BY MANGO
pragma solidity ^0.8.9;

// Interfaces:
import "./interfaces/IUniswapV3Pool.sol";
import "./interfaces/INonFungiblePositionManager.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ILiquidityProvision.sol";
import "./interfaces/ISwapRouter.sol";

// Libraries:
import "./libraries/Math.sol";
import "./libraries/LiquidityMath.sol";
import "./libraries/TickMath.sol";

contract PM_Rebase is ILiquidityProvision {

    address immutable public burner;
    uint256 public counter;     
    // mapping(uint256 => Position) public positions;
    mapping(uint256 => uint256) public ids;
    mapping(uint256 => Amounts) public amounts_;

    constructor(address _burner) {
        burner = _burner;
    }

    function provision(
        Params calldata params
    ) external  {  
        //Getting token0 & token1:
        address token0;
        address token1;
        int24 tickLower;
        int24 tickUpper;
        // For accounting:
        uint256 amount0_prior;
        uint256 amount1_prior;
        {
            token0= IUniswapV3Pool(params.pool).token0();
            token1 = IUniswapV3Pool(params.pool).token1();

            // Approving Manager to spend:
            amount0_prior = IERC20_(token0).balanceOf(msg.sender);
            amount1_prior = IERC20_(token1).balanceOf(msg.sender);
            IERC20_(token0).approve(params.manager, params.amount0);            // This needs to be changed. Should approve amounts that 
            IERC20_(token1).approve(params.manager, params.amount1);            // Were estimated by _amounts(). Not a fix value 

            // Getting slot0.tick:
            (uint160 sqrtPriceX96 ,int24 slot0_tick,,,,,) = IUniswapV3Pool(params.pool).slot0();

            // Getting ticks:
            (tickLower, tickUpper) = ticks(params.tickSpacing, slot0_tick);

            // Simulate deposit:
            (int256 amountIn0, int256 amountIn1) = _amounts(LiquidityParams({
                sqrtPriceX96: sqrtPriceX96,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0: params.amount0,
                amount1: params.amount1
            }));

        // Liquidity provision:
        (uint256 tokenId,,,) = INonFungiblePositionManager(params.manager).mint(
            INonFungiblePositionManager.MintParams({
                    token0: token0,
                    token1: token1,
                    fee: params.fee,
                    tickLower: tickLower,
                    tickUpper: tickUpper,
                    amount0Desired: uint256(amountIn0),
                    amount1Desired: uint256(amountIn1),
                    amount0Min: uint256(amountIn0) - (uint256(amountIn0) / 50), // 2% slippage
                    amount1Min: uint256(amountIn1) - (uint256(amountIn1) / 50),
                    recipient: address(this),
                    deadline: block.timestamp + 300
                }));
                ids[counter] = tokenId;
                amounts_[counter] = Amounts({
                    amount0: uint256(amountIn0),
                    amount1: uint256(amountIn1)
                });
        }

        
        // uint256 finalBalance0 = IERC20_(token0).balanceOf(msg.sender);
        // uint256 finalBalance1 = IERC20_(token1).balanceOf(msg.sender);
        // spent_amount0 = amount0_prior - finalBalance0;
        // spent_amount1 = amount1_prior - finalBalance1;

        // Storing position:
        // positions[counter] = Position({
        //     deployer: params.manager,
        //     tickLower: tickLower,
        //     tickUpper: tickUpper
        // });
        counter++;

        // // Sending funds to manager/should be address(0), to always have 0 tokens:
        // IERC20_(token0).transfer(manager, IERC20_(token0).balanceOf(address(this)));
        // IERC20_(token1).transfer(manager, IERC20_(token1).balanceOf(address(this)));
        
        // require(IERC20_(token0).balanceOf(address(this)) == 0 && IERC20_(token1).balanceOf(address(this)) == 0, "Balance isnt 0.");
    }

    function brn_Swap_Mnt(
        Rebase calldata params
    ) external {
        address token0 = IUniswapV3Pool(params.pool).token0();
        address token1 = IUniswapV3Pool(params.pool).token1();
        // Getting rid of tokens:
        zero_tkn(token0, token1);

        // Burning position:
        _burn_v3(params.manager, params.pool, params.cntr);

        // Swapping remaining token from previouly crossed range:
        _swap(
            params.zer ? token0 : token1,
            params.swapRouter,
            params.zer,
            params.pool
        );

        // Minting new pos:
        _mint(Rebase_prov({
            token0: token0,
            token1: token1,
            manager: params.manager,
            pool: params.pool,
            fee: params.fee,
            tickSpacing: params.tickSpacing
        }));
    }

    ////////////////////////////// MAKE ALL INTERNAL
    // Methods:
    function _mint(
        Rebase_prov memory params
    ) public {   // Should recylce this function for provision()
        int24 tickLower;
        int24 tickUpper;
        uint256 _amountIn0;
        uint256 _amountIn1;
        {
            // Getting slot0.tick:
            (uint160 sqrtPriceX96 ,int24 slot0_tick,,,,,) = IUniswapV3Pool(params.pool).slot0();

            _amountIn0 = IERC20_(params.token0).balanceOf(address(this));
            _amountIn1 = IERC20_(params.token1).balanceOf(address(this));
            IERC20_(params.token0).approve(params.manager, _amountIn0);
            IERC20_(params.token1).approve(params.manager, _amountIn1);

            // Getting ticks:
            (tickLower, tickUpper) = ticks(params.tickSpacing, slot0_tick);

            // Simulate deposit:
            (int256 amountIn0, int256 amountIn1) = _amounts(LiquidityParams({
                sqrtPriceX96: sqrtPriceX96,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0: _amountIn0,
                amount1: _amountIn1
            }));

        // Liquidity provision:
        (uint256 tokenId,,,) = INonFungiblePositionManager(params.manager).mint(
            INonFungiblePositionManager.MintParams({
                    token0: params.token0,
                    token1: params.token1,
                    fee: params.fee,
                    tickLower: tickLower,
                    tickUpper: tickUpper,
                    amount0Desired: uint256(amountIn0),
                    amount1Desired: uint256(amountIn1),
                    amount0Min: uint256(amountIn0) - (uint256(amountIn0) / 50), // 2% slippage
                    amount1Min: uint256(amountIn1) - (uint256(amountIn1) / 50),
                    recipient: msg.sender,
                    deadline: block.timestamp + 300
                }));
                ids[counter] = tokenId;
                // Storing position:
                // positions[counter] = Position({
                //     deployer: params.manager,
                //     tickLower: tickLower,
                //     tickUpper: tickUpper
                // });
                amounts_[counter] = Amounts({
                    amount0: uint256(amountIn0),
                    amount1: uint256(amountIn1)
                });
                counter++;
        }
    }

    function _swap(address token, address swapRouter, bool dir, address pool) public {          // NEEDS SLIPPAGE PROTECTION
            uint160 slippage = dir ? 4295128739 + 1 : 1461446703485210103287273052203988822378723970342 - 1;
            uint256 balanceAfter_brn = IERC20_(token).balanceOf(address(this));
            uint256 amountIn = balanceAfter_brn / 2;
            {
                IERC20_(token).approve(swapRouter, amountIn);
            ISwapRouter(swapRouter).swap(
                address(this),
                dir,
                int256(amountIn),
                slippage,
                new address[](0),
                pool
            );
            }
    }


    function _burn_v3(address manager, address pool, uint256 _counter) public returns(int256 amountIn0, int256 amountIn1){

        // Position memory pos = positions[_counter];
        // (uint128 liquidity,,,,) = IUniswapV3Pool(pool).positions(keccak256(abi.encodePacked(pos.deployer, pos.tickLower, pos.tickUpper)));

        (,,,,,int24 tickLower, int24 tickUpper,uint128 liquidity,,,,) = INonFungiblePositionManager(manager).positions(ids[_counter]);

        // Should be recycled!!
        Amounts memory _val = amounts_[_counter];
        (uint160 sqrtPriceX96 ,,,,,,) = IUniswapV3Pool(pool).slot0();

        (amountIn0, amountIn1) = _amounts(LiquidityParams({ // Very inneficient should pull up the liquidity from either v3 or _id and slot0.sqrtP then find the amounts & from there /50 to make a 2% slippage. TBD
            sqrtPriceX96: sqrtPriceX96,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0: _val.amount0,
            amount1: _val.amount1
        }));

        INonFungiblePositionManager(manager).decreaseLiquidity(INonFungiblePositionManager.DecreaseLiquidityParams({
            tokenId: ids[_counter],
            liquidity: liquidity,
            // amount0Min: amountIn0 > 0 ? uint256(amountIn0 - (amountIn0 / 5)) : 0,
            // amount1Min: amountIn1 > 0 ? uint256(amountIn1 - (amountIn1 / 5)) : 0,    // ONE SIDE ISNT 0 AHHHHHHHHH
            amount0Min: 0,
            amount1Min: 0,
            deadline: block.timestamp + 300
        }));

        INonFungiblePositionManager(manager).collect(INonFungiblePositionManager.CollectParams({
            tokenId: ids[_counter],
            recipient: address(this),
            amount0Max: 2**128 -1,
            amount1Max: 2**128 -1
        })

        );
    }

    function zero_tkn(address _tkn0, address _tkn1) internal {
        IERC20_(_tkn0).transfer(burner, IERC20_(_tkn0).balanceOf(address(this)));
        IERC20_(_tkn1).transfer(burner, IERC20_(_tkn1).balanceOf(address(this)));
    }

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

                if(diff >= 20) {        // NEEDS TINKERING --- Making the threshold larger allows more token0 input & less token1 i think. Needs testing.

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

    function _amounts(
        LiquidityParams memory params
    ) public pure returns(int256 amount0, int256 amount1) {
            uint160 lower_sqrt = TickMath.getSqrtRatioAtTick(params.tickLower);
            uint160 upper_sqrt = TickMath.getSqrtRatioAtTick(params.tickUpper);
        uint128 _liquidity = LiquidityMath.getLiquidityForAmounts(
            params.sqrtPriceX96,
            lower_sqrt,
            upper_sqrt,
            params.amount0,
            params.amount1
        );

        amount0 = Math._calcAmount0Delta(
            params.sqrtPriceX96,
            upper_sqrt,
            int128(_liquidity)
        );

        amount1 = Math._calcAmount1Delta(
            params.sqrtPriceX96,
            lower_sqrt,
            int128(_liquidity)
        );
    }
}