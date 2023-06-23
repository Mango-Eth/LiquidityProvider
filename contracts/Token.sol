// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";




contract Token is ERC20, Ownable{
     constructor(string memory _name, string memory _logo, uint256 _amount) ERC20(_name, _logo) {
        _mint(msg.sender, _amount);
    }

    // function burn(uint _amount, address _add) public {
    //     _burn(_add, _amount);
    // }

    // function mint(address _to, uint _amount) public {
    //     _mint(address(_to), _amount);
    // }
}