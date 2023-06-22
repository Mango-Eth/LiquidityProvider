require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
const fs = require("fs");


const defaultNetwork = "ftm";

function mnemonic() {
  try {
    return fs.readFileSync("./mnemonic.txt").toString().trim();
  } catch (e) {
      console.log(
        "no mnemonic"
      );
  }
  return "";
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork,


  networks: {
    bsc: {
      url: "https://data-seed-prebsc-1-s3.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      gasLimit: 21000,
      accounts: {
        mnemonic: mnemonic(),
      }
    },
    ftm: {
      url: "https://rpc.testnet.fantom.network",
      chainId: 4002,
      accounts: {
        mnemonic: mnemonic(),
      }
    }
  },




  solidity: {
    compilers: [
      // { version: "0.7.6", settings: { optimizer: { enabled: true, runs: 100 } } },
      { version: "0.8.9", settings: { optimizer: { enabled: true, runs: 100 } } },
    ],
  },
};