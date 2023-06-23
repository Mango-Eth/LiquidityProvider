const hre = require("hardhat");
const IERC20 = require("../artifacts/contracts/interfaces/IERC20.sol/IERC20_.json");
const _Manager = require("../artifacts/contracts/interfaces/INonFungiblePositionManager.sol/INonFungiblePositionManager.json");
const _v3 = require("../artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");
const _Prov = require("../artifacts/contracts/PM_Rebase.sol/PM_Rebase.json");
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

    // Getting the actual price of mango:
    const slot = await poolRouter.slot0();
    const sqrtPriceX96 = slot.sqrtPriceX96;
    let priceRatio = (sqrtPriceX96 / 2**96) ** 2;
    console.log("MangoPrice:", priceRatio);

    // Provision amounts for test:
    let amount0 = ethers.utils.parseEther("1");
    let amount1 = ethers.utils.parseEther(priceRatio.toString());
    console.log("Providing these amoutns:", ethers.utils.formatUnits(amount0), ethers.utils.formatUnits(amount1));

    // Supply contract with tokens:     Testing with 1 ether.
    const fund1Weth = await wethRouter.transfer(LiquidityProvider, amount0);
    await fund1Weth.wait();
    const fundXMango = await mangoRouter.transfer(LiquidityProvider, amount1);
    await fundXMango.wait();

    const provBalance0 = await wethRouter.balanceOf(LiquidityProvider);
    const provBalance1 = await mangoRouter.balanceOf(LiquidityProvider);
    console.log("Contract Balance:", ethers.utils.formatUnits(provBalance0), ethers.utils.formatUnits(provBalance1))

    let params = {
        pool: pool,
        manager: manager,
        amount0: amount0,
        amount1: amount1,
        fee: 3000,
        tickSpacing: 60
    }

    // Provide liq:
    const testing = await providerRouter.provision(
        params
    );
        await testing.wait();
    
    console.log("Success");

    // Checking how much was spent:
    const provBalance0_after = await wethRouter.balanceOf(LiquidityProvider);
    const provBalance1_after = await mangoRouter.balanceOf(LiquidityProvider);
    
    let amountSpent0_real = provBalance0 - provBalance0_after;
    let amountSpent1_real = provBalance1 - provBalance1_after;
    console.log("Real values spent:", amountSpent0_real, amountSpent1_real);
}




console.log("wart schnell...")
main().catch((error) => {
console.error(error);
process.exitCode = 1;
});