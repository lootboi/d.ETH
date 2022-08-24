const ethers = require('hardhat');

var initSmartContracts = async () => {
   const startTime = (await hre.ethers.provider.getBlock('latest').timestamp) + 300;

    let contractFactory = await hre.ethers.getContractFactory('dETH');
    const dethContract = await contractFactory.deploy("0xB24129Db1E795353D67bDb167d4C322E5fEf51Fc", "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
    await dethContract.deployed();

    contractFactory = await hre.ethers.getContractFactory('Burna');
    const burnaContract = await contractFactory.deploy(dethContract.address, startTime); //Aaddr2 in place of router address for local testing 
    await burnaContract.deployed();

    return [dethContract, burnaContract];
};

module.exports = {
    initSmartContracts,
};