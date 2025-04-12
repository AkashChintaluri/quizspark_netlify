import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TeacherList.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function TeacherList({ studentId }) {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [subscriptions, setSubscriptions] = useState(new Set());
    const [message, setMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [isSubscribing, setIsSubscribing] = useState(false);

    useEffect(() => {
        if (studentId) {
            fetchTeachers();
        }
    }, [studentId]);

    const fetchTeachers = async () => {
        try {
            setLoading(true);
            setError('');
            setMessage('');

            const [teachersResponse, subscriptionsResponse] = await Promise.all([
                axios.get(`${API_BASE_URL}/teachers`),
                axios.get(`${API_BASE_URL}/subscriptions?student_id=${studentId}`)
            ]);

            // Handle teachers data
            if (teachersResponse.data?.teachers) {
                setTeachers(teachersResponse.data.teachers);
            } else {
                console.warn('Teachers response is not in expected format:', teachersResponse.data);
                setTeachers([]);
            }

            // Handle subscriptions data
            if (subscriptionsResponse.data?.subscriptions) {
                setSubscriptions(new Set(subscriptionsResponse.data.subscriptions.map(sub => sub.teacher_id)));
            } else {
                console.warn('Subscriptions response is not in expected format:', subscriptionsResponse.data);
                setSubscriptions(new Set());
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.response?.data?.error || 'Failed to fetch teacher data.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (teacherId) => {
        try {
            setLoading(true);
            setError('');
            setMessage('');
            setIsSubscribing(true);

            const response = await axios.post(`${API_BASE_URL}/subscribe`, {
                student_id: studentId,
                teacher_id: teacherId
            });

            if (response.data?.success) {
                setMessage('Successfully subscribed to teacher');
                setSubscriptions(prev => new Set([...prev, teacherId]));
                setShowSuccess(true);
                setSelectedTeacher(teachers.find(t => t.id === teacherId));
            } else {
                throw new Error(response.data?.error || 'Failed to subscribe');
            }
        } catch (err) {
            console.error('Error subscribing:', err);
            setError(err.response?.data?.error || 'Failed to subscribe to teacher');
        } finally {
            setLoading(false);
            setIsSubscribing(false);
        }
    };

    const handleUnsubscribe = async (teacherId) => {
        try {
            setLoading(true);
            setError('');
            setMessage('');

            const response = await axios.post(`${API_BASE_URL}/unsubscribe`, {
                student_id: studentId,
                teacher_id: teacherId
            });

            if (response.data?.success) {
                setMessage('Successfully unsubscribed from teacher');
                setSubscriptions(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(teacherId);
                    return newSet;
                });
            } else {
                throw new Error(response.data?.error || 'Failed to unsubscribe');
            }
        } catch (err) {
            console.error('Error unsubscribing:', err);
            setError(err.response?.data?.error || 'Failed to unsubscribe from teacher');
        } finally {
            setLoading(false);
        }
    };

    const subscribedTeachers = teachers.filter(teacher => subscriptions.has(teacher.id));
    const unsubscribedTeachers = teachers.filter(teacher => !subscriptions.has(teacher.id));
    const filteredUnsubscribedTeachers = unsubscribedTeachers.filter(teacher =>
        teacher.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="teacher-list"><div className="loading">Loading teachers...</div></div>;
    }

    return (
        <div className="teacher-list">
            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            {showSuccess && (
                <div className="success-message">
                    <p>🎉 Successfully subscribed to {selectedTeacher?.username}! You can now access their content.</p>
                </div>
            )}

            <h2>Your Teachers</h2>
            <div className="teachers-grid">
                {teachers.map((teacher) => (
                    <div key={teacher.id} className="teacher-card">
                        <div className="teacher-info">
                            <h3>{teacher.username}</h3>
                            <p>{teacher.email}</p>
                        </div>
                        <button 
                            className="subscribe-btn"
                            onClick={() => handleSubscribe(teacher.id)}
                            disabled={isSubscribing}
                        >
                            {isSubscribing ? 'Subscribing...' : 'Subscribe'}
                        </button>
                    </div>
                ))}
            </div>

            <div className="unsubscribed-section">
                <button
                    className="dropdown-toggle"
                    onClick={() => setShowDropdown(!showDropdown)}
                    disabled={loading}
                >
                    {showDropdown ? 'Hide Available Teachers' : 'Show Available Teachers'}
                </button>

                {showDropdown && (
                    <div className="dropdown-menu">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search teachers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={loading}
                        />
                        {filteredUnsubscribedTeachers.length === 0 ? (
                            <div className="no-teachers">No teachers found</div>
                        ) : (
                            <ul className="teacher-dropdown-list">
                                {filteredUnsubscribedTeachers.map((teacher) => (
                                    <li key={teacher.id} className="dropdown-item">
                                        <span>{teacher.username}</span>
                                        <button
                                            className="subscribe-btn"
                                            onClick={() => handleSubscribe(teacher.id)}
                                            disabled={loading}
                                        >
                                            Subscribe
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TeacherList;

<style jsx>{`
    .teacher-list {
        width: 100%;
        max-width: 1200px;
        margin: 2rem auto;
        padding: 0 1rem;
    }

    .teacher-list h2 {
        font-size: 1.8rem;
        color: #2d3748;
        margin-bottom: 1.5rem;
        text-align: center;
    }

    .teachers-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
        width: 100%;
    }

    .teacher-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        border: 1px solid #e2e8f0;
    }

    .teacher-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
        border-color: #667eea;
    }

    .teacher-info {
        margin-bottom: 1rem;
    }

    .teacher-info h3 {
        font-size: 1.25rem;
        color: #2d3748;
        margin-bottom: 0.5rem;
    }

    .teacher-info p {
        color: #4a5568;
        font-size: 0.9rem;
    }

    .subscribe-btn {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        width: 100%;
    }

    .subscribe-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
    }

    .subscribe-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .success-message {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #48bb78;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        font-size: 1rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
`}</style>