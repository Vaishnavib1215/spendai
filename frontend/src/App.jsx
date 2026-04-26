import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AddTransaction from './pages/AddTransaction'
import Transactions from './pages/Transactions'
import Layout from './components/Layout'
import { getToken } from './utils/auth'

function PrivateRoute({ children }) {
    return getToken() ? children : <Navigate to="/login" replace />
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="add" element={<AddTransaction />} />
                    <Route path="transactions" element={<Transactions />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}
