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
const wallet = new Wallet("0x62f4dc4ba82c03a2d9c040ad31d15cfa90c7e0114cf4c3eddbe9c68ca591e8b4", customHttpProvider);

const manager = "0x54B9C3D4c9761601D738beE666bc31D81C437Df1";
let caller = "0xAe4CfFcF8A14EfD0366190c0373e6b1336226091";

const managerRouter = new ethers.Contract(manager, _Manager.abi, wallet);



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
    console.log("Success, base liquidity deployed!");


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
        console.log("MangoPrice:", 1 / priceRatio_);  
    }

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
        amount0: amount0,
        amount1: amount1,
        fee: 3000,
        tickSpacing: 60
    }

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
    const amountEth_In = ethers.utils.parseEther("2.5");
    const approveEth_In = await wethRouter.approve(swapper, amountEth_In);
    await approveEth_In.wait();

    // Debugging previous sqrtP:
    const prevSlot0 = await poolRouter.slot0();

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

    const id_ = await rebaseRouter.ids(_counter);
    console.log("Position after swap:", id_);
    const position_ = await managerRouter.positions(id_);
    console.log(position_);

    console.log("New sqrtP", sslot.sqrtPriceX96.toString(), "Previous sqrtP", prevSlot0.sqrtPriceX96.toString());

    // let key = keccak256(['bytes'], [pack(['address', 'int24', 'int24'], [manager, position_[5], position_[6]])]);

    // const v3Position = await poolRouter.positions(key);
    // console.log(v3Position);

    // let estimation_params = {
    //     sqrtPriceX96: sslot.sqrtPriceX96,
    //     tickLower: position_[5],
    //     tickUpper: position_[6],
    //     liquidity: v3Position[0]
    // }

    // const estimating_Returns = await swapRouter.estimate(estimation_params);        // Id liquidity doesnt update, need it from v3, still wrong somehow wtf
    // console.log(estimating_Returns);

    // Finally we perform the rebase with brn_Swap_Mnt function:

    let rebase_params = {
        pool: _pool,
        manager: manager,
        swapRouter: swapper,
        cntr: 0,
        zer: zer ? true : false,                     // True = positions is mostly weth : pos is mostly mango
        fee: 3000,
        tickSpacing: 60
    }

    const _rebasing = await rebaseRouter.brn_Swap_Mnt(rebase_params);
    await _rebasing.wait();

    console.log("Just brned, swapped & minted a new position.");

    // Because i couldnt get the upper block to work
    // IDk how much eth the initial position is supposed to end up with, so i cant exactly tell how much the contract
    // swapped & how off the precision of the ticks were.
    // Final accounting:

    const finalSlot0 = await poolRouter.slot0();
    const newId = await rebaseRouter.ids(1);
    const _ticksOfNewPosition = await managerRouter.positions(newId);
    console.log("Current Tick:", finalSlot0.tick, "Ticks of position:", _ticksOfNewPosition[5], _ticksOfNewPosition[6]);

    const finalBal0 = await wethRouter.balanceOf(rebaseContract);
    const finalBal1 = await mangoRouter.balanceOf(rebaseContract);

    console.log(ethers.utils.formatUnits(finalBal0), ethers.utils.formatUnits(finalBal1));

}


console.log("wart schnell...")
main().catch((error) => {
console.error(error);
process.exitCode = 1;
});