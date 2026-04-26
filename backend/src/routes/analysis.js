const express = require('express');
const axios = require('axios');
const { runAsync, getAsync, allAsync } = require('../db');
const { verifyToken } = require('../auth');

const router = express.Router();
router.use(verifyToken);

const ML_SERVER = process.env.ML_SERVER_URL || 'http://localhost:5001';

// GET /api/analysis/run
router.get('/run', async (req, res) => {
  try {
    const transactions = await allAsync(`
      SELECT t.transaction_id, t.amount, t.transaction_date, t.payment_mode,
             c.category_name, c.category_type
      FROM Transactions t
      LEFT JOIN Categories c ON t.category_id = c.category_id
      WHERE t.user_id = ?
      ORDER BY t.transaction_date ASC
    `, [req.user.userId]);

    if (transactions.length < 3)
      return res.status(422).json({ error: 'Need at least 3 transactions to run analysis' });

    const mlRes = await axios.post(`${ML_SERVER}/analyze`, { transactions }, { timeout: 30000 });
    const result = mlRes.data;

    await runAsync(`
      INSERT INTO Predictions (user_id, week_number, predicted_spending, overspend_risk, reason, cluster_label, recommended_budget)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.user.userId, result.week_number, result.predicted_spending,
        result.overspend_risk ? 1 : 0, result.reason, result.cluster_label, result.recommended_budget]);

    res.json(result);
  } catch (err) {
    if (err.code === 'ECONNREFUSED')
      return res.status(503).json({ error: 'ML server is not running. Start the ml-server with: python app.py' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analysis/history
router.get('/history', async (req, res) => {
  try {
    const rows = await allAsync(
      'SELECT * FROM Predictions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/analysis/summary
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.userId;

    const [totalSpending, weeklySpending, monthlySpending, categoryBreakdown, weeklyTrend, budget, dayTypeSplit] = await Promise.all([
      getAsync('SELECT SUM(amount) as total, COUNT(*) as count FROM Transactions WHERE user_id = ?', [userId]),
      getAsync("SELECT SUM(amount) as total FROM Transactions WHERE user_id = ? AND transaction_date >= date('now', '-7 days')", [userId]),
      getAsync("SELECT SUM(amount) as total FROM Transactions WHERE user_id = ? AND transaction_date >= date('now', '-30 days')", [userId]),
      allAsync(`SELECT c.category_name, c.category_type, SUM(t.amount) as total
        FROM Transactions t LEFT JOIN Categories c ON t.category_id = c.category_id
        WHERE t.user_id = ? GROUP BY c.category_name ORDER BY total DESC`, [userId]),
      allAsync(`SELECT strftime('%Y-W%W', transaction_date) as week, SUM(amount) as total
        FROM Transactions WHERE user_id = ? GROUP BY week ORDER BY week DESC LIMIT 8`, [userId]),
      getAsync('SELECT * FROM Budgets WHERE user_id = ?', [userId]),
      getAsync(`SELECT
        SUM(CASE WHEN strftime('%w', transaction_date) IN ('0','6') THEN amount ELSE 0 END) as weekend,
        SUM(CASE WHEN strftime('%w', transaction_date) NOT IN ('0','6') THEN amount ELSE 0 END) as weekday
        FROM Transactions WHERE user_id = ?`, [userId]),
    ]);

    res.json({
      totalSpending: totalSpending.total || 0,
      totalTransactions: totalSpending.count || 0,
      weeklySpending: weeklySpending.total || 0,
      monthlySpending: monthlySpending.total || 0,
      categoryBreakdown,
      weeklyTrend: weeklyTrend.reverse(),
      budget,
      dayTypeSplit,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/analysis/budget
router.put('/budget', async (req, res) => {
  try {
    const { weekly_limit, monthly_limit } = req.body;
    await runAsync('UPDATE Budgets SET weekly_limit = ?, monthly_limit = ? WHERE user_id = ?',
      [weekly_limit, monthly_limit, req.user.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
