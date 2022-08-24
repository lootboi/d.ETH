// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.6.12;

import "./dETH.sol";

/*
 ______  _     _  ______ __   _ _______
 |_____] |     | |_____/ | \  | |_____|
|_____] |_____| |    \_ |  \_| |     |

*/                                     

contract Burna is Ownable {
    using SafeMath for uint256;
    using Address for address;

    dETH deth;

    address public immutable deadAddress = 0x000000000000000000000000000000000000dEaD;
    address public dethAddress;
    uint256 public startTime;
    uint256 public totalBurned = 0;
    uint256 public lastTimeBurned;

    event BurnerFunded(uint256 _amount, uint256 _time);
    event dethBurned(uint256 _amount, uint256 _time);

    constructor(address payable _deth, uint256 _startTime) public {
        deth = dETH(_deth);
        dethAddress = _deth;
        startTime = _startTime;
        lastTimeBurned = startTime;
    }

    function getTotalBurned() public view returns (uint256) {
        return totalBurned;
    }

    function getStartTime() public view returns (uint256) {
        return startTime;
    }

    function getDethAddress() public view returns (address) {
        require(dethAddress != address(0), "...How did you deploy without setting the d.ETH address?");
        return dethAddress;
    }

    function getDeadAddress() public view returns (address) {
        return deadAddress;
    }

    function pendingBurnAmount() public view returns (uint256) {
        uint256 burnAmount = (now - lastTimeBurned) * 15854896; // Rate available to burn per second (wei)
        return burnAmount;
    }

    function burn() public {
        require(dethAddress != address(0), "...How did you deploy without setting the d.ETH address?");
        require(now > startTime, "Burner is not yet started");
        uint256 burnValue = pendingBurnAmount();
        lastTimeBurned = now;
        deth.transfer(deadAddress, burnValue);
        totalBurned += burnValue;

        emit dethBurned(burnValue, lastTimeBurned);
    }

}











