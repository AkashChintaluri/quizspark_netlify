import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

function TeacherLogin() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const BASE_URL = process.env.REACT_APP_API_BASE_PATH || '/api';

    useEffect(() => {
        if (showPopup) {
            const timer = setTimeout(() => {
                setShowPopup(false);
                navigate('/teacher-dashboard');
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [showPopup, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errorMessage) setErrorMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { username, password } = formData;

        if (!username.trim() || !password.trim()) {
            setErrorMessage('Username and password are required');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await axios.post(`${BASE_URL}/login`, {
                username: username.trim(),
                password: password.trim(),
                userType: 'teacher'
            });

            if (response.data.success) {
                const { id, username, userType } = response.data.user;
                const userData = { 
                    id, 
                    username, 
                    role: 'teacher'
                };
                localStorage.setItem('user', JSON.stringify(userData));
                setShowPopup(true);
            } else {
                setErrorMessage(response.data.message || 'Invalid username or password');
            }
        } catch (error) {
            setErrorMessage(error.response?.data?.error || 'Login failed. Please try again.');
            console.error('Login error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login">
            <div className="login-content">
                <h2>Teacher Login</h2>
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleInputChange}
                            required
                            placeholder="Username"
                            autoComplete="username"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            placeholder="Password"
                            autoComplete="current-password"
                            disabled={isLoading}
                        />
                    </div>
                    {errorMessage && <div className="error-message">{errorMessage}</div>}
                    <button type="submit" className="login-button" disabled={isLoading}>
                        {isLoading ? 'Logging In...' : 'Login'}
                    </button>
                </form>
                <div className="signup-link">
                    <p>Don't have an account? <a href="/teacher-signup">Sign up here</a></p>
                </div>
            </div>
            {showPopup && (
                <div className="popup success">
                    ✔️ Login successful! Redirecting to dashboard...
                </div>
            )}
        </div>
    );
}

export default TeacherLogin;

<style jsx>{`
    .signup-link {
        text-align: center;
        margin-top: 20px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
    }
    
    .signup-link a {
        color: #4CAF50;
        text-decoration: none;
        font-weight: 600;
        transition: color 0.3s ease;
    }
    
    .signup-link a:hover {
        color: #45a049;
        text-decoration: underline;
    }
`}</style>