const hre = require("hardhat");

async function main() {

    const Test = await hre.ethers.getContractFactory("LiquidityProvision");
    const test = await Test.deploy();

    await test.deployed()
    .then(() => console.log(test.address))
}


console.log("hi")
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });