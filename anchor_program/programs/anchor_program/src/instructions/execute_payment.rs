use crate::{
    constants::{SECONDS_PER_DAY, SECONDS_PER_HOUR},
    error::AgentSafeError,
    state::Vault,
    VAULT_SEED,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

#[derive(Accounts)]
pub struct ExecutePayment<'info> {
    pub agent: Signer<'info>,

    #[account(
        mut,
        has_one = agent
    )]
    pub vault_state: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [b"token_vault", vault_state.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_state,
        token::token_program = token_program,
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        token::mint = token_mint,
        token::token_program = token_program,
    )]
    pub to_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        address = vault_state.token_mint,
        mint::token_program = token_program,
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub(crate) fn handler(ctx: Context<ExecutePayment>, amount: u64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    let (owner, token_mint, vault_bump) = {
        let vault_state = &mut ctx.accounts.vault_state;

        let last_reset_time_d = vault_state.last_reset_time / SECONDS_PER_DAY;
        let time_d = now / SECONDS_PER_DAY;

        let last_reset_time_h = vault_state.last_reset_time / SECONDS_PER_HOUR;
        let time_h = now / SECONDS_PER_HOUR;

        if time_d > last_reset_time_d {
            vault_state.spent_today = 0;
            vault_state.spent_hour = 0;
            vault_state.last_reset_time = now;
        }

        if time_h > last_reset_time_h {
            vault_state.spent_hour = 0;
            vault_state.last_reset_time = now;
        }

        require!(
            vault_state.onetime_limit >= amount,
            AgentSafeError::OnetimeLimitExceeded
        );

        let new_spent_today = amount
            .checked_add(vault_state.spent_today)
            .ok_or(AgentSafeError::MathOverflow)?;

        let new_spent_hour = amount
            .checked_add(vault_state.spent_hour)
            .ok_or(AgentSafeError::MathOverflow)?;

        require!(
            vault_state.daily_limit >= new_spent_today,
            AgentSafeError::DailyLimitExceeded
        );

        require!(
            vault_state.hourly_limit >= new_spent_hour,
            AgentSafeError::HourlyLimitExceeded
        );

        vault_state.spent_today = new_spent_today;
        vault_state.spent_hour = new_spent_hour;

        (
            vault_state.owner,
            vault_state.token_mint,
            vault_state.vault_bump,
        )
    };

    let vault_bump_seed = [vault_bump];
    let vault_state_seeds = &[
        VAULT_SEED,
        owner.as_ref(),
        token_mint.as_ref(),
        vault_bump_seed.as_ref(),
    ];
    let signer_seeds = &[&vault_state_seeds[..]];

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.vault_token_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.to_token_account.to_account_info(),
        authority: ctx.accounts.vault_state.to_account_info(),
    };

    let cpi_context =
        CpiContext::new_with_signer(ctx.accounts.token_program.key(), cpi_accounts, signer_seeds);

    token_interface::transfer_checked(cpi_context, amount, ctx.accounts.token_mint.decimals)?;

    Ok(())
}
