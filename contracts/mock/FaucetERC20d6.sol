// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

import "../libs/ERC20d6.sol";
import "../libs/Ownable.sol";

contract FaucetERC20d6 is ERC20d6, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 value
    ) public ERC20d6(name, symbol) {
        if( value > 0 ){
            _mint(msg.sender, value);
        }
    }
    function mint(uint256 value) public onlyOwner {
        _mint(msg.sender, value);
    }
}
