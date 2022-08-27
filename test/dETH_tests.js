const { expect } = require("chai");
const { ethers } = require("hardhat");
const { initSmartContracts } = require('./common');

function getTimestampInSeconds () {
    return Math.floor(Date.now() / 1000).toFixed(0);
  }

describe("Deploy", function () {
    beforeEach("Get Instances", async function () {
        [factory, router, weth, dethContract, lib, dethContract, burnaContract] = await initSmartContracts();
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
    });
    it("Deploys all smart contracts", async function () {
        expect(factory.address).to.not.be.null;
        expect(router.address).to.not.be.null;
        expect(weth.address).to.not.be.null;
        expect(dethContract.address).to.not.be.null;
        expect(lib.address).to.not.be.null;
        expect(dethContract.address).to.not.be.null;
        expect(burnaContract.address).to.not.be.null;
    });
    it("Check exclusion from fees", async function () {
        //Is the owner automatically excluded from fees?
        const hasExclusion = await dethContract.isExcludedFromFees(owner.address);
        expect(hasExclusion).to.be.true;

        //Can we add exclusion to an address?
        await dethContract.excludeFromFees(addr1.address, true);
        const liqExclusion = await dethContract.isExcludedFromFees(addr1.address);
        expect(liqExclusion).to.be.true;
    });
    it("Check Factory/Router Interaction for Pair Creation", async function () {
        // Is the pair created?
        expect(await dethContract.uniswapV2Pair()).to.not.be.null;
        
        //Is the Router correctly initialized?
        expect(await router.factory()).to.equal(factory.address);
        expect(await router.WETH()).to.equal(weth.address);

        //Can we add liquidity?
        const pair = await dethContract.uniswapV2Pair();
        await dethContract.approve(router.address, ethers.constants.MaxUint256);
        await router.addLiquidityETH(
            dethContract.address, //token
            ethers.utils.parseEther("4500000"),//amountTokenDesired
            ethers.utils.parseEther("4400000"),//amountTokenMin
            ethers.utils.parseEther("3.9"),//amountETHMin
            addr1.address, //to
            1700000000, //deadline
            {value: ethers.utils.parseEther("4")});
        expect(await dethContract.balanceOf(owner.address)).to.equal(ethers.utils.parseEther("5500000"));
        expect(await dethContract.balanceOf(pair)).to.equal(ethers.utils.parseEther("4500000"));
        expect(await weth.balanceOf(pair)).to.equal(ethers.utils.parseEther("4"));

    });
});
