#![allow(clippy::diverging_sub_expression)]

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;

declare_id!("B6SpUd172qVcLhVfdQCrZLk3zpsuYkJ4ZYtCaoL2Dr2d");

#[program]
pub mod anchor_program {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        daily_limit: u64,
        hourly_limit: u64,
        onetime_limit: u64,
    ) -> Result<()> {
        initialize::handler(ctx, daily_limit, hourly_limit, onetime_limit)
    }

    pub fn execute_payment(ctx: Context<ExecutePayment>, amount: u64) -> Result<()> {
        execute_payment::handler(ctx, amount)
    }

    pub fn owner_force_transfer(ctx: Context<OwnerForceTransfer>, amount: u64) -> Result<()> {
        owner_force_transfer::handler(ctx, amount)
    }

    pub fn update_value(
        ctx: Context<UpdateValue>,
        daily_limit: u64,
        hourly_limit: u64,
        onetime_limit: u64,
    ) -> Result<()> {
        update_vault::handler(ctx, daily_limit, hourly_limit, onetime_limit)
    }
}
