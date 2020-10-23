pragma solidity =0.6.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/cryptography/MerkleProof.sol";

/**
 * Slightly modified version of: https://github.com/Uniswap/merkle-distributor/blob/master/contracts/MerkleDistributor.sol
 * Changes include:
 * - remove "./interfaces/IMerkleDistributor.sol" inheritance
 * - Contract name and require statement message string changes
 * - add withdrawBlock and withdrawAddress state variables and withdraw() method
 */
contract AudiusClaimDistributor {
    address public token;
    bytes32 public merkleRoot;
    uint256 public withdrawBlock;
    address public withdrawAddress;

    // This is a packed array of booleans.
    mapping(uint256 => uint256) private claimedBitMap;

    // This event is triggered whenever a call to #claim succeeds.
    event Claimed(uint256 index, address account, uint256 amount);

    constructor(address _token, bytes32 _merkleRoot, uint256 _withdrawBlock, address _withdrawAddress) public {
        token = _token;
        merkleRoot = _merkleRoot;
        withdrawBlock = _withdrawBlock;
        withdrawAddress = _withdrawAddress;
    }

    function isClaimed(uint256 index) public view returns (bool) {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = claimedBitMap[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(uint256 index) private {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        claimedBitMap[claimedWordIndex] = claimedBitMap[claimedWordIndex] | (1 << claimedBitIndex);
    }

    /**
     * No caller permissioning needed since token is transfered to account argument,
     *    and there is no incentive to call function for another account.
     * Can only submit claim for full claimable amount, otherwise proof verification will fail.
     */
    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external {
        require(!isClaimed(index), 'AudiusClaimDistributor: Drop already claimed.');

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        require(MerkleProof.verify(merkleProof, merkleRoot, node), 'AudiusClaimDistributor: Invalid proof.');

        // Mark it claimed and send the token.
        _setClaimed(index);
        require(IERC20(token).transfer(account, amount), 'AudiusClaimDistributor: Transfer failed.');

        emit Claimed(index, account, amount);
    }

    function withdraw() external {
        require(
            block.number >= withdrawBlock,
            'AudiusClaimDistributor: Withdraw failed, cannot claim until after validBlocks diff'
        );
        require(
            IERC20(token).transfer(withdrawAddress, IERC20(token).balanceOf(address(this))),
            'AudiusClaimDistributor: Withdraw transfer failed.'
        );
    }
}
