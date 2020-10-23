const { time } = require('@openzeppelin/test-helpers')

import * as _lib from '../utils/lib.js'
import AccountAmountMerkleTree from './AccountAmountMerkleTree.js'

const AudiusClaimDistributor = artifacts.require('AudiusClaimDistributor')
const TestERC20 = artifacts.require('TestERC20')

contract('AudiusClaimDistributor', async function (accounts) {
  let token
  let tree, merkleRoot, distributor

  const tokenOwnerAddress = accounts[1]
  const withdrawBlock = 120
  const withdrawAddress = accounts[20]

  const claimant1Acct = accounts[10]
  const claimant2Acct = accounts[11]
  const claimant1Amt = 10
  const claimant2Amt = 20
  const accountClaimAmounts = [
    { account: claimant1Acct, amount: claimant1Amt },
    { account: claimant2Acct, amount: claimant2Amt }
  ]

  const distributorContractInitialTokenSupply = 1000

  /**
   * Deploy token
   * Initialize merkle tree from accounts data set
   * Initialize AudiusClaimDistributor contract + seed it with tokens
   */
  beforeEach(async function () {
    // Deploy token
    token = await TestERC20.new(tokenOwnerAddress, { from: tokenOwnerAddress })

    // Initialize merkle tree from accounts data set
    tree = new AccountAmountMerkleTree(accountClaimAmounts)
    merkleRoot = tree.getHexRoot()

    // Initialize AudiusClaimDistributor contract
    distributor = await AudiusClaimDistributor.new(token.address, merkleRoot, withdrawBlock, withdrawAddress)

    // Seed distributor contract with sufficient tokens to facilitate all claims
    await token.transfer(distributor.address, distributorContractInitialTokenSupply, { from: tokenOwnerAddress })
  })

  describe('Single claim tests', async function () {
    const treeIndex = 0
    const claimant = claimant1Acct
    const claimAmount = claimant1Amt

    it('Successful claim', async function () {
      // Confirm initial token balances of claimant and distributor address
      assert.equal(await token.balanceOf(claimant), 0)
      assert.equal(await token.balanceOf(distributor.address), distributorContractInitialTokenSupply)

      // Generate merkle proof & successfully submit claim to contract
      const proof = tree.getProof(treeIndex, claimant, claimAmount)
      await distributor.claim(treeIndex, claimant, claimAmount, proof)

      // Confirm token balances reflect successful claim
      assert.equal(await token.balanceOf(claimant), claimAmount)
      assert.equal(await token.balanceOf(distributor.address), distributorContractInitialTokenSupply - claimAmount)
    })

    it('Confirm proof generation fails with invalid tree index', async function () {
      const invalidTreeIndex = 1
      try {
        tree.getProof(invalidTreeIndex, claimant, claimAmount)
      } catch (e) {
        assert.isTrue(e.message.indexOf('Element does not exist in Merkle tree') >= 0)
      }
    })

    it('Confirm proof generation fails with invalid claimant', async function () {
      const invalidClaimant = accounts[15]
      try {
        tree.getProof(treeIndex, invalidClaimant, claimAmount)
      } catch (e) {
        assert.isTrue(e.message.indexOf('Element does not exist in Merkle tree') >= 0)
      }
    })

    it('Confirm proof generation fails with invalid claimAmount too large', async function () {
      const invalidClaimAmountTooLarge = 20
      try {
        tree.getProof(treeIndex, claimant, invalidClaimAmountTooLarge)
      } catch (e) {
        assert.isTrue(e.message.indexOf('Element does not exist in Merkle tree') >= 0)
      }
    })

    it('Confirm proof generation fails with invalid claimAmount too small', async function () {
      const invalidClaimAmountTooSmall = 5
      try {
        tree.getProof(treeIndex, claimant, invalidClaimAmountTooSmall)
      } catch (e) {
        assert.isTrue(e.message.indexOf('Element does not exist in Merkle tree') >= 0)
      }
    })

    it('Confirm claim fails with invalid tree index', async function () {
      const invalidTreeIndex = 1
      const proof = tree.getProof(treeIndex, claimant, claimAmount)
      await _lib.assertRevert(
        distributor.claim(invalidTreeIndex, claimant, claimAmount, proof),
        'AudiusClaimDistributor: Invalid proof.'
      )
    })

    it('Confirm claim fails with invalid claimant', async function () {
      const invalidClaimant = accounts[15]
      const proof = tree.getProof(treeIndex, claimant, claimAmount)
      await _lib.assertRevert(
        distributor.claim(treeIndex, invalidClaimant, claimAmount, proof),
        'AudiusClaimDistributor: Invalid proof.'
      )
    })

    it('Confirm claim fails with invalid claim claimAmount too large', async function () {
      const invalidClaimAmountTooLarge = 20
      const proof = tree.getProof(treeIndex, claimant, claimAmount)
      await _lib.assertRevert(
        distributor.claim(treeIndex, claimant, invalidClaimAmountTooLarge, proof),
        'AudiusClaimDistributor: Invalid proof.'
      )
    })

    it('Confirm claim fails with invalid claim claimAmount too small', async function () {
      const invalidClaimAmountTooSmall = 5
      const proof = tree.getProof(treeIndex, claimant, claimAmount)
      await _lib.assertRevert(
        distributor.claim(treeIndex, claimant, invalidClaimAmountTooSmall, proof),
        'AudiusClaimDistributor: Invalid proof.'
      )
    })
  })

  describe('Multiple claims', async function () {
    it('Confirm repeated claims fail', async function () {
      const treeIndex = 0
      const claimant = claimant1Acct
      const claimAmount = claimant1Amt

      // Confirm claimant token balance is zero before claim
      assert.equal(await token.balanceOf(claimant), 0)

      // Generate merkle proof & successfully submit claim to contract
      const proof = tree.getProof(treeIndex, claimant, claimAmount)
      await distributor.claim(treeIndex, claimant, claimAmount, proof)

      // Confirm token balances reflect successful claim
      assert.equal(await token.balanceOf(claimant), claimAmount)
      assert.equal(await token.balanceOf(distributor.address), distributorContractInitialTokenSupply - claimAmount)

      // Confirm repeated claim will fail
      await _lib.assertRevert(
        distributor.claim(treeIndex, claimant, claimAmount, proof),
        'AudiusClaimDistributor: Drop already claimed.'
      )
    })

    it('Confirm multiple claimants can successfully claim', async function () {
      /**
       * Successful claim for claimant 1
       */

      const treeIndex1 = 0
      const claimant1 = claimant1Acct
      const claimAmount1 = claimant1Amt

      // Confirm claimant1 token balance is zero before claim
      assert.equal(await token.balanceOf(claimant1), 0)

      // Generate merkle proof & successfully submit claim to contract
      const proof1 = tree.getProof(treeIndex1, claimant1, claimAmount1)
      await distributor.claim(treeIndex1, claimant1, claimAmount1, proof1)

      // Confirm token balances reflect successful claim
      assert.equal(await token.balanceOf(claimant1), claimAmount1)
      assert.equal(await token.balanceOf(distributor.address), distributorContractInitialTokenSupply - claimAmount1)

      /**
       * Successful claim for claimant 2
       */

      const treeIndex2 = 1
      const claimant2 = claimant2Acct
      const claimAmount2 = claimant2Amt

      // Confirm claimant2 token balance is zero before claim
      assert.equal(await token.balanceOf(claimant2), 0)

      // Generate merkle proof & successfully submit claim to contract
      const proof2 = tree.getProof(treeIndex2, claimant2, claimAmount2)
      await distributor.claim(treeIndex2, claimant2, claimAmount2, proof2)

      // Confirm token balances reflect successful claim
      assert.equal(await token.balanceOf(claimant2), claimAmount2)
      assert.equal(await token.balanceOf(distributor.address), distributorContractInitialTokenSupply - claimAmount1 - claimAmount2)
    })
  })

  describe('Withdraw', async function () {
    it('Confirm withdraw fails before withdrawBlock', async function () {
      await _lib.assertRevert(
        distributor.withdraw(),
        'AudiusClaimDistributor: Withdraw failed, cannot claim until after validBlocks diff'
      )
    })

    it('Confirm successful withdrawal flow', async function () {
      const treeIndex0 = 0
      const treeIndex1 = 1

      // Confirm initial balances of withdrawAddress and distributorContract
      assert.equal(await token.balanceOf(distributor.address), distributorContractInitialTokenSupply)
      assert.equal(await token.balanceOf(withdrawAddress), 0)
      assert.equal(await token.balanceOf(claimant1Acct), 0)

      // Generate merkle proof & successfully submit claim to contract
      const proof1 = tree.getProof(treeIndex0, claimant1Acct, claimant1Amt)
      await distributor.claim(treeIndex0, claimant1Acct, claimant1Amt, proof1)

      // Confirm token balances reflect successful claim
      assert.equal(await token.balanceOf(distributor.address), distributorContractInitialTokenSupply - claimant1Amt)
      assert.equal(await token.balanceOf(claimant1Acct), claimant1Amt)

      // Forward blocks to surpass withdrawBlock
      await time.advanceBlockTo(withdrawBlock)

      // Successfully submit withdraw request
      await distributor.withdraw()

      // Confirm updated balances of withdrawAddress and distributorContract
      assert.equal(await token.balanceOf(distributor.address), 0)
      assert.equal(await token.balanceOf(withdrawAddress), distributorContractInitialTokenSupply - claimant1Amt)
      assert.equal(await token.balanceOf(claimant1Acct), claimant1Amt)
      assert.equal(await token.balanceOf(claimant2Acct), 0)

      // Confirm valid claim request fails after tokens have been withdrawn
      const proof2 = tree.getProof(treeIndex1, claimant2Acct, claimant2Amt)
      await _lib.assertRevert(
        distributor.claim(treeIndex1, claimant2Acct, claimant2Amt, proof2),
        'revert ERC20: transfer amount exceeds balance'
      )
    })
  })
})