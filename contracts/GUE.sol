// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract GUE is ERC20 {
    constructor() ERC20("GUE", "GUE") {
        _mint(msg.sender, 100000000000 * 10 ** decimals());
    }
}
