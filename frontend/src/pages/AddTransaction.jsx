import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import './AddTransaction.css'

export default function AddTransaction() {
    const [form, setForm] = useState({
        amount: '',
        category_id: '',
        transaction_date: new Date().toISOString().slice(0, 10),
        payment_mode: 'UPI',
        description: '',
    })
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        api.get('/categories').then(r => setCategories(r.data))
    }, [])

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await api.post('/transactions', form)
            setSuccess(true)
            setTimeout(() => navigate('/transactions'), 1200)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add transaction')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="add-page">
            <div className="page-header">
                <h1>Add Transaction</h1>
                <p>Record a new expense</p>
            </div>

            <div className="form-card">
                {error && <div className="form-error">{error}</div>}
                {success && <div className="form-success">✔ Transaction added! Redirecting…</div>}

                <form onSubmit={handleSubmit} className="tx-form">
                    <div className="form-row">
                        <div className="field">
                            <label>Amount (₹)</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={form.amount}
                                onChange={e => setForm({ ...form, amount: e.target.value })}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div className="field">
                            <label>Date</label>
                            <input
                                type="date"
                                value={form.transaction_date}
                                onChange={e => setForm({ ...form, transaction_date: e.target.value })}
                                required
                                max={new Date().toISOString().slice(0, 10)}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="field">
                            <label>Category</label>
                            <select
                                value={form.category_id}
                                onChange={e => setForm({ ...form, category_id: e.target.value })}
                                required
                            >
                                <option value="">Select category</option>
                                {categories.map(c => (
                                    <option key={c.category_id} value={c.category_id}>
                                        {c.category_name} ({c.category_type})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="field">
                            <label>Payment Mode</label>
                            <select
                                value={form.payment_mode}
                                onChange={e => setForm({ ...form, payment_mode: e.target.value })}
                            >
                                <option value="UPI">UPI</option>
                                <option value="Cash">Cash</option>
                                <option value="Card">Card</option>
                                <option value="Net Banking">Net Banking</option>
                            </select>
                        </div>
                    </div>

                    <div className="field">
                        <label>Description (optional)</label>
                        <input
                            type="text"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="What was this for?"
                            maxLength={255}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading || success}>
                            {loading ? 'Saving…' : 'Add Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
