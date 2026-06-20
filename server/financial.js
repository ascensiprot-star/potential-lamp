import { Router } from 'express';
import { z } from 'zod';
import { pool, writeAuditLog, ensureWallet } from './db.js';
import { serverError, requireSystem, requireAdmin } from './utils.js';

const router = Router();

const WalletMutateSchema = z.object({
    amount: z.number().positive(),
    description: z.string().optional(),
    reference_type: z.string().optional(),
    reference_id: z.string().uuid().optional(),
});

const BNPLCreateSchema = z.object({
    booking_id: z.string().uuid().optional(),
    total_amount: z.number().positive(),
    installments: z.number().int().min(2).max(6).default(3),
});

router.get('/wallet', async (req, res) => {
    const userId = req.session.user.id;
    try {
        await ensureWallet(userId);
        const { rows } = await pool.query(
            'SELECT id, balance, currency, is_frozen, updated_at FROM wallets WHERE user_id = $1',
            [userId]
        );
        if (!rows[0]) return res.status(404).json({ error: 'Wallet not found' });
        res.json({ wallet: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

router.get('/wallet/transactions', async (req, res) => {
    const userId = req.session.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    try {
        const { rows } = await pool.query(
            `SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
            [userId, limit]
        );
        res.json({ transactions: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/wallet/credit', requireSystem, async (req, res) => {
    // Direct wallet credits are system-only — Simon can call this internally.
    // Regular top-ups go through /api/wallet/topup which has payment gateway checks.
    const parse = WalletMutateSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues[0].message });
    const { amount, description, reference_type, reference_id, user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required for system calls' });
    
    try {
        await ensureWallet(user_id);
        const { rows } = await pool.query(
            `SELECT wallet_mutate($1, 'credit', $2, $3, $4::uuid, $5)`,
            [user_id, amount, reference_type || null, reference_id || null, description || 'Credit']
        );
        await writeAuditLog({
            actorId: user_id, action: 'wallet.credit', entity: 'wallet',
            payload: { amount, description, system: true }, ipAddress: req.ip
        });
        res.json({ transaction: rows[0].wallet_mutate });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/wallet/debit', requireSystem, async (req, res) => {
    const parse = WalletMutateSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues[0].message });
    const { amount, description, reference_type, reference_id, user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required for system calls' });
    
    try {
        await ensureWallet(user_id);
        const { rows } = await pool.query(
            `SELECT wallet_mutate($1, 'debit', $2, $3, $4::uuid, $5)`,
            [user_id, amount, reference_type || null, reference_id || null, description || 'Debit']
        );
        await writeAuditLog({
            actorId: user_id, action: 'wallet.debit', entity: 'wallet',
            payload: { amount, description, system: true }, ipAddress: req.ip
        });
        res.json({ transaction: rows[0].wallet_mutate });
    } catch (err) {
        if (err.message.includes('Insufficient balance') || err.message.includes('frozen')) {
            return res.status(422).json({ error: err.message });
        }
        serverError(res, err);
    }
});

router.get('/bnpl', async (req, res) => {
    const userId = req.session.user.id;
    try {
        const { rows } = await pool.query(
            `SELECT * FROM bnpl_agreements WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        res.json({ agreements: rows });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/bnpl/check', async (req, res) => {
    const userId = req.session.user.id;
    const { requested_amount } = req.body;
    try {
        const { rows: bookings } = await pool.query(
            `SELECT status, price FROM bookings WHERE customer_id = $1 OR customer_email = (SELECT email FROM users WHERE id = $1)`,
            [userId]
        );
        const completed = bookings.filter(b => b.status === 'completed');
        const cancelled = bookings.filter(b => b.status === 'cancelled');
        const totalSpent = completed.reduce((s, b) => s + parseFloat(b.price || 0), 0);
        const cancelRate = bookings.length > 0 ? cancelled.length / bookings.length : 0;

        const { rows: activeAgreements } = await pool.query(
            `SELECT SUM(total_amount - (paid_installments * installment_amount)) AS exposure
             FROM bnpl_agreements WHERE user_id = $1 AND status = 'active'`,
            [userId]
        );
        const currentExposure = parseFloat(activeAgreements[0]?.exposure || 0);

        const creditLimits = { champion: 5000, trusted: 3000, verified: 2000, rising: 1000, new: 0 };
        const { rows: trustRows } = await pool.query(
            `SELECT tier FROM provider_trust_scores WHERE provider_id = $1`,
            [userId]
        );
        const tier = trustRows[0]?.tier || (completed.length >= 5 ? 'rising' : 'new');
        const creditLimit = creditLimits[tier] || 0;

        const reasons = [];
        if (completed.length < 2) reasons.push('Need at least 2 completed bookings to qualify');
        if (cancelRate > 0.4) reasons.push('Cancellation rate too high');
        if (creditLimit === 0) reasons.push('Loyalty tier does not qualify for BNPL yet');
        if (currentExposure > creditLimit * 0.8) reasons.push('Existing BNPL exposure near limit');

        const eligible = reasons.length === 0;
        const maxAmount = Math.max(0, creditLimit - currentExposure);
        const approvedAmount = eligible ? Math.min(requested_amount || maxAmount, maxAmount) : 0;

        const repaymentOptions = eligible && approvedAmount > 0 ? [
            { installments: 2, per_installment: Math.ceil(approvedAmount / 2), fee: 0, label: '2 months, 0% fee' },
            { installments: 3, per_installment: Math.ceil(approvedAmount / 3), fee: Math.round(approvedAmount * 0.02), label: '3 months, 2% fee' },
            { installments: 6, per_installment: Math.ceil(approvedAmount / 6), fee: Math.round(approvedAmount * 0.05), label: '6 months, 5% fee' },
        ] : [];

        res.json({ eligible, reasons, credit_limit: creditLimit, approved_amount: approvedAmount, tier, current_exposure: currentExposure, repayment_options: repaymentOptions, completed_bookings: completed.length, total_spent: totalSpent });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/bnpl', async (req, res) => {
    const parse = BNPLCreateSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: parse.error.issues[0].message });
    const { booking_id, total_amount, installments } = parse.data;
    const userId = req.session.user.id;
    const installment_amount = Math.ceil(total_amount / installments);
    const next_due = new Date();
    next_due.setDate(next_due.getDate() + 30);
    try {
        const { rows } = await pool.query(
            `INSERT INTO bnpl_agreements(user_id, booking_id, total_amount, installments, installment_amount, next_due_date)
             VALUES ($1, $2::uuid, $3, $4, $5, $6) RETURNING *`,
            [userId, booking_id || null, total_amount, installments, installment_amount, next_due.toISOString().split('T')[0]]
        );
        await writeAuditLog({ actorId: userId, action: 'bnpl.create', entity: 'bnpl_agreements', entityId: rows[0].id, payload: { total_amount, installments }, ipAddress: req.ip });
        res.json({ agreement: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

router.get('/loyalty', async (req, res) => {
    const userId = req.session.user.id;
    try {
        const { rows: balance } = await pool.query(
            `SELECT COALESCE(SUM(coins), 0) AS balance FROM loyalty_ledger WHERE user_id = $1`,
            [userId]
        );
        const { rows: ledger } = await pool.query(
            `SELECT * FROM loyalty_ledger WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
            [userId]
        );
        res.json({ balance: parseInt(balance[0]?.balance || 0), ledger });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/loyalty/award', requireAdmin, async (req, res) => {
    const { user_id, coins, reason, reference_type, reference_id } = req.body;
    try {
        const { rows } = await pool.query(
            `INSERT INTO loyalty_ledger(user_id, coins, reason, reference_type, reference_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [user_id, coins, reason, reference_type || null, reference_id || null]
        );
        res.json({ entry: rows[0] });
    } catch (err) {
        serverError(res, err);
    }
});

router.post('/payout/request', async (req, res) => {
    const userId = req.session.user.id;
    const { amount } = req.body;
    if (!amount || amount < 500) return res.status(400).json({ error: 'Minimum payout is PKR 500' });
    try {
        const { rows: trust } = await pool.query(
            `SELECT tier FROM provider_trust_scores WHERE provider_id = $1`,
            [userId]
        );
        const tier = trust[0]?.tier;
        if (!tier || ['new', 'rising'].includes(tier)) {
            return res.status(422).json({ error: 'Payout requires at least "verified" trust tier' });
        }
        const { rows } = await pool.query(
            `SELECT wallet_mutate($1, 'payout', $2, 'payout_request', NULL, 'Provider payout request')`,
            [userId, amount]
        );
        await writeAuditLog({ actorId: userId, action: 'payout.request', entity: 'wallet', payload: { amount, tier }, ipAddress: req.ip });
        res.json({ status: 'pending_transfer', transaction: rows[0].wallet_mutate, message: 'Payout initiated. Transfer within 24 hours for verified providers.' });
    } catch (err) {
        if (err.message.includes('Insufficient') || err.message.includes('frozen')) {
            return res.status(422).json({ error: err.message });
        }
        serverError(res, err);
    }
});

export default router;
