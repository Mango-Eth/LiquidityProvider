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
const LiquidityProvider = "0x47a9aD306219Ff7a2D6BBa858C128bFfF3ACb14B";

const wethRouter = new ethers.Contract(weth, IERC20.abi, wallet);
const mangoRouter = new ethers.Contract(mango, IERC20.abi, wallet);
const poolRouter = new ethers.Contract(pool, _v3.abi, wallet);
const managerRouter = new ethers.Contract(manager, _Manager.abi, wallet);
const providerRouter = new ethers.Contract(LiquidityProvider, _Prov.abi, wallet);

async function main() {

     // Deploy SwapRouter contract:
    const _SwapRouter = await hre.ethers.getContractFactory("SwapRouter");
    const _swapRouter = await _SwapRouter.deploy();

    await _swapRouter.deployed()
    .then(() => console.log("SwapRouter:" ,_swapRouter.address));
    let swapper = _swapRouter.address;

//     // Trying swap:
//     const swapping = await providerRouter._swap(
//         weth,
//         swapper,
//         true,
//         pool
// );
//     await swapping.wait();

//     const balance0 = await wethRouter.balanceOf(LiquidityProvider);
//     const balance1 = await mangoRouter.balanceOf(LiquidityProvider);
//     console.log(ethers.utils.formatUnits(balance0), ethers.utils.formatUnits(balance1));

//     // Trying to mint:
//     let mintParam = {
//         token0: weth,
//         token1: mango,
//         manager: manager,
//         pool: pool,
//         fee: 3000,
//         tickSpacing: 60
//     }

//     const minze = await providerRouter._mint(mintParam);
//     await minze.wait();
//     console.log("Sucess");

//     const balance00 = await wethRouter.balanceOf(LiquidityProvider);
//     const balance11 = await mangoRouter.balanceOf(LiquidityProvider);
//     console.log(ethers.utils.formatUnits(balance00), ethers.utils.formatUnits(balance11));


    // Testing brn_Swap_Mnt:
    let _counter = 0;
    let rebaseParams = {
        pool: pool,
        manager: manager,
        swapRouter: swapper,
        cntr: _counter,
        bool: true,                 // POSITION IS ALL IN ETH.
        fee: 3000,
        tickSpacing: 60
    }

    const _doItAll = await providerRouter.brn_Swap_Mnt(rebaseParams);
    await _doItAll.wait();

}


console.log("wart schnell...")
main().catch((error) => {
console.error(error);
process.exitCode = 1;
});