const { ethers, network } = require('hardhat');
const { expect } = require('chai');
const { initSmartContracts } = require('./common');

describe('Burna', function () {
    it('should deploy', async () => {
        [dethContract, burnaContract, addr1, addr2] = await initSmartContracts();
    });
    it("Transfer d.ETH from deployal wallet into Burna Contract", async function () { 
            console.log('Check 1');
            await dethContract.transfer(burnaContract.address, ethers.utils.parseEther('500000'));
            console.log('Check 2');
            expect(await dethContract.balanceOf(burnaContract.address)).to.equal(ethers.utils.parseEther('500000'));
            console.log('Check 3');
            console.log('Transfer successful');
            console.log('Transfer failed');
            console.log(error);
    });
    it("Check that burn rate is expected", async function () {
        try {
            await network.provider.send("evm_increaseTime", [31540300]);
            await network.provider.send("evm_mine");
            expect(await burnaContract.pendingBurnAmount()).to.equal(ethers.utils.parseEther('500000'));
            console.log('Burn rate returns expected value');
        } catch (error) {
            console.log('Burn rate returns unexpected value');
            console.log(error);
        };
    });
});
    




