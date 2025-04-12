import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TeacherList.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function TeacherList({ studentId }) {
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showMoreTeachers, setShowMoreTeachers] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [subscriptions, setSubscriptions] = useState(new Set());
    const [message, setMessage] = useState('');
    const [subscribingTeacherId, setSubscribingTeacherId] = useState(null);

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

            if (teachersResponse.data?.teachers) {
                setTeachers(teachersResponse.data.teachers);
            } else {
                console.warn('Teachers response is not in expected format:', teachersResponse.data);
                setTeachers([]);
            }

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
            setError('');
            setMessage('');
            setSubscribingTeacherId(teacherId);

            const response = await axios.post(`${API_BASE_URL}/subscribe`, {
                student_id: studentId,
                teacher_id: teacherId
            });

            if (response.data?.success) {
                setMessage(`Successfully subscribed to ${teachers.find(t => t.id === teacherId)?.username}!`);
                setSubscriptions(prev => new Set([...prev, teacherId]));
            } else {
                throw new Error(response.data?.error || 'Failed to subscribe');
            }
        } catch (err) {
            console.error('Error subscribing:', err);
            setError(err.response?.data?.error || 'Failed to subscribe to teacher');
        } finally {
            setSubscribingTeacherId(null);
        }
    };

    const handleUnsubscribe = async (teacherId) => {
        try {
            setError('');
            setMessage('');

            const response = await axios.post(`${API_BASE_URL}/unsubscribe`, {
                student_id: studentId,
                teacher_id: teacherId
            });

            if (response.data?.success) {
                setMessage(`Successfully unsubscribed from ${teachers.find(t => t.id === teacherId)?.username}.`);
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
            <h2 className="main-header">Teachers</h2>
            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <div className="teachers-section">
                {subscribedTeachers.length === 0 ? (
                    <div className="no-teachers">You are not subscribed to any teachers yet.</div>
                ) : (
                    <div className="teachers-grid">
                        {subscribedTeachers.map((teacher) => (
                            <div key={teacher.id} className="teacher-card">
                                <div className="teacher-info">
                                    <h4>{teacher.username}</h4>
                                    <p>{teacher.email}</p>
                                </div>
                                <button
                                    className="unsubscribe-btn"
                                    onClick={() => handleUnsubscribe(teacher.id)}
                                    disabled={loading}
                                >
                                    Unsubscribe
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="unsubscribed-section">
                <button
                    className="find-more-btn"
                    onClick={() => setShowMoreTeachers(!showMoreTeachers)}
                    disabled={loading}
                >
                    {showMoreTeachers ? 'Hide More Teachers' : 'Find More Teachers'}
                </button>

                {showMoreTeachers && (
                    <div className="more-teachers-section">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search teachers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            disabled={loading}
                        />
                        {filteredUnsubscribedTeachers.length === 0 ? (
                            <div className="no-teachers">No teachers found.</div>
                        ) : (
                            <div className="teachers-grid">
                                {filteredUnsubscribedTeachers.map((teacher) => (
                                    <div key={teacher.id} className="teacher-card">
                                        <div className="teacher-info">
                                            <h4>{teacher.username}</h4>
                                            <p>{teacher.email}</p>
                                        </div>
                                        <button
                                            className="subscribe-btn"
                                            onClick={() => handleSubscribe(teacher.id)}
                                            disabled={subscribingTeacherId !== null}
                                        >
                                            {subscribingTeacherId === teacher.id ? 'Subscribing...' : 'Subscribe'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TeacherList;