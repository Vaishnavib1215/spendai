import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { setToken, setUser } from '../utils/auth'
import './Auth.css'

export default function Register() {
    const [form, setForm] = useState({ name: '', email: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const { data } = await api.post('/auth/register', form)
            setToken(data.token)
            setUser(data.user)
            navigate('/dashboard')
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">💸 SpendAI</div>
                <h1 className="auth-title">Create account</h1>
                <p className="auth-subtitle">Start analyzing your spending</p>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="field">
                        <label>Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="Your name"
                            required
                        />
                    </div>
                    <div className="field">
                        <label>Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            placeholder="you@example.com"
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div className="field">
                        <label>Password</label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            placeholder="Min 6 characters"
                            required
                            autoComplete="new-password"
                        />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-switch">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    )
}
