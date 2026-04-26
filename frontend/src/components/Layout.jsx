import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { removeToken, getUser } from '../utils/auth'
import './Layout.css'

export default function Layout() {
    const navigate = useNavigate()
    const user = getUser()

    function handleLogout() {
        removeToken()
        navigate('/login')
    }

    return (
        <div className="app-shell">
            <nav className="sidebar">
                <div className="sidebar-brand">
                    <span className="brand-icon">💸</span>
                    <span className="brand-name">SpendAI</span>
                </div>
                <div className="sidebar-links">
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        📊 Dashboard
                    </NavLink>
                    <NavLink to="/add" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        ➕ Add Transaction
                    </NavLink>
                    <NavLink to="/transactions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        📋 Transactions
                    </NavLink>
                </div>
                <div className="sidebar-footer">
                    <span className="user-name">👤 {user?.name || 'User'}</span>
                    <button className="logout-btn" onClick={handleLogout}>Logout</button>
                </div>
            </nav>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    )
}
