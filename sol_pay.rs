use anchor_lang::prelude::*;

// Define the Solana program
#[program]
mod solana_pay_contract {
    use super::*;
    
    // Function to store a payment on-chain
    pub fn store_payment(ctx: Context<StorePayment>, reference: String, amount: u64) -> Result<()> {
        let payment = &mut ctx.accounts.payment;
        payment.reference = reference;
        payment.amount = amount;
        payment.status = "PENDING".to_string();
        Ok(())
    }
    
    // Function to confirm a payment
    pub fn confirm_payment(ctx: Context<ConfirmPayment>) -> Result<()> {
        let payment = &mut ctx.accounts.payment;
        payment.status = "PAID".to_string();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct StorePayment<'info> {
    #[account(init, payer = user, space = 128)]
    pub payment: Account<'info, Payment>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConfirmPayment<'info> {
    #[account(mut)]
    pub payment: Account<'info, Payment>,
}

#[account]
pub struct Payment {
    pub reference: String,
    pub amount: u64,
    pub status: String,
}
