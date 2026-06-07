use anchor_lang::prelude::*;

#[error_code]
pub enum AgentSafeError {
    #[msg("The requested amount exceeds the daily limit.")]
    DailyLimitExceeded,

    #[msg("The requested amount exceeds the single payment limit.")]
    OnetimeLimitExceeded,

    #[msg("A mathematical overflow occurred during calculation.")]
    MathOverflow,

    #[msg("Daily limit must be greater than or equal to the one-time limit.")]
    InvalidLimitsConfiguration,
}
