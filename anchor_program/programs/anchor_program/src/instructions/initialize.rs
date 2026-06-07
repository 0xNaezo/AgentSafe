use crate::VAULT_SEED;
use crate::{error::AgentSafeError, state::Vault};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    pub agent: SystemAccount<'info>,

    #[account(mint::token_program = token_program)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = owner,
        space = Vault::INIT_SPACE,
        seeds = [VAULT_SEED, owner.key().as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub vault_state: Account<'info, Vault>,

    #[account(
        init,
        payer = owner,
        seeds = [b"token_vault", vault_state.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = vault_state,
        token::token_program = token_program,
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,

    pub token_program: Interface<'info, TokenInterface>,
}

pub(crate) fn handler(
    ctx: Context<Initialize>,
    daily_limit: u64,
    onetime_limit: u64,
) -> Result<()> {
    let vault_state = &mut ctx.accounts.vault_state;

    require!(
        daily_limit >= onetime_limit,
        AgentSafeError::InvalidLimitsConfiguration
    );

    vault_state.owner = ctx.accounts.owner.key();
    vault_state.agent = ctx.accounts.agent.key();
    vault_state.token_mint = ctx.accounts.token_mint.key();
    vault_state.vault_bump = ctx.bumps.vault_state;

    vault_state.daily_limit = daily_limit;
    vault_state.onetime_limit = onetime_limit;

    vault_state.spent_today = 0;
    vault_state.last_reset_time = Clock::get()?.unix_timestamp;

    Ok(())
}
