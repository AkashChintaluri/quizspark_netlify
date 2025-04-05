import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
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

    // Fixed input handling using name attribute
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post(`${BASE_URL}/signup`, formData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            setShowPopup(true);
            console.log('Signup successful:', response.data);
        } catch (error) {
            const errorMessage = error.response?.data?.error ||
                'Registration failed. Please check your information and try again.';
            alert(errorMessage);
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
                            name="username"  // Changed from id to name
                            value={formData.username}
                            onChange={handleInputChange}
                            required
                            placeholder="Username"
                            autoComplete="username"
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="email"
                            name="email"  // Changed from id to name
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            placeholder="Email"
                            autoComplete="email"
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="password"
                            name="password"  // Changed from id to name
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            placeholder="Password"
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="form-group select-group">
                        <select
                            name="userType"  // Added name attribute
                            value={formData.userType}
                            onChange={handleInputChange}
                        >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                        </select>
                        <span className="select-placeholder">I am a</span>
                    </div>
                    <button
                        type="submit"
                        className="signup-button"
                        disabled={isLoading}
                    >
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
