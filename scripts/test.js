const hre = require("hardhat");
const IERC20 = require("../artifacts/contracts/interfaces/IERC20.sol/IERC20_.json");
const _Manager = require("../artifacts/contracts/interfaces/INonFungiblePositionManager.sol/INonFungiblePositionManager.json");
const _v3 = require("../artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");
const _Prov = require("../artifacts/contracts/PMS_Rebase.sol/PMS_Rebase.json");
const _Swap = require("../artifacts/contracts/Swapper.sol/SwapRouter.json");
const { ethers, Wallet } = require("ethers");

var url = "https://rpc.testnet.fantom.network"; 
var customHttpProvider = new ethers.providers.JsonRpcProvider(url);
const wallet = new Wallet("0x62f4dc4ba82c03a2d9c040ad31d15cfa90c7e0114cf4c3eddbe9c68ca591e8b4", customHttpProvider);

const weth = "0x7740954B5E962F3BF1a79b60b83e4675700f70D3";
const mango = "0x9B021B66dE135c5273de2145FEF6C21703155A56";
const manager = "0x54B9C3D4c9761601D738beE666bc31D81C437Df1";
const pool = "0xc366baC79689773Dda1f02A1DF74B2FA15EC602e";      // WETH_0 - Mango_1
let caller = "0xAe4CfFcF8A14EfD0366190c0373e6b1336226091";
const LiquidityProvider = "0x03814606d9e558Ac3CADcfcd917b1717f9b13d62";

const wethRouter = new ethers.Contract(weth, IERC20.abi, wallet);
const mangoRouter = new ethers.Contract(mango, IERC20.abi, wallet);
const poolRouter = new ethers.Contract(pool, _v3.abi, wallet);
const managerRouter = new ethers.Contract(manager, _Manager.abi, wallet);
const providerRouter = new ethers.Contract(LiquidityProvider, _Prov.abi, wallet);

async function main() {
    ////////////////////////////////////////////////
    // Swap that pushes price outside of position
    // For this to work. 
    // Deploy new PMS_Rebase
    // call liquidity.js
    // call test.js -> to test with the same PMS you need to change _counter.
    ////////////////////////////////////////////////

    // Deploy SwapRouter contract:
    const _SwapRouter = await hre.ethers.getContractFactory("SwapRouter");
    const _swapRouter = await _SwapRouter.deploy();

    await _swapRouter.deployed()
    .then(() => console.log("SwapRouter:" ,_swapRouter.address));
    let swapper = _swapRouter.address;

    // Getting the actual price of mango:
    const slot = await poolRouter.slot0();
    const sqrtPriceX96 = slot.sqrtPriceX96;
    let priceRatio = (sqrtPriceX96 / 2**96) ** 2;
    console.log("MangoPrice:", priceRatio);

    const tick = slot.tick;

    // Checking on range:
    const range = await providerRouter.ticks(60, tick);
    console.log(range);

    const wut = await providerRouter.roundTick_dir(tick, 60);
    console.log(wut);

    // Estimate test:
    const counter = await providerRouter.counter();

    let amount0 = ethers.utils.parseEther("1");
    let amount1 = ethers.utils.parseEther(priceRatio.toString());

    let liquidityParams = {
        sqrtPriceX96: slot.sqrtPriceX96,
        tickLower: range[0],
        tickUpper: range[1],
        amount0: amount0,
        amount1: amount1
    }
    console.log(liquidityParams);

    const getL = await providerRouter._amounts(liquidityParams);
    console.log(ethers.utils.formatUnits(getL[0]), ethers.utils.formatUnits(getL[1]));
    // Estimating works!

    // Trying Brn
    let _counter = 0;
    const getting_id = await providerRouter.ids(_counter);
    console.log(getting_id);

    const _data = await managerRouter.positions(getting_id);
    console.log(_data);

    // // Debugging liquidity value:
    // const liq_ = await providerRouter.debug(pool, _counter);
    // console.log(liq_.toString());
    // const lowerTick = await providerRouter.debug_low(_counter);
    // const upperTick = await providerRouter.debug_upper(_counter);
    // console.log(lowerTick, upperTick);
    // const id = await providerRouter.debug_id(_counter);
    // console.log(id.toString());

    // // Debugging burn function:
    // const brn = await providerRouter.burn_v33(manager, getting_id, 1544317650789934446978n);
    // await brn.wait();
    // console.log("Success");

    // const approvingId2 = await managerRouter.approve(caller, getting_id);
    // await approvingId2.wait();

    console.log("About to burn");
    const burning = await providerRouter._burn_v3(manager, pool, _counter);
    await burning.wait();
    console.log("Success");

    // Trying swap half:
    let params_swap = {
        pool:  pool,
        manager: manager,
        swapRouter: swapper,
        id: getting_id,
        zer: true ,          
        fee: 3000,
        tickSpacing: 60
    }
    console.log(params_swap);

    const balance0 = await wethRouter.balanceOf(LiquidityProvider);
    const balance1 = await mangoRouter.balanceOf(LiquidityProvider);
    console.log(ethers.utils.formatUnits(balance0), ethers.utils.formatUnits(balance1));

    // Trying swap:
    const swapping = await providerRouter._swap(
            weth,
            swapper,
            true,
            pool
    );
        await swapping.wait();

        const balance00 = await wethRouter.balanceOf(LiquidityProvider);
        const balance11 = await mangoRouter.balanceOf(LiquidityProvider);
        console.log(ethers.utils.formatUnits(balance00), ethers.utils.formatUnits(balance11));
        // Works!

    
    // // Trying to mint:
    // let mintParam = {
    //     token0: weth,
    //     token1: mango,
    //     manager: manager,
    //     pool: pool,
    //     fee: 3000,
    //     tickSpacing: 60
    // }

    // const minze = await providerRouter._mint(mintParam);
    // await minze.wait();
    // console.log("Sucess");
    // // Works
}


console.log("wart schnell...")
main().catch((error) => {
console.error(error);
process.exitCode = 1;
});