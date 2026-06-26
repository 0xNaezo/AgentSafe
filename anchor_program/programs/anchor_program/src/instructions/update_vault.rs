use crate::{error::AgentSafeError, state::Vault};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateValue<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        has_one = owner
    )]
    pub vault_state: Account<'info, Vault>,
}

pub(crate) fn handler(
    ctx: Context<UpdateValue>,
    daily_limit: u64,
    hourly_limit: u64,
    onetime_limit: u64,
) -> Result<()> {
    let vault_state = &mut ctx.accounts.vault_state;

    require!(
        daily_limit >= hourly_limit && hourly_limit >= onetime_limit,
        AgentSafeError::InvalidLimitsConfiguration
    );

    vault_state.daily_limit = daily_limit;
    vault_state.hourly_limit = hourly_limit;
    vault_state.onetime_limit = onetime_limit;

    Ok(())
}
