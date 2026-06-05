#![allow(clippy::diverging_sub_expression)]

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;

declare_id!("98yejd2ParWqYVsi1AwdJBwxSsrzCyMRX1EKVVmTPqhy");

#[program]
pub mod anchor_program {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        daily_limit: u64,
        onetime_limit: u64,
    ) -> Result<()> {
        initialize::initialize_vault(ctx, daily_limit, onetime_limit)
    }
}
