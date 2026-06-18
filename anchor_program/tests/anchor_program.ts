import * as anchor from "@anchor-lang/core";
import { BN, Program, web3 } from "@anchor-lang/core";
import { expect } from "chai";
import { Buffer } from "buffer";
import type { AnchorProgram } from "../target/types/anchor_program";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const program = anchor.workspace.AnchorProgram as Program<AnchorProgram>;
const connection = provider.connection;

const TOKEN_PROGRAM_ID = anchor.utils.token.TOKEN_PROGRAM_ID;
const VAULT_SEED = Buffer.from("vault");
const TOKEN_VAULT_SEED = Buffer.from("token_vault");
const MINT_SIZE = 82;
const TOKEN_ACCOUNT_SIZE = 165;
const TOKEN_DECIMALS = 0;

type TestVault = {
  owner: web3.Keypair;
  agent: web3.Keypair;
  recipient: web3.Keypair;
  mint: web3.PublicKey;
  vaultState: web3.PublicKey;
  vaultBump: number;
  vaultTokenAccount: web3.PublicKey;
  recipientTokenAccount: web3.PublicKey;
  dailyLimit: number;
  onetimeLimit: number;
};

describe("anchor_program", () => {
  it("initializes a vault and its token account", async () => {
    const ctx = await setupVault({
      dailyLimit: 1_000,
      onetimeLimit: 500,
      vaultBalance: 1_000,
    });

    const vault = await program.account.vault.fetch(ctx.vaultState);
    expect(vault.owner.equals(ctx.owner.publicKey)).to.equal(true);
    expect(vault.agent.equals(ctx.agent.publicKey)).to.equal(true);
    expect(vault.tokenMint.equals(ctx.mint)).to.equal(true);
    expect(vault.vaultBump).to.equal(ctx.vaultBump);
    expect(vault.dailyLimit.toNumber()).to.equal(1_000);
    expect(vault.onetimeLimit.toNumber()).to.equal(500);
    expect(vault.spentToday.toNumber()).to.equal(0);
    expect(vault.lastResetTime.toNumber()).to.be.greaterThan(0);

    const tokenAccount = await fetchTokenAccount(ctx.vaultTokenAccount);
    expect(tokenAccount.mint.equals(ctx.mint)).to.equal(true);
    expect(tokenAccount.owner.equals(ctx.vaultState)).to.equal(true);
    expect(tokenAccount.amount).to.equal(1_000);
  });

  it("lets the assigned agent execute a payment", async () => {
    const ctx = await setupVault({
      dailyLimit: 1_000,
      onetimeLimit: 500,
      vaultBalance: 1_000,
    });

    await executePayment(ctx, 300);

    expect(await tokenBalance(ctx.vaultTokenAccount)).to.equal(700);
    expect(await tokenBalance(ctx.recipientTokenAccount)).to.equal(300);

    const vault = await program.account.vault.fetch(ctx.vaultState);
    expect(vault.spentToday.toNumber()).to.equal(300);
  });

  it("rejects a payment above the one-time limit", async () => {
    const ctx = await setupVault({
      dailyLimit: 1_000,
      onetimeLimit: 500,
      vaultBalance: 1_000,
    });

    await expectAnchorError(executePayment(ctx, 501), [
      "OnetimeLimitExceeded",
      "onetimeLimitExceeded",
    ]);

    expect(await tokenBalance(ctx.vaultTokenAccount)).to.equal(1_000);
    expect(await tokenBalance(ctx.recipientTokenAccount)).to.equal(0);

    const vault = await program.account.vault.fetch(ctx.vaultState);
    expect(vault.spentToday.toNumber()).to.equal(0);
  });

  it("rejects payments that exceed the daily limit in aggregate", async () => {
    const ctx = await setupVault({
      dailyLimit: 1_000,
      onetimeLimit: 700,
      vaultBalance: 1_500,
    });

    await executePayment(ctx, 600);
    await expectAnchorError(executePayment(ctx, 500), [
      "DailyLimitExceeded",
      "dailyLimitExceeded",
    ]);

    expect(await tokenBalance(ctx.vaultTokenAccount)).to.equal(900);
    expect(await tokenBalance(ctx.recipientTokenAccount)).to.equal(600);

    const vault = await program.account.vault.fetch(ctx.vaultState);
    expect(vault.spentToday.toNumber()).to.equal(600);
  });

  it("allows payments exactly on the configured limits", async () => {
    const ctx = await setupVault({
      dailyLimit: 1_000,
      onetimeLimit: 500,
      vaultBalance: 1_000,
    });

    await executePayment(ctx, 500);
    await executePayment(ctx, 500);

    expect(await tokenBalance(ctx.vaultTokenAccount)).to.equal(0);
    expect(await tokenBalance(ctx.recipientTokenAccount)).to.equal(1_000);

    const vault = await program.account.vault.fetch(ctx.vaultState);
    expect(vault.spentToday.toNumber()).to.equal(1_000);
  });

  it("rejects payments signed by another agent", async () => {
    const ctx = await setupVault({
      dailyLimit: 1_000,
      onetimeLimit: 500,
      vaultBalance: 1_000,
    });
    const wrongAgent = web3.Keypair.generate();

    await fundAccounts([wrongAgent.publicKey]);

    await expectAnchorError(
      executePayment(ctx, 100, { agent: wrongAgent.publicKey }, [wrongAgent]),
      ["ConstraintHasOne"],
    );

    expect(await tokenBalance(ctx.vaultTokenAccount)).to.equal(1_000);
    expect(await tokenBalance(ctx.recipientTokenAccount)).to.equal(0);
  });

  it("rejects a substituted token mint", async () => {
    const ctx = await setupVault({
      dailyLimit: 1_000,
      onetimeLimit: 500,
      vaultBalance: 1_000,
    });
    const otherMint = await createMint(provider.publicKey);

    await expectAnchorError(
      executePayment(ctx, 100, { tokenMint: otherMint }),
      ["ConstraintTokenMint", "ConstraintAddress"],
    );

    expect(await tokenBalance(ctx.vaultTokenAccount)).to.equal(1_000);
    expect(await tokenBalance(ctx.recipientTokenAccount)).to.equal(0);
  });

  it("rejects a recipient token account for another mint", async () => {
    const ctx = await setupVault({
      dailyLimit: 1_000,
      onetimeLimit: 500,
      vaultBalance: 1_000,
    });
    const otherMint = await createMint(provider.publicKey);
    const wrongRecipientAccount = await createTokenAccount(
      otherMint,
      ctx.recipient.publicKey,
    );

    await expectAnchorError(
      executePayment(ctx, 100, { toTokenAccount: wrongRecipientAccount }),
      ["ConstraintTokenMint"],
    );

    expect(await tokenBalance(ctx.vaultTokenAccount)).to.equal(1_000);
    expect(await tokenBalance(ctx.recipientTokenAccount)).to.equal(0);
  });

  it("rejects a substituted vault token account", async () => {
    const ctx = await setupVault({
      dailyLimit: 1_000,
      onetimeLimit: 500,
      vaultBalance: 1_000,
    });
    const wrongVaultTokenAccount = await createTokenAccount(
      ctx.mint,
      ctx.vaultState,
    );

    await mintTo(ctx.mint, wrongVaultTokenAccount, 1_000);

    await expectAnchorError(
      executePayment(ctx, 100, { vaultTokenAccount: wrongVaultTokenAccount }),
      ["ConstraintSeeds"],
    );

    expect(await tokenBalance(ctx.vaultTokenAccount)).to.equal(1_000);
    expect(await tokenBalance(ctx.recipientTokenAccount)).to.equal(0);
  });
});

/**
 * Creates and initializes a complete test vault with configured spending limits and initial token balance.
 *
 * @param dailyLimit - Maximum amount that can be spent in a single day
 * @param onetimeLimit - Maximum amount that can be spent in a single transaction
 * @param vaultBalance - Initial amount of tokens to mint into the vault
 * @returns A TestVault object containing all generated keypairs, derived vault addresses, and configured limits
 */
async function setupVault({
  dailyLimit,
  onetimeLimit,
  vaultBalance,
}: {
  dailyLimit: number;
  onetimeLimit: number;
  vaultBalance: number;
}): Promise<TestVault> {
  const owner = web3.Keypair.generate();
  const agent = web3.Keypair.generate();
  const recipient = web3.Keypair.generate();

  await fundAccounts([owner.publicKey, agent.publicKey]);

  const mint = await createMint(provider.publicKey);
  const [vaultState, vaultBump] = findVaultState(owner.publicKey, mint);
  const vaultTokenAccount = findVaultTokenAccount(vaultState);
  const recipientTokenAccount = await createTokenAccount(
    mint,
    recipient.publicKey,
  );

  await program.methods
    .initialize(new BN(dailyLimit), new BN(onetimeLimit))
    .accountsPartial({
      owner: owner.publicKey,
      agent: agent.publicKey,
      tokenMint: mint,
      vaultState,
      vaultTokenAccount,
      systemProgram: web3.SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers([owner])
    .rpc();

  await mintTo(mint, vaultTokenAccount, vaultBalance);

  return {
    owner,
    agent,
    recipient,
    mint,
    vaultState,
    vaultBump,
    vaultTokenAccount,
    recipientTokenAccount,
    dailyLimit,
    onetimeLimit,
  };
}

/**
 * Executes a payment transaction in the vault program.
 *
 * @param overrides - Account address overrides (uses ctx defaults if not provided)
 * @param signers - Transaction signers (defaults to ctx.agent)
 * @returns The transaction signature
 */
async function executePayment(
  ctx: TestVault,
  amount: number,
  overrides: Partial<{
    agent: web3.PublicKey;
    vaultState: web3.PublicKey;
    vaultTokenAccount: web3.PublicKey;
    toTokenAccount: web3.PublicKey;
    tokenMint: web3.PublicKey;
    tokenProgram: web3.PublicKey;
  }> = {},
  signers: web3.Signer[] = [ctx.agent],
): Promise<string> {
  return program.methods
    .executePayment(new BN(amount))
    .accountsStrict({
      agent: overrides.agent ?? ctx.agent.publicKey,
      vaultState: overrides.vaultState ?? ctx.vaultState,
      vaultTokenAccount: overrides.vaultTokenAccount ?? ctx.vaultTokenAccount,
      toTokenAccount: overrides.toTokenAccount ?? ctx.recipientTokenAccount,
      tokenMint: overrides.tokenMint ?? ctx.mint,
      tokenProgram: overrides.tokenProgram ?? TOKEN_PROGRAM_ID,
    })
    .signers(signers)
    .rpc();
}

/**
 * Creates an SPL token mint.
 *
 * @param mintAuthority - The public key authorized to mint tokens
 * @returns The public key of the created mint
 */
async function createMint(
  mintAuthority: web3.PublicKey,
): Promise<web3.PublicKey> {
  const mint = web3.Keypair.generate();
  const lamports =
    await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  await sendInstructions(
    [
      web3.SystemProgram.createAccount({
        fromPubkey: provider.publicKey,
        newAccountPubkey: mint.publicKey,
        lamports,
        space: MINT_SIZE,
        programId: TOKEN_PROGRAM_ID,
      }),
      initializeMint2Instruction(mint.publicKey, mintAuthority),
    ],
    [mint],
  );

  return mint.publicKey;
}

/**
 * Creates a new SPL token account for the specified mint and owner.
 *
 * @returns The public key of the created token account.
 */
async function createTokenAccount(
  mint: web3.PublicKey,
  owner: web3.PublicKey,
): Promise<web3.PublicKey> {
  const account = web3.Keypair.generate();
  const lamports =
    await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);

  await sendInstructions(
    [
      web3.SystemProgram.createAccount({
        fromPubkey: provider.publicKey,
        newAccountPubkey: account.publicKey,
        lamports,
        space: TOKEN_ACCOUNT_SIZE,
        programId: TOKEN_PROGRAM_ID,
      }),
      initializeAccount3Instruction(account.publicKey, mint, owner),
    ],
    [account],
  );

  return account.publicKey;
}

/**
 * Mints tokens to the specified token account.
 */
async function mintTo(
  mint: web3.PublicKey,
  tokenAccount: web3.PublicKey,
  amount: number,
): Promise<void> {
  await sendInstructions([
    new web3.TransactionInstruction({
      programId: TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: tokenAccount, isSigner: false, isWritable: true },
        { pubkey: provider.publicKey, isSigner: true, isWritable: false },
      ],
      data: Buffer.concat([Buffer.from([7]), u64Le(amount)]),
    }),
  ]);
}

/**
 * Transfers one SOL to each of the specified accounts.
 */
async function fundAccounts(pubkeys: web3.PublicKey[]): Promise<void> {
  await sendInstructions(
    pubkeys.map((pubkey) =>
      web3.SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: pubkey,
        lamports: web3.LAMPORTS_PER_SOL,
      }),
    ),
  );
}

/**
 * Sends and confirms a transaction containing the specified instructions.
 *
 * @returns The transaction signature.
 */
async function sendInstructions(
  instructions: web3.TransactionInstruction[],
  signers: web3.Signer[] = [],
): Promise<string> {
  return provider.sendAndConfirm(
    new web3.Transaction().add(...instructions),
    signers,
  );
}

/**
 * Constructs a transaction instruction to initialize an SPL token mint.
 *
 * @returns A transaction instruction for the SPL token program's `initializeMint2` operation.
 */
function initializeMint2Instruction(
  mint: web3.PublicKey,
  mintAuthority: web3.PublicKey,
): web3.TransactionInstruction {
  return new web3.TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [{ pubkey: mint, isSigner: false, isWritable: true }],
    data: Buffer.concat([
      Buffer.from([20, TOKEN_DECIMALS]),
      mintAuthority.toBuffer(),
      Buffer.from([0]),
    ]),
  });
}

/**
 * Constructs an instruction to initialize an SPL token account.
 *
 * @param account - The token account to initialize
 * @param mint - The mint associated with the token account
 * @param owner - The owner of the token account
 * @returns A transaction instruction for the SPL Token program
 */
function initializeAccount3Instruction(
  account: web3.PublicKey,
  mint: web3.PublicKey,
  owner: web3.PublicKey,
): web3.TransactionInstruction {
  return new web3.TransactionInstruction({
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from([18]), owner.toBuffer()]),
  });
}

/**
 * Derives the vault PDA and bump for the given owner and mint.
 *
 * @param owner - The owner's public key
 * @param mint - The token mint's public key
 * @returns A tuple containing the derived vault PDA public key and its bump seed
 */
function findVaultState(
  owner: web3.PublicKey,
  mint: web3.PublicKey,
): [web3.PublicKey, number] {
  return web3.PublicKey.findProgramAddressSync(
    [VAULT_SEED, owner.toBuffer(), mint.toBuffer()],
    program.programId,
  );
}

/**
 * Derives the vault token account address.
 *
 * @returns The vault token account public key.
 */
function findVaultTokenAccount(vaultState: web3.PublicKey): web3.PublicKey {
  return web3.PublicKey.findProgramAddressSync(
    [TOKEN_VAULT_SEED, vaultState.toBuffer()],
    program.programId,
  )[0];
}

async function tokenBalance(tokenAccount: web3.PublicKey): Promise<number> {
  const balance = await connection.getTokenAccountBalance(tokenAccount);
  return Number(balance.value.amount);
}

async function fetchTokenAccount(tokenAccount: web3.PublicKey): Promise<{
  mint: web3.PublicKey;
  owner: web3.PublicKey;
  amount: number;
}> {
  const account = await connection.getAccountInfo(tokenAccount);
  expect(account).to.not.equal(null);

  return {
    mint: new web3.PublicKey(account!.data.subarray(0, 32)),
    owner: new web3.PublicKey(account!.data.subarray(32, 64)),
    amount: readU64Le(account!.data, 64),
  };
}

/**
 * Asserts that a promise rejects with one of the expected Anchor error codes.
 *
 * @param promise - A promise expected to reject with an Anchor error
 * @param expectedCodes - The acceptable error codes
 */
async function expectAnchorError(
  promise: Promise<unknown>,
  expectedCodes: string[],
): Promise<void> {
  try {
    await promise;
    expect.fail(`Expected Anchor error ${expectedCodes.join(" or ")}`);
  } catch (err) {
    const code = anchorErrorCode(err);
    expect(code, errorMessage(err)).to.be.oneOf(expectedCodes);
  }
}

function anchorErrorCode(err: unknown): string | undefined {
  const error = err as {
    error?: { errorCode?: { code?: string } };
    code?: string;
  };

  return error.error?.errorCode?.code ?? error.code;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

function u64Le(value: number): Buffer {
  return new BN(value).toArrayLike(Buffer, "le", 8);
}

function readU64Le(data: Buffer | Uint8Array, offset: number): number {
  return new BN(data.subarray(offset, offset + 8), "le").toNumber();
}
