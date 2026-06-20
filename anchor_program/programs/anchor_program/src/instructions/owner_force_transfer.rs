use crate::{state::Vault, VAULT_SEED};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

#[derive(Accounts)]
pub struct OwnerForceTransfer<'info> {
    pub owner: Signer<'info>,

    #[account(mut, has_one = owner)]
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

pub(crate) fn handler(ctx: Context<OwnerForceTransfer>, amount: u64) -> Result<()> {
    let vault_state = &mut ctx.accounts.vault_state;

    let vault_bump_seed = [vault_state.vault_bump];
    let vault_state_seeds = &[
        VAULT_SEED,
        vault_state.owner.as_ref(),
        vault_state.token_mint.as_ref(),
        vault_bump_seed.as_ref(),
    ];
    let signer_seeds = &[&vault_state_seeds[..]];

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.vault_token_account.to_account_info(),
        mint: ctx.accounts.token_mint.to_account_info(),
        to: ctx.accounts.to_token_account.to_account_info(),
        authority: vault_state.to_account_info(),
    };

    let cpi_context =
        CpiContext::new_with_signer(ctx.accounts.token_program.key(), cpi_accounts, signer_seeds);

    token_interface::transfer_checked(cpi_context, amount, ctx.accounts.token_mint.decimals)?;

    Ok(())
}
