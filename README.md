### Audius Claim Distribution

This repo contains the contract to do token claim distribution for a set of users by precomputing the merkle root hash, indices and proofs for all users before loading that hash on chain.

### How to use
There are two pieces of information that the migrations depend on and both are set in contract-config.js, the `tokenAddress` and `merkleRoot`. `tokenAddress` is the address for the ERC-20 Audius token and the `merkleRoot` instructions are given below.

### Generating the merkle root and the JSON file
This Uniswap repo (https://github.com/Uniswap/merkle-distributor) contains the contract that we vendored in this repo. It also contains scripts to convert a json object of { walletAddress: tokenAmount } into the merkle object. In order to generate that object:

1. In the scripts/ folder run `python csv_to_json.py` to convert our csv with columns `wallet` and `tokens` to a uniswap script compatible { walletAddress: tokenAmount } object.
2. In the `merkle-distributor` repo under scripts/ run `tsc` to generate the node.js files.
3. Run `node generate-merkle-root.js -i allocation_output.json >> allocation_merkle_output.json` to get the merkle object
4. Run `node verify-merkle-root.js -i allocation_merkle_output.json` against the output merkle json object to verify it's validity.
5. Once the validation passes, the object is finalized and the merkle root hash can be used

### Mainnet artifacts
All data for claim distribution on mainnet is in `./mainnet-artifacts/`

1. `dataset-query.sql` - this query was run against an Audius discovery provider to generate the user token claim data set, stored at `claim-dataset.csv`.
  It can be reproced against any discovery provider that has indexed up to blocknumber of `17782488` against POA mainnet. This blocknumber is visible in the dataset as `max_blocknumber`.
2. `merkle-input.json` - contains a JSON-formatted array of { "address", "earnings", "reasons" } entries.
  Generated from step 1 above: `python scripts/csv_to_json.py ./mainnet-artifacts/claim-dataset.csv ./mainnet-artifacts/merkle-input.json`
3. `merkle-output.json` - contains the full merkle tree, including its root hash. This hash is used in the `AudiusClaimDistributor` contract constructor.
  Generated from step 3 above - `node scripts/generate-merkle-root.js -i ./mainnet-artifacts/merkle-input.json >> ./mainnet-artifacts/merkle-output.json`

### Shoutout
Thanks to the Uniswap team for open-sourcing this scalable mechanic!
