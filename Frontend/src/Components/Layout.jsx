import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext.js';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const isActive = (path) => {
        return location.pathname === path ? 'nav-link active' : 'nav-link';
    };

    return (
        <div className="layout">
            <nav className="navbar">
                <div className="container">
                    <div className="navbar-content">
                        <Link to="/dashboard" className="navbar-brand">
                            <h2>Finance Assistant</h2>
                        </Link>

                        <div className="navbar-menu">
                            <Link to="/dashboard" className={isActive('/dashboard')}>
                                Dashboard
                            </Link>
                            <Link to="/transactions" className={isActive('/transactions')}>
                                Transactions
                            </Link>
                            <Link to="/analytics" className={isActive('/analytics')}>
                                Analytics
                            </Link>
                            <Link to="/receipts" className={isActive('/receipts')}>
                                Receipts
                            </Link>
                        </div>

                        <div className="navbar-user">
                            <span className="user-name">Hello, {user?.name}</span>
                            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="main-content">
                <div className="container">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;