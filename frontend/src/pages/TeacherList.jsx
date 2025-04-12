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

            <h3>Your Teachers</h3>
            {subscribedTeachers.length === 0 ? (
                <div className="no-teachers">You haven't subscribed to any teachers yet.</div>
            ) : (
                <div className="teacher-grid">
                    {subscribedTeachers.map((teacher) => (
                        <div key={teacher.id} className="teacher-card">
                            <div className="teacher-info">
                                <h4>{teacher.username}</h4>
                                <p>{teacher.email}</p>
                            </div>
                            <div className="teacher-actions">
                                <span className="status subscribed">Subscribed</span>
                                <button
                                    className="subscribed-btn"
                                    onClick={() => handleUnsubscribe(teacher.id)}
                                    disabled={loading}
                                >
                                    Unsubscribe
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

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