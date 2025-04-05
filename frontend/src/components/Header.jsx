// src/components/Header.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="header">
            <div className="header-content">
                <Link to="/" className="logo">
                    <span className="logo-text">QuizSpark</span>
                </Link>
                <nav className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
                    <Link to="/signup" className="nav-link">Sign Up</Link>
                    <Link to="/student-login" className="nav-link">Student Login</Link>
                    <Link to="/teacher-login" className="nav-link">Teacher Login</Link>
                </nav>
                <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </header>
    );
}

export default Header;
