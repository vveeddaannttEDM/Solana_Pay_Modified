const express = require('express');
const { Connection, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const anchor = require('@project-serum/anchor');
require('dotenv').config();

const app = express();
const port = 3000;
app.use(express.json());

// Solana connection
const connection = new Connection('https://api.devnet.solana.com');
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID);
const provider = anchor.AnchorProvider.local();
anchor.setProvider(provider);
const program = new anchor.Program(require('./idl.json'), PROGRAM_ID, provider);

// 1. Create a Solana Pay payment request
app.post('/create-payment', async (req, res) => {
    try {
        const { amount, reference } = req.body;
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: provider.wallet.publicKey,
                toPubkey: new PublicKey(reference),
                lamports: amount * 1e9,
            })
        );
        res.json({ transaction: transaction.serialize().toString('base64') });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Store payment on-chain
app.post('/store-payment', async (req, res) => {
    try {
        const { reference, amount } = req.body;
        const tx = await program.rpc.storePayment(reference, new anchor.BN(amount), {
            accounts: {
                payment: anchor.web3.Keypair.generate().publicKey,
                user: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            },
        });
        res.json({ transaction: tx });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Confirm payment on-chain
app.post('/confirm-payment', async (req, res) => {
    try {
        const { reference } = req.body;
        const tx = await program.rpc.confirmPayment({
            accounts: {
                payment: new PublicKey(reference),
            },
        });
        res.json({ transaction: tx, status: 'PAID' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Check if a payment exists on-chain
app.get('/check-payment/:reference', async (req, res) => {
    try {
        const reference = req.params.reference;
        const paymentAccount = await program.account.payment.fetch(new PublicKey(reference));
        res.json({ status: paymentAccount.status, amount: paymentAccount.amount.toString() });
    } catch (error) {
        res.status(404).json({ error: 'Payment not found' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
