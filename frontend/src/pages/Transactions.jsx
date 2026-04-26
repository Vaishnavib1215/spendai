import { useState, useEffect } from 'react'
import api from '../utils/api'
import './Transactions.css'

const PAYMENT_ICONS = { UPI: '📱', Cash: '💵', Card: '💳', 'Net Banking': '🏦' }

export default function Transactions() {
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)
    const [deleting, setDeleting] = useState(null)

    async function load() {
        try {
            const { data } = await api.get('/transactions')
            setTransactions(data)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    async function handleDelete(id) {
        if (!window.confirm('Delete this transaction?')) return
        setDeleting(id)
        try {
            await api.delete(`/transactions/${id}`)
            setTransactions(prev => prev.filter(t => t.transaction_id !== id))
        } finally {
            setDeleting(null)
        }
    }

    if (loading) return <div className="loading">Loading transactions…</div>

    return (
        <div className="tx-page">
            <div className="page-header">
                <h1>Transactions</h1>
                <p>{transactions.length} total transactions</p>
            </div>

            {transactions.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>No transactions yet. Add your first expense!</p>
                </div>
            ) : (
                <div className="tx-table-wrap">
                    <table className="tx-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Category</th>
                                <th>Payment</th>
                                <th>Description</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => (
                                <tr key={t.transaction_id}>
                                    <td>{new Date(t.transaction_date).toLocaleDateString('en-IN')}</td>
                                    <td className="amount-cell">₹{parseFloat(t.amount).toLocaleString('en-IN')}</td>
                                    <td>
                                        <span className={`badge ${t.category_type === 'Need' ? 'badge-need' : 'badge-want'}`}>
                                            {t.category_name || '—'}
                                        </span>
                                    </td>
                                    <td>{PAYMENT_ICONS[t.payment_mode] || ''} {t.payment_mode || '—'}</td>
                                    <td className="desc-cell">{t.description || '—'}</td>
                                    <td>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDelete(t.transaction_id)}
                                            disabled={deleting === t.transaction_id}
                                        >
                                            🗑
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
