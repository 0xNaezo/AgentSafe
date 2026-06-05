use anchor_lang::prelude::*;

#[error_code]
pub enum AgentSafeError {
    #[msg("You are not the assigned agent for this vault.")]
    UnauthorizedAgent,

    #[msg("The requested amount exceeds the daily limit.")]
    DailyLimitExceeded,

    #[msg("The requested amount exceeds the single payment limit.")]
    OnetimeLimitExceeded,
}
