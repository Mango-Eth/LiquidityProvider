const hre = require("hardhat");

async function main() {

    let burnerAddress = "0x1E0a1B6E84CB7862137E9Eb5dE6b8b7da29a5378";
    const Test = await hre.ethers.getContractFactory("PM_Rebase");
    const test = await Test.deploy(burnerAddress);

    await test.deployed()
    .then(() => console.log(test.address))
}


console.log("hi")
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });