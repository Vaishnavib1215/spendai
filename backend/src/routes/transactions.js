const express = require('express');
const { runAsync, getAsync, allAsync } = require('../db');
const { verifyToken } = require('../auth');

const router = express.Router();
router.use(verifyToken);

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const rows = await allAsync(`
      SELECT t.*, c.category_name, c.category_type
      FROM Transactions t
      LEFT JOIN Categories c ON t.category_id = c.category_id
      WHERE t.user_id = ?
      ORDER BY t.transaction_date DESC
    `, [req.user.userId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/transactions
router.post('/', async (req, res) => {
  try {
    const { amount, category_id, transaction_date, payment_mode, description } = req.body;
    if (!amount || !transaction_date)
      return res.status(400).json({ error: 'amount and transaction_date are required' });
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      return res.status(400).json({ error: 'amount must be a positive number' });

    const result = await runAsync(
      'INSERT INTO Transactions (user_id, amount, category_id, transaction_date, payment_mode, description) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.userId, parseFloat(amount), category_id || null, transaction_date, payment_mode || null, description || null]
    );

    const inserted = await getAsync(
      'SELECT t.*, c.category_name, c.category_type FROM Transactions t LEFT JOIN Categories c ON t.category_id = c.category_id WHERE t.transaction_id = ?',
      [result.lastID]
    );
    res.status(201).json(inserted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const tx = await getAsync('SELECT * FROM Transactions WHERE transaction_id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    await runAsync('DELETE FROM Transactions WHERE transaction_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
