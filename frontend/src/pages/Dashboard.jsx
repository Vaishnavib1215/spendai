import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import './Dashboard.css'

const PIE_COLORS = ['#6c63ff', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#84cc16']

export default function Dashboard() {
    const [summary, setSummary] = useState(null)
    const [analysis, setAnalysis] = useState(null)
    const [analyzeLoading, setAnalyzeLoading] = useState(false)
    const [analyzeError, setAnalyzeError] = useState('')
    const [budgetForm, setBudgetForm] = useState({ weekly_limit: '', monthly_limit: '' })
    const [budgetSaved, setBudgetSaved] = useState(false)

    useEffect(() => {
        api.get('/analysis/summary').then(r => {
            setSummary(r.data)
            setBudgetForm({
                weekly_limit: r.data.budget?.weekly_limit || 5000,
                monthly_limit: r.data.budget?.monthly_limit || 20000,
            })
        })
        // Load last analysis from history
        api.get('/analysis/history').then(r => {
            if (r.data.length > 0) setAnalysis(r.data[0])
        })
    }, [])

    async function handleAnalyze() {
        setAnalyzeLoading(true)
        setAnalyzeError('')
        try {
            const { data } = await api.get('/analysis/run')
            setAnalysis(data)
        } catch (err) {
            setAnalyzeError(err.response?.data?.error || 'Analysis failed')
        } finally {
            setAnalyzeLoading(false)
        }
    }

    async function handleBudgetSave(e) {
        e.preventDefault()
        await api.put('/analysis/budget', budgetForm)
        setBudgetSaved(true)
        setTimeout(() => setBudgetSaved(false), 2000)
    }

    if (!summary) return <div className="loading">Loading dashboard…</div>

    const weeklyBudgetUsed = summary.budget?.weekly_limit
        ? Math.min(100, (summary.weeklySpending / summary.budget.weekly_limit) * 100)
        : 0

    const monthlyBudgetUsed = summary.budget?.monthly_limit
        ? Math.min(100, (summary.monthlySpending / summary.budget.monthly_limit) * 100)
        : 0

    return (
        <div className="dashboard">
            <div className="dash-header">
                <div>
                    <h1>Dashboard</h1>
                    <p className="dash-sub">Your financial overview</p>
                </div>
                <Link to="/add" className="btn-add">+ Add Transaction</Link>
            </div>

            {/* Stat Cards */}
            <div className="stat-grid">
                <StatCard label="Total Spending" value={`₹${summary.totalSpending.toLocaleString('en-IN')}`} icon="💰" />
                <StatCard label="This Week" value={`₹${summary.weeklySpending.toLocaleString('en-IN')}`} icon="📅" color="var(--accent)" />
                <StatCard label="This Month" value={`₹${summary.monthlySpending.toLocaleString('en-IN')}`} icon="📆" color="var(--warning)" />
                <StatCard label="Transactions" value={summary.totalTransactions} icon="🧾" color="var(--success)" />
            </div>

            {/* Budget Progress */}
            <div className="section-grid-2">
                <div className="card">
                    <h2 className="card-title">Budget Status</h2>
                    <BudgetBar label="Weekly" used={summary.weeklySpending} limit={summary.budget?.weekly_limit} pct={weeklyBudgetUsed} />
                    <BudgetBar label="Monthly" used={summary.monthlySpending} limit={summary.budget?.monthly_limit} pct={monthlyBudgetUsed} />

                    <form onSubmit={handleBudgetSave} className="budget-form">
                        <h3>Update Budget</h3>
                        <div className="budget-inputs">
                            <div className="field">
                                <label>Weekly Limit (₹)</label>
                                <input type="number" value={budgetForm.weekly_limit}
                                    onChange={e => setBudgetForm({ ...budgetForm, weekly_limit: e.target.value })} min="0" />
                            </div>
                            <div className="field">
                                <label>Monthly Limit (₹)</label>
                                <input type="number" value={budgetForm.monthly_limit}
                                    onChange={e => setBudgetForm({ ...budgetForm, monthly_limit: e.target.value })} min="0" />
                            </div>
                        </div>
                        <button type="submit" className="btn-save">{budgetSaved ? '✔ Saved' : 'Save Budget'}</button>
                    </form>
                </div>

                {/* Day type split */}
                <div className="card">
                    <h2 className="card-title">Weekend vs Weekday</h2>
                    {summary.dayTypeSplit && (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={[
                                { name: 'Weekday', amount: summary.dayTypeSplit.weekday || 0 },
                                { name: 'Weekend', amount: summary.dayTypeSplit.weekend || 0 },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                                <Bar dataKey="amount" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                    {summary.dayTypeSplit?.weekend > summary.dayTypeSplit?.weekday * 1.3 && (
                        <div className="insight-chip warning">⚠ You spend significantly more on weekends!</div>
                    )}
                </div>
            </div>

            {/* Weekly Trend Chart */}
            {summary.weeklyTrend.length > 0 && (
                <div className="card">
                    <h2 className="card-title">Weekly Spending Trend</h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={summary.weeklyTrend}>
                            <defs>
                                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                            <Area type="monotone" dataKey="total" stroke="#6c63ff" fill="url(#spendGrad)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Category Breakdown */}
            {summary.categoryBreakdown.length > 0 && (
                <div className="section-grid-2">
                    <div className="card">
                        <h2 className="card-title">Category Breakdown</h2>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie data={summary.categoryBreakdown.filter(c => c.category_name)}
                                    dataKey="total" nameKey="category_name" cx="50%" cy="50%" outerRadius={80}
                                    label={({ category_name, percent }) => `${category_name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}>
                                    {summary.categoryBreakdown.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={v => `₹${v.toLocaleString('en-IN')}`} contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="card">
                        <h2 className="card-title">Top Categories</h2>
                        <div className="cat-list">
                            {summary.categoryBreakdown.filter(c => c.category_name).slice(0, 6).map((c, i) => (
                                <div key={i} className="cat-row">
                                    <div className="cat-info">
                                        <div className="cat-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        <span>{c.category_name}</span>
                                        <span className={`badge ${c.category_type === 'Need' ? 'badge-need' : 'badge-want'}`}>{c.category_type}</span>
                                    </div>
                                    <span className="cat-amt">₹{parseFloat(c.total).toLocaleString('en-IN')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ML Analysis Section */}
            <div className="card ml-section">
                <div className="ml-header">
                    <div>
                        <h2 className="card-title">🧠 AI Analysis</h2>
                        <p className="card-sub">Behavioral insights powered by ML</p>
                    </div>
                    <button className="btn-analyze" onClick={handleAnalyze} disabled={analyzeLoading}>
                        {analyzeLoading ? '🔄 Analyzing…' : '▶ Run Analysis'}
                    </button>
                </div>

                {analyzeError && <div className="alert alert-error">{analyzeError}</div>}

                {analysis && (
                    <div className="ml-results">
                        <div className="ml-cards">
                            <div className="ml-card">
                                <div className="ml-card-icon">📈</div>
                                <div className="ml-card-label">Predicted Next Week</div>
                                <div className="ml-card-value">₹{parseFloat(analysis.predicted_spending).toLocaleString('en-IN')}</div>
                            </div>
                            <div className="ml-card">
                                <div className="ml-card-icon">🎯</div>
                                <div className="ml-card-label">Recommended Budget</div>
                                <div className="ml-card-value">₹{parseFloat(analysis.recommended_budget).toLocaleString('en-IN')}</div>
                            </div>
                            <div className={`ml-card ${analysis.overspend_risk ? 'ml-card-danger' : 'ml-card-safe'}`}>
                                <div className="ml-card-icon">{analysis.overspend_risk ? '⚠️' : '✅'}</div>
                                <div className="ml-card-label">Overspending Risk</div>
                                <div className="ml-card-value">{analysis.overspend_risk ? 'HIGH RISK' : 'SAFE'}</div>
                            </div>
                            <div className="ml-card">
                                <div className="ml-card-icon">👤</div>
                                <div className="ml-card-label">Behavior Profile</div>
                                <div className="ml-card-value cluster">{analysis.cluster_label}</div>
                            </div>
                        </div>

                        {/* Reason / Explanation */}
                        <div className="alert alert-info">
                            <strong>💡 Insight:</strong> {analysis.reason}
                        </div>

                        {/* Drift Alerts */}
                        {analysis.drift_alerts && analysis.drift_alerts.length > 0 && (
                            <div className="drift-alerts">
                                <h3>🔔 Drift Alerts</h3>
                                {analysis.drift_alerts.map((alert, i) => (
                                    <div key={i} className="alert alert-warning">{alert}</div>
                                ))}
                            </div>
                        )}

                        {/* Weekend Insight */}
                        {analysis.weekend_insight && (
                            <div className="alert alert-warning">🌅 {analysis.weekend_insight}</div>
                        )}

                        {/* Weekly Trend from ML */}
                        {analysis.weekly_trend && analysis.weekly_trend.length > 0 && (
                            <div className="ml-chart">
                                <h3>Weekly Trend (from ML analysis)</h3>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={analysis.weekly_trend}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8 }} formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                                        <Bar dataKey="total" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}

                {!analysis && !analyzeLoading && (
                    <div className="ml-empty">Add at least 3 transactions and click "Run Analysis" to get AI insights.</div>
                )}
            </div>
        </div>
    )
}

function StatCard({ label, value, icon, color }) {
    return (
        <div className="stat-card">
            <div className="stat-icon" style={{ color }}>{icon}</div>
            <div className="stat-info">
                <div className="stat-value" style={{ color }}>{value}</div>
                <div className="stat-label">{label}</div>
            </div>
        </div>
    )
}

function BudgetBar({ label, used, limit, pct }) {
    const color = pct >= 90 ? 'var(--danger)' : pct >= 70 ? 'var(--warning)' : 'var(--success)'
    return (
        <div className="budget-bar-wrap">
            <div className="budget-bar-label">
                <span>{label}</span>
                <span style={{ color }}>₹{(used || 0).toLocaleString('en-IN')} / ₹{(limit || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="budget-bar-track">
                <div className="budget-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    )
}
