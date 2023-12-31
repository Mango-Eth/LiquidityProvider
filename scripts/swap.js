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
const LiquidityProvider = "0x05ac42Ec8a006BfD1Eb29d128ED26df439fC547a";

const wethRouter = new ethers.Contract(weth, IERC20.abi, wallet);
const mangoRouter = new ethers.Contract(mango, IERC20.abi, wallet);
const poolRouter = new ethers.Contract(pool, _v3.abi, wallet);
const managerRouter = new ethers.Contract(manager, _Manager.abi, wallet);
const providerRouter = new ethers.Contract(LiquidityProvider, _Prov.abi, wallet);


async function main() {

    // For accounting:
    const provBalance1 = await mangoRouter.balanceOf(caller);
    const provBalance0 = await wethRouter.balanceOf(caller);

    // Deploy SwapRouter contract:
    const SwapRouter = await hre.ethers.getContractFactory("SwapRouter");
    const swapRouter = await SwapRouter.deploy();

    await swapRouter.deployed()
    .then(() => console.log("SwapRouter:" ,swapRouter.address));
    let swapper = swapRouter.address;

    // Making swapRouter:
    const sRouter = new ethers.Contract(swapper, _Swap.abi, wallet);

    const lowestSqrt = await sRouter.returnLowestSqrt();
    const highestSqrt = await sRouter.returnHighestSqrt();

    // Approving ETH:
    const amountEth = ethers.utils.parseEther("1000");
    const approveEth = await wethRouter.approve(swapRouter.address, amountEth);
    await approveEth.wait();

    // Swap ETH_In:
    const swapEthIn = await sRouter.swap(
        caller,
        true,               
        amountEth,
        lowestSqrt,
        [],
        pool
    );
    await swapEthIn.wait();
    console.log("Success");


    // // Approving MNGO:
    // const amountMango = ethers.utils.parseEther("30000");
    // const approveMango = await mangoRouter.approve(swapRouter.address, amountMango);
    // await approveMango.wait();

    // // Swap Mango_In:
    // const swapMangoIn = await sRouter.swap(
    //     caller,
    //     false,               
    //     amountMango,
    //     highestSqrt,
    //     [],
    //     pool
    // );
    // await swapMangoIn.wait();
    // console.log("Success");


    // After swap accounting: ETH
    const provBalance1_after = await mangoRouter.balanceOf(caller);
    let amountSpent1_real = provBalance1_after - provBalance1;
    
    console.log("You recieved:", amountSpent1_real);

    // After swap accounting: MANGO
    const provBalance0_after = await mangoRouter.balanceOf(caller);
    let amountSpent0_real = provBalance0_after - provBalance0;
    console.log("Your recieved:", amountSpent0_real);

        // Getting the actual price of mango:
        const slot = await poolRouter.slot0();
        const sqrtPriceX96 = slot.sqrtPriceX96;
        let priceRatio = (sqrtPriceX96 / 2**96) ** 2;
        console.log("MangoPrice:", priceRatio);
    
        const tick = slot.tick;
        console.log(tick);
}


console.log("wart schnell...")
main().catch((error) => {
console.error(error);
process.exitCode = 1;
});