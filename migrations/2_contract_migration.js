const contractConfig = require('../contract-config.js')

const AudiusClaimDistributor = artifacts.require('AudiusClaimDistributor')

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {

    const config = contractConfig[network]
    let { audiusTokenAddress, merkleRoot, withdrawBlock, withdrawAddress } = config
    
    withdrawBlock = withdrawBlock || 120
    withdrawAddress = withdrawAddress || accounts[20]

    console.log("audiusTokenAddress", audiusTokenAddress)
    console.log("merkleRoot", merkleRoot)
    console.log("withdrawBlock", withdrawBlock)
    console.log("withdrawAddress", withdrawAddress)

    // import merkle root from data file
    await deployer.deploy(AudiusClaimDistributor, audiusTokenAddress, merkleRoot, withdrawBlock, withdrawAddress)
  })
}