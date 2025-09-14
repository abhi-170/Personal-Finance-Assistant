import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
    return (
        <div>
            {/* Navigation */}
            <nav className="navbar">
                <div className="container">
                    <div className="navbar-content">
                        <Link to="/" className="navbar-brand">
                            <h2>Finance Assistant</h2>
                        </Link>

                        <div className="navbar-user">
                            <Link to="/login" className="btn btn-secondary">
                                Login
                            </Link>
                            <Link to="/register" className="btn btn-primary">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <h1>Take Control of Your Finances</h1>
                    <p>
                        Track your income and expenses, analyze spending patterns, and make informed
                        financial decisions with our comprehensive personal finance assistant.
                    </p>
                    <div className="hero-actions">
                        <Link to="/register" className="btn btn-primary">
                            Start Free Today
                        </Link>
                        <Link to="/login" className="btn btn-secondary">
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features">
                <div className="container">
                    <h2>Everything You Need to Manage Your Money</h2>
                    <div className="feature-grid">
                        <div className="feature-card">
                            <div className="feature-icon">
                                💰
                            </div>
                            <h3>Track Transactions</h3>
                            <p>
                                Easily log your income and expenses. Categorize transactions
                                and keep track of where your money goes.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                📊
                            </div>
                            <h3>Visual Analytics</h3>
                            <p>
                                Get insights into your spending habits with beautiful charts
                                and graphs. See expenses by category and track trends over time.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                📱
                            </div>
                            <h3>Receipt Scanning</h3>
                            <p>
                                Upload receipt images or PDFs and automatically extract
                                transaction details. Save time on manual data entry.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                🔒
                            </div>
                            <h3>Secure & Private</h3>
                            <p>
                                Your financial data is encrypted and secure. Each user has
                                their own private account with complete data isolation.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                📈
                            </div>
                            <h3>Smart Insights</h3>
                            <p>
                                Understand your financial patterns with intelligent summaries
                                and recommendations to help you save more.
                            </p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                💻
                            </div>
                            <h3>Easy to Use</h3>
                            <p>
                                Clean, intuitive interface designed for simplicity.
                                Start tracking your finances in minutes, not hours.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="hero" style={{ backgroundColor: 'var(--color-gray-50)' }}>
                <div className="container">
                    <h2>Ready to Start Your Financial Journey?</h2>
                    <p>
                        Join thousands of users who are already taking control of their finances
                        with our powerful yet simple tools.
                    </p>
                    <div className="hero-actions">
                        <Link to="/register" className="btn btn-primary">
                            Create Free Account
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{
                backgroundColor: 'var(--color-black)',
                color: 'var(--color-white)',
                padding: '2rem 0',
                textAlign: 'center'
            }}>
                <div className="container">
                    <p>&copy; 2025 Personal Finance Assistant. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;