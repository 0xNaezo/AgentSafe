use std::{error::Error, io, path::PathBuf};

use anchor_lang::{AccountDeserialize, AccountSerialize};
use anchor_program::{state::Vault, SECONDS_PER_DAY, SECONDS_PER_HOUR, VAULT_SEED};
use litesvm::{types::TransactionResult, LiteSVM};
use solana_account::Account;
use solana_clock::Clock;
use solana_instruction::{AccountMeta, Instruction};
use solana_instruction_error::InstructionError;
use solana_keypair::Keypair;
use solana_program_option::COption;
use solana_program_pack::Pack;
use solana_signer::Signer;
use solana_transaction::Transaction;
use solana_transaction_error::TransactionError;
use spl_token_interface::state::{Account as TokenAccount, AccountState, Mint};

const TOKEN_DECIMALS: u8 = 0;
const TOKEN_VAULT_SEED: &[u8] = b"token_vault";
const EXECUTE_PAYMENT_DISCRIMINATOR: [u8; 8] = [86, 4, 7, 7, 120, 139, 232, 139];
const DAILY_LIMIT_EXCEEDED_CODE: u32 = 6000;
const HOURLY_LIMIT_EXCEEDED_CODE: u32 = 6001;
const MATH_OVERFLOW_CODE: u32 = 6003;

type TestResult<T = ()> = Result<T, Box<dyn Error>>;

#[test]
fn daily_reset_allows_new_day_spend() -> TestResult {
    let mut ctx = TestContext::new(TestSetup {
        daily_limit: 1_000,
        hourly_limit: 700,
        onetime_limit: 700,
        vault_balance: 2_000,
        spent_today: 0,
        spent_hour: 0,
        last_reset_time: SECONDS_PER_DAY,
        current_time: SECONDS_PER_DAY,
    })?;

    ctx.execute_payment(700)?.assert_success()?;

    assert_eq!(ctx.vault()?.spent_today, 700);
    assert_eq!(ctx.vault()?.spent_hour, 700);

    ctx.set_clock(2 * SECONDS_PER_DAY);
    ctx.execute_payment(700)?.assert_success()?;

    assert_eq!(ctx.vault()?.spent_today, 700);
    assert_eq!(ctx.vault()?.spent_hour, 700);
    assert_eq!(ctx.vault()?.last_reset_time, 2 * SECONDS_PER_DAY);
    assert_eq!(ctx.token_balance(ctx.vault_token_account)?, 600);
    assert_eq!(ctx.token_balance(ctx.recipient_token_account)?, 1_400);

    Ok(())
}

#[test]
fn hourly_reset_allows_new_hour_spend() -> TestResult {
    let mut ctx = TestContext::new(TestSetup {
        daily_limit: 1_000,
        hourly_limit: 500,
        onetime_limit: 400,
        vault_balance: 1_000,
        spent_today: 0,
        spent_hour: 0,
        last_reset_time: SECONDS_PER_DAY,
        current_time: SECONDS_PER_DAY,
    })?;

    ctx.execute_payment(400)?.assert_success()?;

    assert_eq!(ctx.vault()?.spent_hour, 400);

    ctx.set_clock(SECONDS_PER_DAY + SECONDS_PER_HOUR);
    ctx.execute_payment(400)?.assert_success()?;

    assert_eq!(ctx.vault()?.spent_hour, 400);
    assert_eq!(ctx.vault()?.spent_today, 800);
    assert_eq!(
        ctx.vault()?.last_reset_time,
        SECONDS_PER_DAY + SECONDS_PER_HOUR
    );
    assert_eq!(ctx.token_balance(ctx.vault_token_account)?, 200);
    assert_eq!(ctx.token_balance(ctx.recipient_token_account)?, 800);

    Ok(())
}

#[test]
fn same_hour_rejects_exceeding_hourly_limit() -> TestResult {
    let mut ctx = TestContext::new(TestSetup {
        daily_limit: 2_000,
        hourly_limit: 500,
        onetime_limit: 400,
        vault_balance: 1_000,
        spent_today: 0,
        spent_hour: 0,
        last_reset_time: SECONDS_PER_DAY,
        current_time: SECONDS_PER_DAY,
    })?;

    ctx.execute_payment(300)?.assert_success()?;

    assert_eq!(ctx.vault()?.spent_hour, 300);

    ctx.set_clock(SECONDS_PER_DAY + 100);
    ctx.execute_payment(300)?
        .assert_custom_error(HOURLY_LIMIT_EXCEEDED_CODE)?;

    assert_eq!(ctx.vault()?.spent_hour, 300);
    assert_eq!(ctx.vault()?.spent_today, 300);
    assert_eq!(ctx.vault()?.last_reset_time, SECONDS_PER_DAY);
    assert_eq!(ctx.token_balance(ctx.vault_token_account)?, 700);
    assert_eq!(ctx.token_balance(ctx.recipient_token_account)?, 300);

    Ok(())
}

#[test]
fn same_day_does_not_reset_daily_spend() -> TestResult {
    let mut ctx = TestContext::new(TestSetup {
        daily_limit: 1_000,
        hourly_limit: 1_000,
        onetime_limit: 700,
        vault_balance: 2_000,
        spent_today: 0,
        spent_hour: 0,
        last_reset_time: SECONDS_PER_DAY,
        current_time: SECONDS_PER_DAY,
    })?;

    ctx.execute_payment(600)?.assert_success()?;

    assert_eq!(ctx.vault()?.spent_today, 600);
    assert_eq!(ctx.vault()?.spent_hour, 600);

    ctx.set_clock(SECONDS_PER_DAY + 1_000);

    ctx.execute_payment(500)?
        .assert_custom_error(DAILY_LIMIT_EXCEEDED_CODE)?;

    assert_eq!(ctx.vault()?.spent_today, 600);
    assert_eq!(ctx.vault()?.spent_hour, 600);
    assert_eq!(ctx.vault()?.last_reset_time, SECONDS_PER_DAY);
    assert_eq!(ctx.token_balance(ctx.vault_token_account)?, 1_400);
    assert_eq!(ctx.token_balance(ctx.recipient_token_account)?, 600);

    Ok(())
}

#[test]
fn math_overflow_is_rejected() -> TestResult {
    let mut ctx = TestContext::new(TestSetup {
        daily_limit: u64::MAX,
        hourly_limit: u64::MAX,
        onetime_limit: u64::MAX,
        vault_balance: 10,
        spent_today: u64::MAX,
        spent_hour: 0,
        last_reset_time: SECONDS_PER_DAY,
        current_time: SECONDS_PER_DAY,
    })?;

    ctx.execute_payment(1)?
        .assert_custom_error(MATH_OVERFLOW_CODE)?;

    assert_eq!(ctx.vault()?.spent_today, u64::MAX);
    assert_eq!(ctx.vault()?.spent_hour, 0);
    assert_eq!(ctx.token_balance(ctx.vault_token_account)?, 10);
    assert_eq!(ctx.token_balance(ctx.recipient_token_account)?, 0);

    Ok(())
}

#[test]
fn failed_spl_transfer_rolls_back_spent_counters() -> TestResult {
    let mut ctx = TestContext::new(TestSetup {
        daily_limit: 1_000,
        hourly_limit: 1_000,
        onetime_limit: 1_000,
        vault_balance: 100,
        spent_today: 0,
        spent_hour: 0,
        last_reset_time: SECONDS_PER_DAY,
        current_time: SECONDS_PER_DAY,
    })?;

    ctx.execute_payment(200)?.assert_failure()?;

    assert_eq!(ctx.vault()?.spent_today, 0);
    assert_eq!(ctx.vault()?.spent_hour, 0);
    assert_eq!(ctx.token_balance(ctx.vault_token_account)?, 100);
    assert_eq!(ctx.token_balance(ctx.recipient_token_account)?, 0);

    Ok(())
}

#[derive(Clone, Copy)]
struct TestSetup {
    daily_limit: u64,
    hourly_limit: u64,
    onetime_limit: u64,
    vault_balance: u64,
    spent_today: u64,
    spent_hour: u64,
    last_reset_time: i64,
    current_time: i64,
}

struct TestContext {
    svm: LiteSVM,
    agent: Keypair,
    vault_state: anchor_lang::prelude::Pubkey,
    vault_token_account: anchor_lang::prelude::Pubkey,
    recipient_token_account: anchor_lang::prelude::Pubkey,
}

impl TestContext {
    fn new(setup: TestSetup) -> TestResult<Self> {
        let mut svm = LiteSVM::new().with_default_programs();
        svm.add_program_from_file(anchor_program::ID, program_so_path()?)?;

        let owner = Keypair::new().pubkey();
        let agent = Keypair::new();
        let mint = Keypair::new().pubkey();
        let recipient = Keypair::new().pubkey();

        TxAssert(svm.airdrop(&agent.pubkey(), 1_000_000_000)).assert_success()?;
        set_clock(&mut svm, setup.current_time);

        let owner_key = to_anchor_pubkey(owner);
        let agent_key = to_anchor_pubkey(agent.pubkey());
        let mint_key = to_anchor_pubkey(mint);
        let recipient_key = to_anchor_pubkey(recipient);
        let (vault_state, vault_bump) = anchor_lang::prelude::Pubkey::find_program_address(
            &[VAULT_SEED, owner_key.as_ref(), mint_key.as_ref()],
            &anchor_program::ID,
        );
        let (vault_token_account, _) = anchor_lang::prelude::Pubkey::find_program_address(
            &[TOKEN_VAULT_SEED, vault_state.as_ref()],
            &anchor_program::ID,
        );
        let recipient_token_account = anchor_lang::prelude::Pubkey::new_unique();

        let vault = Vault {
            owner: owner_key,
            agent: agent_key,
            token_mint: mint_key,
            vault_bump,
            daily_limit: setup.daily_limit,
            hourly_limit: setup.hourly_limit,
            onetime_limit: setup.onetime_limit,
            spent_today: setup.spent_today,
            spent_hour: setup.spent_hour,
            last_reset_time: setup.last_reset_time,
        };

        set_vault_account(&mut svm, vault_state, vault)?;
        set_mint_account(&mut svm, mint_key, setup.vault_balance)?;
        set_token_account(
            &mut svm,
            vault_token_account,
            mint_key,
            vault_state,
            setup.vault_balance,
        )?;
        set_token_account(
            &mut svm,
            recipient_token_account,
            mint_key,
            recipient_key,
            0,
        )?;

        let token_program_account = svm
            .get_account(&spl_token_interface::ID)
            .ok_or_else(|| missing_account_error("token program", spl_token_interface::ID))?;
        if !token_program_account.executable {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "LiteSVM default SPL Token program is not executable",
            )
            .into());
        }
        assert_eq!(get_account(&svm, mint_key)?.owner, spl_token_interface::ID);

        Ok(Self {
            svm,
            agent,
            vault_state,
            vault_token_account,
            recipient_token_account,
        })
    }

    fn set_clock(&mut self, unix_timestamp: i64) {
        set_clock(&mut self.svm, unix_timestamp);
    }

    fn execute_payment(&mut self, amount: u64) -> TestResult<TxAssert> {
        self.svm.expire_blockhash();

        let tx = Transaction::new_signed_with_payer(
            &[execute_payment_ix(
                amount,
                self.agent.pubkey(),
                self.vault_state,
                self.vault_token_account,
                self.recipient_token_account,
                self.vault()?.token_mint,
            )?],
            Some(&self.agent.pubkey()),
            &[&self.agent],
            self.svm.latest_blockhash(),
        );

        Ok(TxAssert(self.svm.send_transaction(tx)))
    }

    fn vault(&self) -> TestResult<Vault> {
        let account = get_account(&self.svm, self.vault_state)?;
        let mut data = account.data.as_slice();
        Ok(Vault::try_deserialize(&mut data)?)
    }

    fn token_balance(&self, address: anchor_lang::prelude::Pubkey) -> TestResult<u64> {
        Ok(unpack_token_account(&get_account(&self.svm, address)?.data)?.amount)
    }
}

struct TxAssert(TransactionResult);

impl TxAssert {
    fn assert_success(self) -> TestResult {
        match self.0 {
            Ok(_) => Ok(()),
            Err(err) => Err(io::Error::other(format!(
                "expected transaction success, got {:?}",
                err.err
            ))
            .into()),
        }
    }

    fn assert_failure(self) -> TestResult {
        match self.0 {
            Ok(_) => Err(io::Error::other("expected transaction failure, got success").into()),
            Err(_) => Ok(()),
        }
    }

    fn assert_custom_error(self, expected_code: u32) -> TestResult {
        match self.0 {
            Ok(_) => Err(io::Error::other(format!(
                "expected custom error {expected_code}, got success"
            ))
            .into()),
            Err(err) => {
                let expected =
                    TransactionError::InstructionError(0, InstructionError::Custom(expected_code));
                if err.err == expected {
                    Ok(())
                } else {
                    Err(
                        io::Error::other(format!("expected {:?}, got {:?}", expected, err.err))
                            .into(),
                    )
                }
            }
        }
    }
}

fn execute_payment_ix(
    amount: u64,
    agent: solana_keypair::Address,
    vault_state: anchor_lang::prelude::Pubkey,
    vault_token_account: anchor_lang::prelude::Pubkey,
    recipient_token_account: anchor_lang::prelude::Pubkey,
    token_mint: anchor_lang::prelude::Pubkey,
) -> TestResult<Instruction> {
    let mut data = EXECUTE_PAYMENT_DISCRIMINATOR.to_vec();
    data.extend_from_slice(&amount_to_bytes(amount));

    let accounts = vec![
        AccountMeta::new_readonly(agent, true),
        AccountMeta::new(to_runtime_pubkey(vault_state), false),
        AccountMeta::new(to_runtime_pubkey(vault_token_account), false),
        AccountMeta::new(to_runtime_pubkey(recipient_token_account), false),
        AccountMeta::new_readonly(to_runtime_pubkey(token_mint), false),
        AccountMeta::new_readonly(spl_token_interface::ID, false),
    ];

    Ok(Instruction {
        program_id: to_runtime_pubkey(anchor_program::ID),
        accounts,
        data,
    })
}

fn amount_to_bytes(amount: u64) -> [u8; 8] {
    amount.to_le_bytes()
}

fn program_so_path() -> TestResult<PathBuf> {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .join("target")
        .join("deploy")
        .join("anchor_program.so");

    if path.exists() {
        Ok(path)
    } else {
        Err(io::Error::new(
            io::ErrorKind::NotFound,
            format!("program binary not found at {}", path.display()),
        )
        .into())
    }
}

fn set_clock(svm: &mut LiteSVM, unix_timestamp: i64) {
    let mut clock = svm.get_sysvar::<Clock>();
    clock.unix_timestamp = unix_timestamp;
    svm.set_sysvar(&clock);
}

fn set_vault_account(
    svm: &mut LiteSVM,
    address: anchor_lang::prelude::Pubkey,
    vault: Vault,
) -> TestResult {
    let mut data = Vec::with_capacity(Vault::INIT_SPACE);
    vault.try_serialize(&mut data)?;
    set_account(svm, address, anchor_program::ID, data)
}

fn set_mint_account(
    svm: &mut LiteSVM,
    address: anchor_lang::prelude::Pubkey,
    supply: u64,
) -> TestResult {
    let mint = Mint {
        mint_authority: COption::None,
        supply,
        decimals: TOKEN_DECIMALS,
        is_initialized: true,
        freeze_authority: COption::None,
    };
    let mut data = vec![0; Mint::LEN];
    Mint::pack(mint, &mut data)?;
    set_account(
        svm,
        address,
        to_anchor_pubkey(spl_token_interface::ID),
        data,
    )
}

fn set_token_account(
    svm: &mut LiteSVM,
    address: anchor_lang::prelude::Pubkey,
    mint: anchor_lang::prelude::Pubkey,
    owner: anchor_lang::prelude::Pubkey,
    amount: u64,
) -> TestResult {
    let token_account = TokenAccount {
        mint: to_runtime_pubkey(mint),
        owner: to_runtime_pubkey(owner),
        amount,
        delegate: COption::None,
        state: AccountState::Initialized,
        is_native: COption::None,
        delegated_amount: 0,
        close_authority: COption::None,
    };
    let mut data = vec![0; TokenAccount::LEN];
    TokenAccount::pack(token_account, &mut data)?;
    set_account(
        svm,
        address,
        to_anchor_pubkey(spl_token_interface::ID),
        data,
    )
}

fn set_account(
    svm: &mut LiteSVM,
    address: anchor_lang::prelude::Pubkey,
    owner: anchor_lang::prelude::Pubkey,
    data: Vec<u8>,
) -> TestResult {
    let lamports = svm.minimum_balance_for_rent_exemption(data.len());
    svm.set_account(
        to_runtime_pubkey(address),
        Account {
            lamports,
            data,
            owner: to_runtime_pubkey(owner),
            executable: false,
            rent_epoch: 0,
        },
    )?;
    Ok(())
}

fn get_account(svm: &LiteSVM, address: anchor_lang::prelude::Pubkey) -> TestResult<Account> {
    svm.get_account(&to_runtime_pubkey(address))
        .ok_or_else(|| missing_account_error("account", to_runtime_pubkey(address)).into())
}

fn unpack_token_account(data: &[u8]) -> TestResult<TokenAccount> {
    Ok(TokenAccount::unpack(data)?)
}

fn to_anchor_pubkey(pubkey: solana_keypair::Address) -> anchor_lang::prelude::Pubkey {
    anchor_lang::prelude::Pubkey::new_from_array(pubkey.to_bytes())
}

fn to_runtime_pubkey(pubkey: anchor_lang::prelude::Pubkey) -> solana_keypair::Address {
    solana_keypair::Address::new_from_array(pubkey.to_bytes())
}

fn missing_account_error(label: &str, address: solana_keypair::Address) -> io::Error {
    io::Error::new(
        io::ErrorKind::NotFound,
        format!("missing {label} {address}"),
    )
}
