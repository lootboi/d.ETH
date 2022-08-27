var initSmartContracts = async () => {
    let contractFactory = await hre.ethers.getContractFactory('UniswapV2Factory');
    const factory = await contractFactory.deploy();
    await factory.deployed();

    contractFactory = await hre.ethers.getContractFactory('WETH9');
    const weth = await contractFactory.deploy();
    await weth.deployed();

    contractFactory = await hre.ethers.getContractFactory('UniswapV2Router02');
    const router = await contractFactory.deploy();
    await router.deployed();

    await router.init(factory.address, weth.address);

    contractFactory = await hre.ethers.getContractFactory('IterableMapping');
    const lib = await contractFactory.deploy();
    await lib.deployed();

    contractFactory = await hre.ethers.getContractFactory('dETH', {
        libraries: {
            IterableMapping: lib.address,
        },
      });
    const dethContract = await contractFactory.deploy(router.address, {gasLimit: 10000000});
    await dethContract.deployed();

    contractFactory = await hre.ethers.getContractFactory('Burna');
    const burnaContract = await contractFactory.deploy(dethContract.address, (Date.now()));
    await burnaContract.deployed();

    return [factory, router, weth, dethContract, lib, dethContract, burnaContract];
};

module.exports = {
    initSmartContracts,
};