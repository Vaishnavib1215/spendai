const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'spendai.db');

let db = null;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH);
    db.serialize(() => {
      db.run('PRAGMA journal_mode = WAL');
      db.run('PRAGMA foreign_keys = ON');
    });
  }
  return db;
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function initSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS Users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS Categories (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_name TEXT NOT NULL,
      category_type TEXT CHECK(category_type IN ('Need','Want')) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS Transactions (
      transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      category_id INTEGER,
      transaction_date TEXT NOT NULL,
      payment_mode TEXT,
      description TEXT,
      FOREIGN KEY (user_id) REFERENCES Users(user_id),
      FOREIGN KEY (category_id) REFERENCES Categories(category_id)
    )`,
    `CREATE TABLE IF NOT EXISTS Budgets (
      budget_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      weekly_limit REAL,
      monthly_limit REAL,
      FOREIGN KEY (user_id) REFERENCES Users(user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS Predictions (
      prediction_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      week_number INTEGER,
      predicted_spending REAL,
      overspend_risk INTEGER,
      reason TEXT,
      cluster_label TEXT,
      recommended_budget REAL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES Users(user_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_user_date ON Transactions(user_id, transaction_date)`,
  ];

  for (const sql of statements) {
    await runAsync(sql);
  }

  // Seed categories
  const count = await getAsync('SELECT COUNT(*) as c FROM Categories');
  if (count.c === 0) {
    const seeds = [
      ['Food', 'Need'], ['Transport', 'Need'], ['Shopping', 'Want'],
      ['Entertainment', 'Want'], ['Healthcare', 'Need'], ['Education', 'Need'],
      ['Utilities', 'Need'], ['Travel', 'Want'],
    ];
    for (const [name, type] of seeds) {
      await runAsync('INSERT INTO Categories (category_name, category_type) VALUES (?, ?)', [name, type]);
    }
  }
}

module.exports = { getDb, runAsync, getAsync, allAsync, initSchema };
