const chalk = require('chalk');
const {accounts, contract} = require('@openzeppelin/test-environment');
const {BN, expectRevert, time, expectEvent, constants} = require('@openzeppelin/test-helpers');
const {expect} = require('chai');
const Token = contract.fromArtifact('Token');
const WSDN = contract.fromArtifact("WSDN");
const IUniswapV2Pair = contract.fromArtifact("IUniswapV2Pair");
const UniswapV2Factory = contract.fromArtifact("UniswapV2Factory");
const UniswapV2Router02 = contract.fromArtifact("UniswapV2Router02");
const numeral = require('numeral')

let _yellowBright = chalk.yellowBright;
let _magenta = chalk.magenta;
let _cyan = chalk.cyan;
let _yellow = chalk.yellow;
let _red = chalk.red;
let _blue = chalk.blue;
let _green = chalk.green;

function yellow() {
    console.log(_yellow(...arguments));
}

function red() {
    console.log(_red(...arguments));
}

function green() {
    console.log(_green(...arguments));
}

function blue() {
    console.log(_blue(...arguments));
}

function cyan() {
    console.log(_cyan(...arguments));
}

function magenta() {
    console.log(_magenta(...arguments));
}

function now() {
    return parseInt((new Date().getTime()) / 1000);
}

function hours(total) {
    return parseInt(60 * 60 * total);
}

function fromWei(v) {
    return web3.utils.fromWei(v, 'ether').toString();
}

function toWei(v) {
    return web3.utils.toWei(v, 'wei').toString();
}

function fromGwei(v) {
    return web3.utils.fromWei(v, 'gwei').toString();
}

function toGwei(v) {
    return web3.utils.toWei(v, 'gwei').toString();
}

const mintAmount = '100000000';
const MINTED = toGwei(mintAmount);
const DEAD_ADDR = '0x000000000000000000000000000000000000dEaD';
let dev, user, user1, feeAddress, reserve;
const ONE = toGwei('1');
const CEM = toGwei('100');
const ZERO_ONE = toGwei('0.1');

describe('Bank', async function () {
    beforeEach(async function () {
        this.timeout(60000);
        dev = accounts[0];
        user = accounts[1];
        devaddr = accounts[2];
        feeAddress = accounts[3];
        reserve = accounts[4];
        user1 = accounts[5];

        this.weth = await WSDN.new({from: dev});
        this.factory = await UniswapV2Factory.new({from: dev});
        // red('pairCodeHash()', await this.factory.pairCodeHash());
        this.router = await UniswapV2Router02.new({from: dev});
        await this.router.init(this.factory.address, this.weth.address, {from: dev});

        green('create token');
        this.token = await Token.new(reserve, this.router.address, {from: dev});

        this.pairAddr = await this.factory.getPair(this.token.address, this.weth.address);
        this.pair = await IUniswapV2Pair.at(this.pairAddr);
        await this.token.approve(this.router.address, MINTED, {from: reserve});
        green('transfer '+fromGwei(MINTED)+' to reserve');
        await this.token.transfer(devaddr, MINTED, {from: reserve});

        green('addLiquidityETH');
        await this.router.addLiquidityETH(this.token.address, MINTED, 0, 0, reserve, now() + 60, {
            from: reserve,
            value: toWei('10')
        });
        green('end setup');
    });
    it('lottery', async function () {
        this.timeout(60000);
        await time.increase(hours(72));
        const TOKEN = this.token;

        const donation = '0x000000000000000000000000000000000000000d';
        const testA = '0x000000000000000000000000000000000000000A';
        async function dump(title) {
            const tickets = await TOKEN.loterryUserTickets(user);
            const uts = await TOKEN.userTicketsTs(user);
            const t = await TOKEN.lotteryTotalTicket();
            const ts = await TOKEN.lotwinnerTimestamp();
            const ticket = await TOKEN.winNum();
            const prize = await TOKEN.getLotSize();
            const lotnonce = await TOKEN.lotNonce();
            const lotwinner = await TOKEN.lotWinner();
            const balanceOfPot = await TOKEN.balanceOf(donation);
            const balanceOfWiner = await TOKEN.balanceOf(testA);
            yellow(title+' pot=' + fromGwei(balanceOfPot) + ' ba='+fromGwei(balanceOfWiner)+' nonce='+lotnonce+' prize=' + fromGwei(prize) + ' ticket=' + ticket + ' ts=' + ts+' uts='+uts+' t='+t+' tickets=', tickets);
        }

        magenta('set random to 10');
        // await this.token.setNonceLmt('4', {from: dev});

        await this.token.transfer(user, MINTED, {from: devaddr}); await dump('0');
        await this.token.transfer(donation, CEM, {from: user}); await dump(1);
        await time.increase(hours(72));
        await this.token.transfer(donation, CEM, {from: user}); await dump(2);
        await time.increase(hours(72));
        await this.token.transfer(donation, CEM, {from: user}); await dump(2);
        await time.increase(hours(72));
        await this.token.transfer(user1, CEM, {from: user}); await dump(5);
        await this.token.transfer(user1, CEM, {from: user}); await dump(6);

    });

    describe('Token', async function () {
        /*
                it('fee on transfer', async function () {
                    this.timeout(60000);
                    const getTime = await this.token.getTime();
                    const n1 = parseInt(getTime.toString()) + 10;
                    const n2 = n1 + 60;
                    await this.token.setSwapAndLiquifyEnabled(false, {from: dev});

                    let balanceOfHolder = (await this.token.balanceOf(devaddr));
                    let balanceOfLpReserve = (await this.pair.balanceOf(reserve));
                    let balanceOfTokenReserve = (await this.token.balanceOf(reserve));
                    magenta('balanceOfHolder', fromGwei(balanceOfHolder) );
                    blue('balanceOfLpReserve', fromGwei(balanceOfLpReserve) );
                    blue('balanceOfTokenReserve', fromGwei(balanceOfTokenReserve) );

                    yellow('balance of user before swap', fromGwei(await this.token.balanceOf(user)) ) ;
                    await this.router.swapExactETHForTokensSupportingFeeOnTransferTokens(0, [this.weth.address, this.token.address], user, n2, {from: user, value: ZERO_ONE});

                    function d(v){
                        return numeral(v).format('0,0.0000');
                    }
                    function toPct(_base, _div){
                        const base = fromGwei(_base);
                        const div = fromGwei(_div);
                        const str = d(div);
                        return str+' ('+ ((div/base)*100).toFixed(1) +'%)';
                    }
                    const base = toGwei('100000000');

                    green('balance of user after swap', toPct(base, await this.token.balanceOf(user)) );

                    const charityWalletAddress = await this.token.charityWalletAddress();
                    const devFundWalletAddress = await this.token.devFundWalletAddress();
                    const marketingFundWalletAddress = await this.token.marketingFundWalletAddress();
                    const lotteryPotWalletAddress = await this.token.lotteryPotWalletAddress();


                    blue('balance of [burn] after swap', toPct(base, await this.token.balanceOf(DEAD_ADDR)) );
                    yellow('balance of [distribution/contract] after swap', toPct(base, await this.token.balanceOf(this.token.address)) );
                    blue('balance of [charity] after swap', toPct(base, await this.token.balanceOf(charityWalletAddress)) );
                    blue('balance of [dev fund] after swap', toPct(base, await this.token.balanceOf(devFundWalletAddress)) );
                    blue('balance of [marketing fund] after swap', toPct(base, await this.token.balanceOf(marketingFundWalletAddress)) );
                    blue('balance of [lottery] after swap', toPct(base, await this.token.balanceOf(lotteryPotWalletAddress)) );

                    balanceOfHolder = (await this.token.balanceOf(devaddr));
                    balanceOfLpReserve = (await this.pair.balanceOf(reserve));
                    balanceOfTokenReserve = (await this.token.balanceOf(reserve));
                    yellow('balanceOfHolder', fromGwei(balanceOfHolder) );
                    blue('balanceOfLpReserve', fromGwei(balanceOfLpReserve) );
                    blue('balanceOfTokenReserve', fromGwei(balanceOfTokenReserve) );

                    red("antiAbuse");
                    let lastSupply = (await this.token.lastSupply());
                    let lastCreationTime = (await this.token.lastCreationTime());
                    let _creationTime = (await this.token._creationTime());
                    let _maxTxAmount = (await this.token._maxTxAmount());
                    let lastInterval = (await this.token.lastInterval());
                    let allowedAmount = (await this.token.allowedAmount());
                    let lastUserBalance = (await this.token.balanceOf(user));
                    yellow('_creationTime   ', _creationTime.toString() );
                    yellow('lastCreationTime', lastCreationTime.toString() );
                    yellow('lastInterval', lastInterval.toString() );
                    yellow('- MAX TX AMOUNT         ', d(fromGwei(_maxTxAmount) ));
                    yellow('- SUPPLY            ', d(fromGwei(lastSupply) ));
                    yellow('- ALLOWED AMOUNT        ', toPct(lastSupply, allowedAmount) );
                    yellow('- USER BALANCE                 ', d(fromGwei(lastUserBalance)) );


                });
        */
    });


});
