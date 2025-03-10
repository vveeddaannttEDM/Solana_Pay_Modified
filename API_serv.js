const express = require('express');
const { Connection, PublicKey } = require('@solana/web3.js');
const { encodeURL, findReference, validateTransfer } = require('@solana/pay');
require('dotenv').config();

const app = express();
const port = 3000;
app.use(express.json());

// Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com');
const MERCHANT_WALLET = new PublicKey(process.env.MERCHANT_WALLET);

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

// 2. Check if a payment has been received
app.get('/check-payment/:reference', async (req, res) => {
    try {
        const reference = new PublicKey(req.params.reference);
        const transactions = await findReference(connection, reference);
        
        if (transactions.length > 0) {
            const isValid = await validateTransfer(connection, transactions[0], { recipient: MERCHANT_WALLET });
            if (isValid) {
                return res.json({ status: 'PAID' });
            }
        }
        
        res.json({ status: 'PENDING' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
