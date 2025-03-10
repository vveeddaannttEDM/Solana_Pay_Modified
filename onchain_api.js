// API conversion from off chain to on chain backend services
const express = require('express');
const { Connection, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const { encodeURL } = require('@solana/pay');
require('dotenv').config();

const app = express();
const port = 3000;
app.use(express.json());

// Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
const MERCHANT_WALLET = new PublicKey(process.env.MERCHANT_WALLET);
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID);

// 1. Create a Solana Pay payment request
app.post('/create-payment', async (req, res) => {
    try {
        const { amount, reference } = req.body;
        
        const paymentRequest = encodeURL({
            recipient: MERCHANT_WALLET,
            amount,
            reference: new PublicKey(reference),
            label: 'Merchant Store',
            message: 'Payment for Order',
        });
        
        res.json({ url: paymentRequest.toString() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Submit payment record on-chain
app.post('/store-payment', async (req, res) => {
    try {
        const { payer, reference, amount } = req.body;
        const payerPublicKey = new PublicKey(payer);
        
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: payerPublicKey,
                toPubkey: MERCHANT_WALLET,
                lamports: amount * 1e9, // Convert SOL to lamports
            })
        );
        
        res.json({ transaction: transaction.serialize().toString('base64') });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Check if a payment has been received on-chain
app.get('/check-payment/:reference', async (req, res) => {
    try {
        const reference = new PublicKey(req.params.reference);
        const transactionHistory = await connection.getSignaturesForAddress(reference);
        
        if (transactionHistory.length > 0) {
            return res.json({ status: 'PAID' });
        }
        
        res.json({ status: 'PENDING' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
