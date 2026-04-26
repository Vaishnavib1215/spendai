const express = require('express');
const { allAsync } = require('../db');
const { verifyToken } = require('../auth');

const router = express.Router();
router.use(verifyToken);

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const rows = await allAsync('SELECT * FROM Categories ORDER BY category_name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
