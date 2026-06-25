use anchor_lang::prelude::*;

#[account]
pub struct Vault {
    pub owner: Pubkey,
    pub agent: Pubkey,
    pub token_mint: Pubkey,
    pub vault_bump: u8,

    pub daily_limit: u64,
    pub hourly_limit: u64,
    pub onetime_limit: u64,

    pub spent_today: u64,
    pub spent_hour: u64,
    pub last_reset_time: i64,
}

impl Vault {
    pub const INIT_SPACE: usize = 8 + // discriminator
        32 + // owner
        32 + // agent
        32 + // token_mint
        1 +  // vault_bump
        8 +  // daily_limit
        8 +  // hourly_limit
        8 +  // onetime_limit
        8 +  // spent_today
        8 +  // spent_hour
        8; // last_reset_time
}
