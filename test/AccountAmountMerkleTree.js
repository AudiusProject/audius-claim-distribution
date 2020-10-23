const { utils } = require('ethers')

import MerkleTree from './merkleTree.js'

/**
 * Merkle Tree class to store a data set of (account, amount) pairs
 * 
 * Replicated from (converted from TS with only naming changes):
 *    https://github.com/Uniswap/merkle-distributor/blob/master/src/balance-tree.ts
 */
export default class AccountAmountMerkleTree {
  constructor (accountClaimAmounts) {
    this.tree = new MerkleTree(
      accountClaimAmounts.map(({ account, amount }, index) => {
        return AccountAmountMerkleTree.toNode(index, account, amount)
      })
    )
  }

  static verifyProof (index, account, amount, proof, root) {
    let pair = AccountAmountMerkleTree.toNode(index, account, amount)
    for (const item of proof) {
      pair = MerkleTree.combinedHash(pair, item)
    }

    return pair.equals(root)
  }

  static toNode (index, account, amount) {
    const hash = utils.solidityKeccak256(['uint256', 'address', 'uint256'], [index, account, amount])
    return Buffer.from(hash.substr(2), 'hex')
  }

  getHexRoot () {
    return this.tree.getHexRoot()
  }

  // returns the hex bytes32 values of the proof
  getProof (index, account, amount) {
    return this.tree.getHexProof(AccountAmountMerkleTree.toNode(index, account, amount))
  }
}