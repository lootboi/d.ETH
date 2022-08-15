import {formatUnits, parseUnits} from "@ethersproject/units/src.ts/index";

const {ethers} = require("hardhat");
const {solidity} = require("ethereum-waffle");
const {expect} = require("chai");
require("@nomiclabs/hardhat-web3");
import {ContractFactory, constants, utils, Contract, BigNumber} from 'ethers';

const chalk = require('chalk');
// let _yellowBright = chalk.yellowBright;
const _magenta = chalk.magenta;
const _cyan = chalk.cyan;
const _yellow = chalk.yellow;
const _red = chalk.red;
const _blue = chalk.blue;
const _green = chalk.green;

function toWei(v: string): string {
    return utils.parseUnits(v, 9).toString();
}

function fromWei(v: string): string {
    return utils.formatUnits(v, 9).toString();
}

function toWei6(v: string): string {
    return utils.parseUnits(v, 9).toString();
}

function fromWei6(v: string): string {
    return utils.formatUnits(v, 9).toString();
}

describe("Token contract", () => {
    const provider = ethers.provider;
    const approve = '10000000000000000000000000000000000000000000';
    let weth: any, factory: any, router: any, token: any, usdc: any;
    let s_reserve: any;
    let dev: string, user: string, user1: string, user2: string, user3: string, feeAddress: string, reserve: string;
    let MINTED: string = toWei('1000');
    let ONE: string = toWei('1');
    let CEM: string = toWei('100');
    let TEN: string = toWei('10');
    let USER: any, USER1: any, USER2: any, USER3: any;
    let getTime: string;

    beforeEach(async () => {
        const [_dev, _user, _user1, _user2, _user3, _feeAddress, _reserve] = await ethers.getSigners();
        s_reserve = _reserve;
        USER = _user;
        USER1 = _user1;
        USER2 = _user2;
        USER3 = _user3;
        dev = _dev.address;
        user = _user.address;
        user1 = USER1.address;
        user2 = USER2.address;
        user3 = USER3.address;
        feeAddress = _feeAddress.address;
        reserve = _reserve.address;
        const _USDC = await ethers.getContractFactory("FaucetERC20d6");
        const _Token = await ethers.getContractFactory("Token");
        const _WSDN = await ethers.getContractFactory("WSDN");
        // const UniswapV2Pair = await ethers.getContractFactory("UniswapV2Pair");
        const _UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
        const _UniswapV2Router02 = await ethers.getContractFactory("UniswapV2Router02");
        usdc = await _USDC.deploy("USDC", "USDC", toWei6('1000'));
        weth = await _WSDN.deploy();
        factory = await _UniswapV2Factory.deploy();
        // console.log( (await factory.pairCodeHash()) );
        router = await _UniswapV2Router02.deploy();
        await router.init(factory.address, weth.address);
        token = await _Token.deploy(dev, router.address);
        getTime = await token.getBlockTime();

        await token.approve(router.address, approve);
        await usdc.approve(router.address, approve);

        await token.connect(USER).approve(router.address, approve);
        await usdc.connect(USER).approve(router.address, approve);

        // console.log(_red("ROUTER=" + router.address));
        // console.log(_red("FACTORY=" + factory.address));
        // console.log(_red("DEV=" + dev));
        // console.log(_red("USER=" + user));
        await usdc.transfer(user, toWei6('100'));
        // console.log(_magenta('\tdev usdc=', fromWei6(await usdc.balanceOf(dev)) + ' token=' + fromWei(await token.balanceOf(dev))));
        // console.log(_magenta('\tuser usdc=', fromWei6(await usdc.balanceOf(user)) + ' token=' + fromWei(await token.balanceOf(user))));

        await router.addLiquidity(token.address, usdc.address, CEM, toWei6('100'), 0, 0, dev, getTime + 60);
        await router.addLiquidityETH(token.address, CEM, 0, 0, dev, getTime + 60, {value: TEN});

    });
    describe("transfers", () => {
        it("", async () => {
            await token.openTrading();

            console.log(_blue('\tdev usdc=', fromWei6(await usdc.balanceOf(dev)) + ' token=' + fromWei(await token.balanceOf(dev))));
            console.log(_blue('\tuser usdc=', fromWei6(await usdc.balanceOf(user)) + ' token=' + fromWei(await token.balanceOf(user))));

            const taxAddress = '0xcE0Cd711574C2f3C4D95eb63CdD88f860a1a17a1';
            {
                await router.connect(USER).swapExactETHForTokensSupportingFeeOnTransferTokens(
                    0, [weth.address, token.address], user, getTime + 60, {value: ONE});

                console.log(_blue('\tdev usdc=', fromWei6(await usdc.balanceOf(dev)) + ' token=' + fromWei(await token.balanceOf(dev))));
                console.log(_blue('\tuser usdc=', fromWei6(await usdc.balanceOf(user)) + ' token=' + fromWei(await token.balanceOf(user))));
                console.log(_green('\tswap usdc->token tax balance=' + (await provider.getBalance(taxAddress)) + ' usdc=', (await usdc.balanceOf(taxAddress)).toString() + ' token=' + (await token.balanceOf(taxAddress)).toString()));
            }

            {
                await router.connect(USER).swapExactTokensForETHSupportingFeeOnTransferTokens(
                    ONE, 0, [token.address, weth.address], user, getTime + 60);

                console.log(_cyan('\tdev usdc=', fromWei6(await usdc.balanceOf(dev)) + ' token=' + fromWei(await token.balanceOf(dev))));
                console.log(_cyan('\tuser usdc=', fromWei6(await usdc.balanceOf(user)) + ' token=' + fromWei(await token.balanceOf(user))));
                console.log(_green('\tswap usdc->token tax balance=' + (await provider.getBalance(taxAddress)) + ' usdc=', (await usdc.balanceOf(taxAddress)).toString() + ' token=' + (await token.balanceOf(taxAddress)).toString()));
            }

        });
    });
});
