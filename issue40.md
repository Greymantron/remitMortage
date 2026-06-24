## Description
New contributors and testers currently have no instructions for deploying contracts to Stellar Testnet, funding wallets with test USDC, or running the protocol end-to-end. This documentation gap blocks anyone from testing the system outside of unit tests.

**Branch:** `docs/testnet-deployment-guide`

**Example commits:**
- `docs: add step-by-step testnet deployment guide`
- `docs: add USDC faucet and wallet funding instructions`
- `docs: add end-to-end testing walkthrough with screenshots`

## Scope & Tasks
1. **Deployment Guide (`docs/DEPLOYMENT.md`):**
   * Prerequisites — Rust, Stellar CLI, Freighter wallet, testnet friendbot.
   * Step-by-step instructions for building WASM binaries.
   * Deploying each contract to testnet using `stellar contract deploy`.
   * Initializing contracts with the correct parameters and cross-references.
   * Storing deployed contract IDs in `.env` files.
2. **Faucet Guide (`docs/TESTNET_SETUP.md`):**
   * How to create a Stellar testnet account via Friendbot.
   * How to mint/obtain test USDC on Stellar testnet.
   * How to configure Freighter for testnet.
3. **End-to-End Walkthrough (`docs/E2E_TESTING.md`):**
   * A complete walkthrough of the borrower journey using the deployed contracts:
     1. Fund wallet → 2. Deposit into escrow → 3. Reach target → 4. Request loan → 5. Admin approves → 6. Disburse → 7. Repay.
   * Include example CLI commands for each step.
4. **README Update:** Add a "Testing on Testnet" section in the main README linking to these docs.

## Acceptance Criteria
- [ ] `docs/DEPLOYMENT.md` has reproducible deployment steps
- [ ] `docs/TESTNET_SETUP.md` covers wallet creation and USDC funding
- [ ] `docs/E2E_TESTING.md` walks through the full borrower journey
- [ ] All CLI commands in the guides are tested and correct
- [ ] README links to the new documentation