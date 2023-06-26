const hre = require("hardhat");
const IERC20 = require("../artifacts/contracts/interfaces/IERC20.sol/IERC20_.json");
const _Manager = require("../artifacts/contracts/interfaces/INonFungiblePositionManager.sol/INonFungiblePositionManager.json");
const _v3 = require("../artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");
const _Prov = require("../artifacts/contracts/PM_Rebase.sol/PM_Rebase.json");
const _Swap = require("../artifacts/contracts/Swapper.sol/SwapRouter.json");
const _Factory = require("../artifacts/contracts/interfaces/IUniswapV3Factory.sol/IUniswapV3Factory.json")
const { ethers, Wallet } = require("ethers");
const { pack, keccak256 } =require('@ethersproject/solidity')

var url = "https://rpc.testnet.fantom.network"; 
var customHttpProvider = new ethers.providers.JsonRpcProvider(url);
const wallet = new Wallet("0x720842497a0707ea28399e49333890a532a2ad546beb59b6f2e624fa88850de8", customHttpProvider);

const manager = "0x54B9C3D4c9761601D738beE666bc31D81C437Df1";
let caller = "0x894E17AD28288D473B919F4028E11fc46671635F";

const managerRouter = new ethers.Contract(manager, _Manager.abi, wallet);

/*
This script does:
1) Creates 2 regular erc20 tokens.
2) Creates a pool with those 2 tokens. The ratios are 52 Mangos for 1 weth.
If weth is token0 sqrtPrice is 52. Else if weth is token1 sqrtPrice is 1/52.
3) We make an initial position, with ticks spaced 600 units on each side.
Here we deposit 20 eth & 520 mangos.
With this the environment is done.
4) We deploy PM_Rebase.sol contract. (Which is a rebalancer)
5) We call provision(). Which makes a position with ticks spaced almost perfectly. 50-49
Here we deposit 1 eth & 52 mangos.
6) We make a swap that pushes the price outiside the range of the smart contracts positions, upper tick.
This means, that the position with (1 eth, 52 mangos), turned into (2 eth + fees).
7) Finally we now call brn_Swap_Mnt(). Which as the name sais, burnes the position that now has 2 eth.
Then the smart contract swaps half of its balance, in this case 1 eth for some amount of mangos.
We then mint yet another balance with nicely spaced ticks 50-49 in the current sqrtPrice, because of the
previously strong swap, is different.
*/

async function main() {

    // Deploy SwapRouter contract:
    const SwapRouter = await hre.ethers.getContractFactory("SwapRouter");
    const swapRouter_ = await SwapRouter.deploy();

    await swapRouter_.deployed()
    .then(() => console.log("SwapRouter:" ,swapRouter_.address));
    let swapper = swapRouter_.address;

    const swapRouter = new ethers.Contract(swapper, _Swap.abi, wallet);
    
    // Creating tokens:
    const wethAmount = ethers.utils.parseEther("5000000")
    const _Token = await hre.ethers.getContractFactory("Token");
    const _weth = await _Token.deploy("Wrapped Ethereum", "WETH", wethAmount);
    await _weth.deployed();
    const _Token2 = await hre.ethers.getContractFactory("Token");
    const _mango = await _Token2.deploy("MANGO", "MNGO", wethAmount);
    await _mango.deployed();
    let weth = _weth.address;
    let mango = _mango.address;

    console.log("WETH", weth, "MANGO", mango);
    const wethRouter = new ethers.Contract(weth, IERC20.abi, wallet);
    const mangoRouter = new ethers.Contract(mango, IERC20.abi, wallet);

    // Get sqrtP:
    let zer = weth < mango ? true : false;
    const squareRoot = await swapRouter._q96(
        zer,
        52
    );
    console.log(squareRoot);
    let val2 = ethers.BigNumber.from(squareRoot).toString();
    console.log("SqrtP:", val2, squareRoot);

    // Create pooL:
    const createPool = await managerRouter.createAndInitializePoolIfNecessary(
        zer ? weth : mango,
        zer ? mango : weth,
        3000,
        squareRoot
    );
    await createPool.wait();

    // Getting pool address:
    const factory = await managerRouter.factory();
    const factoryRouter = new ethers.Contract(factory, _Factory.abi, wallet);
    const _pool = await factoryRouter.getPool(weth, mango, 3000);

    // Declaring poolRouter:
    const poolRouter = new ethers.Contract(_pool, _v3.abi, wallet);
    let priceRatio;

    // Getting slot0 of pool:
    if(zer){
        const slot0_ = await poolRouter.slot0();
        const sqrtPriceX96 = slot0_.sqrtPriceX96;
        priceRatio = (sqrtPriceX96 / 2**96) ** 2;
        console.log("MangoPrice:", priceRatio);
    } else {
        const slot0_ = await poolRouter.slot0();
        const sqrtPriceX96 = slot0_.sqrtPriceX96;
        priceRatio = (sqrtPriceX96 / 2**96) ** 2;   // In mango
        console.log("MangoPrice:", 1 / priceRatio);   
    }
    const slot = await poolRouter.slot0();
    // console.log(slotZero);
    const tick = slot.tick;
    console.log("slot0.Tick:", tick, "Zer:", zer);
    console.log("slot0.sqrtP:", slot.sqrtPriceX96.toString());

    // Calculating lower & upper ticks for first provision:
    const roundBase = await swapRouter.roundTick(tick, 60);
    const lowerTick = roundBase - (100 * 60);
    const upperTick = roundBase + (100 * 60);
    
    let time = await swapRouter._time();

    // let ethAmountIn_ = 20;
    // const ethAmountIn = ethers.utils.parseEther(ethAmountIn_.toString());
    // const mangoAmountIn = ethers.utils.parseEther((priceRatio * ethAmountIn_).toString());

    // Approving:
    const approveEth = await wethRouter.approve(manager, ethers.utils.parseEther("20"));
    await approveEth.wait();
    const approveMango = await mangoRouter.approve(manager, ethers.utils.parseEther("520"));
    await approveMango.wait();

    let params = {
        token0: zer ? weth : mango,
        token1: zer ? mango : weth,
        fee: 3000,
        tickLower: lowerTick,
        tickUpper: upperTick,
        amount0Desired: zer ? ethers.utils.parseEther("20") : ethers.utils.parseEther("520"),
        amount1Desired: zer ? ethers.utils.parseEther("520") : ethers.utils.parseEther("20"),
        amount0Min: 0,
        amount1Min: 0,
        recipient: caller,
        deadline: time + 600
    }
    console.log("Params", params);

    // Try to provide liquidity:
    let attempt = await managerRouter.mint(
        params
    );
    await attempt.wait();
    const _base_new_slot = await poolRouter.slot0();
    const _base_liquidity = await poolRouter.liquidity();
    console.log("Success, base liquidity deployed!", _base_liquidity.toString());
    console.log("SqrtP after base depo:", _base_new_slot.sqrtPriceX96.toString());


    // Environment done!

    // Provision amounts for test:
    let burnerAddress = "0x1E0a1B6E84CB7862137E9Eb5dE6b8b7da29a5378";
    const Test = await hre.ethers.getContractFactory("PM_Rebase");
    const test = await Test.deploy(burnerAddress);
    await test.deployed();
    let rebaseContract = test.address;

    const rebaseRouter = new ethers.Contract(rebaseContract, _Prov.abi, wallet);


    // Getting slot0 of pool:
    let priceRatio_;
    if(zer){
        const slot0__ = await poolRouter.slot0();
        const sqrtPriceX96_ = slot0__.sqrtPriceX96;
        priceRatio_ = (sqrtPriceX96_ / 2**96) ** 2;
    } else {
        const slot0_ = await poolRouter.slot0();
        const sqrtPriceX96 = slot0_.sqrtPriceX96;
        let val = (sqrtPriceX96 / 2**96) ** 2;   // In mango
        priceRatio_ = 1 / val;
    }

    console.log("MangoPrice_2:", priceRatio_);  

    let amount0 = ethers.utils.parseEther("1");
    let amount1 = ethers.utils.parseEther(priceRatio_.toString());
    console.log("Providing these amoutns:", ethers.utils.formatUnits(amount0), ethers.utils.formatUnits(amount1));

    // Supply contract with tokens:     Testing with 1 ether.
    const fund1Weth = await wethRouter.transfer(rebaseContract, amount0);
    await fund1Weth.wait();
    const fundXMango = await mangoRouter.transfer(rebaseContract, amount1);
    await fundXMango.wait();

    const provBalance0 = await wethRouter.balanceOf(rebaseContract);
    const provBalance1 = await mangoRouter.balanceOf(rebaseContract);
    console.log("Contract Balance:", ethers.utils.formatUnits(provBalance0), ethers.utils.formatUnits(provBalance1));

    let params_Provision = {
        pool: _pool,
        manager: manager,
        amount0: zer ? amount0 : amount1,
        amount1: zer ? amount1 : amount0,
        fee: 3000,
        tickSpacing: 60
    }
    console.log("Provision params:", params_Provision);

    // Provide liq:
    const testing = await rebaseRouter.provision(
        params_Provision
    );
        await testing.wait();

    // Checking how much was spent:
    const provBalance0_after = await wethRouter.balanceOf(rebaseContract);
    const provBalance1_after = await mangoRouter.balanceOf(rebaseContract);
    
    let amountSpent0_real = provBalance0 - provBalance0_after;
    let amountSpent1_real = provBalance1 - provBalance1_after;
    console.log("Real values spent:", amountSpent0_real, amountSpent1_real); 
    
    console.log("After provision, balances:", ethers.utils.formatUnits(provBalance0_after), ethers.utils.formatUnits(provBalance1_after));
    
    console.log("Success, contract provided into a range");


    // We swap such that we only have eth left in the position:
    let _counter = 0;
    const id = await rebaseRouter.ids(_counter);
    console.log("NFT_ID:", id);
    const position = await managerRouter.positions(id);
    console.log(position);
    console.log("Range:", position[5], position[6],  "BaseTick:", tick,"Amounts:", ethers.utils.formatUnits(amount0), ethers.utils.formatUnits(amount1));
    
    // Contract environment set!


    const lowestSqrt = await swapRouter.returnLowestSqrt();
    const highestSqrt = await swapRouter.returnHighestSqrt();

    // Approving WETH:
    const amountEth_In = ethers.utils.parseEther("5");
    const approveEth_In = await wethRouter.approve(swapper, amountEth_In);
    await approveEth_In.wait();

    // Debugging previous sqrtP:
    const prevSlot0 = await poolRouter.slot0();

    const _liquiditiy_after_swap2 = await poolRouter.liquidity();
    console.log("L brefore swap:", _liquiditiy_after_swap2.toString());

    // Starting swap to push position out of bounds, therefore making the position purely eth:

    if(zer){    // WETH / MANGO

    // Swap Mango_In:
    const swapEthIn = await swapRouter.swap(
        caller,
        true,               
        amountEth_In,
        lowestSqrt,
        [],
        _pool
    );
    await swapEthIn.wait();

    } else {    // MANGO / WETH

    // Swap Mango_In:
    const swapEthIn = await swapRouter.swap(
        caller,
        false,               
        amountEth_In,
        highestSqrt,
        [],
        _pool
    );
    await swapEthIn.wait();
    }

    const sslot = await poolRouter.slot0();
    console.log("Swap worked!", "New Current Tick:", sslot.tick, "Your last position:", position[5], position[6]);
    const _liquiditiy_after_swap = await poolRouter.liquidity();
    console.log("L after swap:", _liquiditiy_after_swap.toString());

    // Try burning:

    const burning = await rebaseRouter._burn_v3(manager, _pool, _counter);
    await burning.wait();
    console.log("Success");

    const _wethBalance_2 = await wethRouter.balanceOf(rebaseContract);
    const _mangoBalance_2 = await mangoRouter.balanceOf(rebaseContract);
    console.log("Weth Balance after swap & burn:", ethers.utils.formatUnits(_wethBalance_2), "Mango balance :",ethers.utils.formatUnits(_mangoBalance_2));

}

console.log("wart schnell...")
main().catch((error) => {
console.error(error);
process.exitCode = 1;
});