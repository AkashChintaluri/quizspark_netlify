import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SignupForm.css';

function SignupForm() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        userType: 'student',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const BASE_URL = process.env.REACT_APP_API_BASE_PATH || '/api';

    useEffect(() => {
        if (showPopup) {
            const timer = setTimeout(() => {
                setShowPopup(false);
                navigate(formData.userType === 'student' ? '/student-login' : '/teacher-login');
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
        const { username, email, password } = formData;

        if (!username.trim() || !email.trim() || !password.trim()) {
            setErrorMessage('All fields are required');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await axios.post(`${BASE_URL}/signup`, {
                username: username.trim(),
                email: email.trim(),
                password: password.trim(),
                userType: formData.userType
            });

            setShowPopup(true);
            console.log('Signup successful:', response.data);
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Registration failed. Please try again.';
            setErrorMessage(errorMsg);
            console.error('Signup error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="signup">
            <div className="signup-content">
                <h2>Join QuizSpark</h2>
                <form className="signup-form" onSubmit={handleSubmit}>
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
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            placeholder="Email"
                            autoComplete="email"
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
                            autoComplete="new-password"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <select
                            id="userType"
                            value={formData.userType}
                            onChange={handleInputChange}
                            required
                            className={!formData.userType ? 'placeholder' : ''}
                        >
                            <option value="">I am a</option>
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                        </select>
                    </div>
                    {errorMessage && <div className="error-message">{errorMessage}</div>}
                    <button type="submit" className="signup-button" disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>
            </div>
            {showPopup && (
                <div className="popup success">
                    ✅ Account created successfully! Redirecting to login...
                </div>
            )}
        </div>
    );
}

export default SignupForm;