
async function first() {
let contractFactory = await hre.ethers.getContractFactory('UniSswapV2Pair');
const pair = await contractFactory.deploy();
await factory.deployed();
console.log(pair.address);
}