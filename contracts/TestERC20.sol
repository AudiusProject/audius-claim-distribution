pragma solidity =0.6.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
  string constant NAME = "Audius";

  string constant SYMBOL = "AUDIO";

  uint256 constant INITIAL_SUPPLY = 100000;

  constructor (address _owner) public payable ERC20(NAME, SYMBOL) {
      _mint(_owner, INITIAL_SUPPLY);
  }
}