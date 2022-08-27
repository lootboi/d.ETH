require('dotenv').config();
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require('hardhat-contract-sizer');
require("hardhat-gas-reporter");
// import 'hardhat-gas-reporter';
// import 'hardhat-spdx-license-identifier';
// import 'hardhat-contract-sizer';
// import '@nomiclabs/hardhat-etherscan';


const { API_URL, PRIVATE_KEY, API_KEY } = process.env;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.1",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }},
      {
      version: "0.6.12",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }}
     },
     {
      version: "0.4.18",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }}
     }]
  },
  etherscan: {
    apiKey: API_KEY,
  },
  networks: {
    rinkeby: {
      url: API_URL,
      accounts: [PRIVATE_KEY],
    },
    "optimism": {
      url: "https://opt-mainnet.g.alchemy.com/v2/uDuoiyooklIVZhfbuF52wYZgnNHysjXU",
      accounts: [process.env.PRIVATE_KEY],
    },
    "optimistic-goerli": {
      url: "https://opt-goerli.g.alchemy.com/v2/KwajuzZGGjgNFbcQYc6I83pSLZf7gz-G",
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
    coinmarketcap: "b76a4f47-faa1-4e6e-8811-c3402801ece3"
  },
  contractSizer: {
    runOnCompile: true
  },
  mocha: {
    timeout: 1000000,
  }
};
