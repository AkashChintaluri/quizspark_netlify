import React, { useState, useEffect } from 'react';
import {
    useNavigate,
    useParams,
    useLocation
} from 'react-router-dom';
import axios from 'axios';
import './StudentDashboard.css';
import './TakeQuiz.css';
import TeacherList from './TeacherList';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Remove axios default configuration since we're using Netlify functions
// axios.defaults.withCredentials = true;
// axios.defaults.headers.common['Access-Control-Allow-Origin'] = '*';

function StudentDashboard() {
    const [activeTab, setActiveTab] = useState('home');
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();
    const { quizCode } = useParams();
    const [quizzes, setQuizzes] = useState([]);
    const [error, setError] = useState('');
    const [currentQuiz, setCurrentQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds

    const handleQuizClick = (quizCode) => {
        navigate(`/student-dashboard/take-quiz/${quizCode}`, { replace: true });
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/');
            return;
        }

        try {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser?.id) {
                setCurrentUser(parsedUser);
            } else {
                localStorage.removeItem('user');
                navigate('/');
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('user');
            navigate('/');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        const pathParts = location.pathname.split('/');
        const tabFromPath = pathParts[2];
        if (tabFromPath) {
            setActiveTab(tabFromPath.replace('-', ' '));
        } else if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location]);

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${API_BASE_URL}/upcoming-quizzes?student_id=${currentUser.id}`);
                if (response.data?.quizzes) {
                    setQuizzes(response.data.quizzes);
                }
            } catch (err) {
                console.error('Error fetching quizzes:', err);
                setError('Failed to load quizzes');
            } finally {
                setLoading(false);
            }
        };

        if (currentUser?.id) {
            fetchQuizzes();
        }
    }, [currentUser?.id]);

    useEffect(() => {
        const fetchQuiz = async () => {
            if (!quizCode) return;
            
            try {
                setLoading(true);
                setError('');
                console.log('Fetching quiz with code:', quizCode);
                const response = await axios.post(`${API_BASE_URL}/quizzes-get-by-code`, {
                    quiz_code: quizCode
                });
                console.log('Quiz response:', response.data);
                
                if (response.data?.quiz) {
                    const quizData = response.data.quiz;
                    console.log('Transformed quiz data:', quizData);
                    setCurrentQuiz({
                        id: quizData.quiz_id,
                        name: quizData.quiz_name,
                        code: quizData.quiz_code,
                        questions: quizData.questions?.questions || [],
                        dueDate: quizData.due_date,
                        teacher: quizData.teacher,
                        totalAttempts: quizData.total_attempts,
                        averageScore: quizData.average_score
                    });
                } else {
                    setError('Quiz not found');
                }
            } catch (err) {
                console.error('Error fetching quiz:', err);
                setError('Failed to load quiz');
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();
    }, [quizCode]);

    const handleTabChange = (tab) => {
        setActiveTab(tab.toLowerCase());
        if (tab === 'leaderboard') {
            navigate('/student-dashboard/leaderboard');
        } else {
            navigate(`/student-dashboard/${tab.toLowerCase().replace(' ', '-')}`);
        }
    };

    const handleAnswerChange = (questionIndex, optionIndex) => {
        setAnswers(prev => ({
            ...prev,
            [questionIndex]: optionIndex
        }));
    };

    const handleSubmitQuiz = async () => {
        try {
            const response = await axios.post(`${API_BASE_URL}/submit-quiz`, {
                quiz_id: currentQuiz.id,
                student_id: currentUser.id,
                answers: answers,
                time_taken: timeLeft
            });
            
            if (response.data.success) {
                setIsSubmitted(true);
                setScore(response.data.score);
                // Refresh quizzes list
                const quizzesResponse = await axios.get(`${API_BASE_URL}/upcoming-quizzes?student_id=${currentUser.id}`);
                if (quizzesResponse.data?.quizzes) {
                    setQuizzes(quizzesResponse.data.quizzes.map(transformQuizData));
                }
            }
        } catch (err) {
            console.error('Error submitting quiz:', err);
            setError('Failed to submit quiz');
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loader"></div>
            </div>
        );
    }

    if (!currentUser) {
        return <div className="auth-message">Session expired. Redirecting to login...</div>;
    }

    return (
        <div className="student-dashboard">
            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                currentUser={currentUser} 
                handleTabChange={handleTabChange} 
                navigate={navigate} 
            />
            <Content 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                currentUser={currentUser} 
                location={location} 
                setCurrentUser={setCurrentUser}
            />
        </div>
    );
}

function Sidebar({ activeTab, currentUser, handleTabChange }) {
    return (
        <div className="sidebar">
            <h2>Student Dashboard</h2>
            {currentUser && (
                <div className="welcome-box">
                    <p>Welcome, {currentUser.username}!</p>
                </div>
            )}
            <nav>
                <ul>
                    {['Home', 'Take Quiz', 'Results', 'Leaderboard', 'Settings'].map((tab) => (
                        <li key={tab}>
                            <button
                                className={activeTab === tab.toLowerCase() ? 'active' : ''}
                                onClick={() => handleTabChange(tab)}
                            >
                                {tab}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
}

function Content({ activeTab, setActiveTab, currentUser, location, setCurrentUser }) {
    const { pathname } = location;
    const { quizCode } = useParams();

    console.log('Content rendering with:', { pathname, quizCode, activeTab });

    if (pathname.includes('/take-quiz/')) {
        const code = pathname.split('/take-quiz/')[1];
        console.log('Rendering TakeQuizContent with code:', code);
        return <TakeQuizContent currentUser={currentUser} quizCode={code} currentQuiz={currentQuiz} />;
    }

    if (pathname.includes('/quiz/')) {
        return <ResultsContent currentUser={currentUser} setActiveTab={setActiveTab} />;
    }

    switch (activeTab) {
        case 'home':
            return <HomeContent currentUser={currentUser} setActiveTab={setActiveTab} />;
        case 'take quiz':
            return <TakeQuizContent currentUser={currentUser} />;
        case 'results':
            return <ResultsContent currentUser={currentUser} setActiveTab={setActiveTab} />;
        case 'leaderboard':
            return <LeaderboardContent currentUser={currentUser} />;
        case 'settings':
            return <SettingsContent currentUser={currentUser} setCurrentUser={setCurrentUser} />;
        default:
            return <HomeContent currentUser={currentUser} setActiveTab={setActiveTab} />;
    }
}

function HomeContent({ currentUser, setActiveTab }) {
    const [upcomingQuizzes, setUpcomingQuizzes] = useState([]);
    const [attemptedQuizzes, setAttemptedQuizzes] = useState([]);
    const [stats, setStats] = useState({
        total_attempts: 0,
        average_score: 0,
        completed_quizzes: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleQuizClick = (quizCode) => {
        console.log('Quiz clicked with code:', quizCode);
        navigate(`/student-dashboard/take-quiz/${quizCode}`, { replace: true });
    };

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                setLoading(true);
                setError('');
                if (!currentUser?.id) {
                    throw new Error('Invalid user session');
                }

                const studentId = typeof currentUser.id === 'object' ? currentUser.id.toString() : currentUser.id;

                const endpoints = [
                    `${API_BASE_URL}/upcoming-quizzes?student_id=${studentId}`,
                    `${API_BASE_URL}/user-stats?student_id=${studentId}`,
                    `${API_BASE_URL}/attempted-quizzes?student_id=${studentId}`,
                ];

                const [upcomingResponse, statsResponse, attemptedResponse] = await Promise.all(
                    endpoints.map((url) => axios.get(url))
                );

                // Transform quiz data to match frontend expectations
                const transformQuizData = (quiz) => ({
                    ...quiz,
                    questions: quiz.questions?.questions || [],
                    teacher_login: {
                        id: quiz.created_by,
                        username: quiz.teacher_login?.username || 'Unknown Teacher'
                    }
                });

                // Transform and set the data
                setUpcomingQuizzes((upcomingResponse.data?.quizzes || []).map(transformQuizData));
                setAttemptedQuizzes((attemptedResponse.data?.quizzes || []).map(transformQuizData));
                setStats(statsResponse.data || { total_attempts: 0, average_score: 0, completed_quizzes: 0 });
            } catch (err) {
                setError('Failed to load dashboard data.');
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHomeData();
    }, [currentUser]);

    const handleUpcomingQuizClick = (quizCode) => {
        navigate(`/student-dashboard/take-quiz/${quizCode}`);
    };

    const handleAttemptedQuizClick = (quizCode) => {
        navigate(`/student-dashboard/results/${quizCode}`);
    };

    if (loading) {
        return <div className="loading-screen">Loading dashboard...</div>;
    }

    return (
        <div className="content home-content">
            {error ? (
                <div className="error-message">{error}</div>
            ) : (
                <>
                    <div className="stats-section">
                        <h3>Your Statistics</h3>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h4>Total Attempts</h4>
                                <p>{stats.total_attempts}</p>
                            </div>
                            <div className="stat-card">
                                <h4>Average Score</h4>
                                <p>{(stats.average_score || 0).toFixed(1)}%</p>
                            </div>
                            <div className="stat-card">
                                <h4>Completed Quizzes</h4>
                                <p>{stats.completed_quizzes}</p>
                            </div>
                        </div>
                    </div>

                    <div className="upcoming-quizzes">
                        <h3>Upcoming Quizzes</h3>
                        {!Array.isArray(upcomingQuizzes) || upcomingQuizzes.length === 0 ? (
                            <p>No upcoming quizzes available.</p>
                        ) : (
                            <div className="quiz-list">
                                {upcomingQuizzes.map((quiz) => (
                                    <div
                                        key={quiz.quiz_id}
                                        className="quiz-card"
                                        onClick={() => handleQuizClick(quiz.quiz_code)}
                                    >
                                        <div className="quiz-card-content">
                                            <div className="quiz-header">
                                                <h3>{quiz.quiz_name}</h3>
                                                <span className="quiz-code">{quiz.quiz_code}</span>
                                            </div>
                                            <div className="quiz-details">
                                                <div className="detail-item">
                                                    <span className="label">Due Date</span>
                                                    <span className="value">{new Date(quiz.due_date).toLocaleString()}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="label">Teacher</span>
                                                    <span className="value">{quiz.teacher_login?.username || 'Unknown'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="attempted-quizzes">
                        <h3>Attempted Quizzes</h3>
                        {!Array.isArray(attemptedQuizzes) || attemptedQuizzes.length === 0 ? (
                            <p>You have not attempted any quizzes yet.</p>
                        ) : (
                            <div className="quiz-list">
                                {attemptedQuizzes.map((quiz) => (
                                    <div
                                        key={quiz.quiz_id}
                                        className="quiz-card"
                                        onClick={() => handleAttemptedQuizClick(quiz.quiz_code)}
                                    >
                                        <div className="quiz-card-content">
                                            <div className="quiz-header">
                                                <h3>{quiz.quiz_name}</h3>
                                                <span className="quiz-code">{quiz.quiz_code}</span>
                                            </div>
                                            <div className="quiz-details">
                                                <div className="detail-item">
                                                    <span className="label">Score</span>
                                                    <span className="value">{quiz.score}/{quiz.total_questions}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <span className="label">Teacher</span>
                                                    <span className="value">{quiz.teacher_login?.username || 'Unknown'}</span>
                                                </div>
                                            </div>
                                            <div className="quiz-actions">
                                                <button className="view-results-btn">View Results</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <TeacherList studentId={currentUser?.id} />
                </>
            )}
        </div>
    );
}

function TakeQuizContent({ currentUser, quizCode, currentQuiz }) {
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const navigate = useNavigate();
    const [error, setError] = useState('');

    console.log('TakeQuizContent rendering with quiz:', currentQuiz);

    const handleAnswerChange = (questionIndex, optionIndex) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [questionIndex]: optionIndex
        }));
    };

    const handleSubmitQuiz = async () => {
        try {
            const response = await axios.post(`${API_BASE_URL}/submit-quiz`, {
                quiz_id: currentQuiz.id,
                student_id: currentUser.id,
                answers: selectedAnswers,
                time_taken: timeLeft
            });
            
            if (response.data.success) {
                setIsSubmitted(true);
                setScore(response.data.score);
                // Redirect to results page after 3 seconds
                setTimeout(() => {
                    navigate(`/student-dashboard/quiz/${quizCode}`);
                }, 3000);
            }
        } catch (err) {
            console.error('Error submitting quiz:', err);
            setError('Failed to submit quiz');
        }
    };

    if (!quizCode) {
        return (
            <div className="take-quiz">
                <h2>Enter Quiz Code</h2>
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.target.elements.quizCode;
                    if (input.value) {
                        navigate(`/student-dashboard/take-quiz/${input.value}`);
                    }
                }}>
                    <input
                        type="text"
                        name="quizCode"
                        placeholder="Enter quiz code"
                        required
                    />
                    <button type="submit">Start Quiz</button>
                </form>
            </div>
        );
    }

    if (!currentQuiz) {
        return <div className="error-message">Quiz not found</div>;
    }

    if (isSubmitted) {
        return (
            <div className="quiz-submitted">
                <h2>Quiz Submitted!</h2>
                <p>Your score: {score}/{currentQuiz.questions.length}</p>
                <p>Redirecting to results...</p>
            </div>
        );
    }

    return (
        <div className="take-quiz">
            <div className="quiz-header">
                <h2>{currentQuiz.name}</h2>
                <div className="quiz-info">
                    <span>Code: {currentQuiz.code}</span>
                    <span>Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
                </div>
            </div>
            
            <div className="questions-container">
                {currentQuiz.questions.map((question, index) => (
                    <div key={index} className="question-card">
                        <h3>Question {index + 1}</h3>
                        <p>{question.question_text}</p>
                        <div className="options">
                            {question.options.map((option, optionIndex) => (
                                <label key={optionIndex} className="option">
                                    <input
                                        type="radio"
                                        name={`question-${index}`}
                                        checked={selectedAnswers[index] === optionIndex}
                                        onChange={() => handleAnswerChange(index, optionIndex)}
                                    />
                                    <span>{option.text}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="quiz-footer">
                <button onClick={handleSubmitQuiz} disabled={isSubmitted}>
                    Submit Quiz
                </button>
            </div>
        </div>
    );
}

function ResultsContent({ currentUser, setActiveTab }) {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await axios.get(`${API_BASE_URL}/attempted-quizzes?student_id=${currentUser.id}`);
                
                if (response.data?.quizzes) {
                    // Transform the data to match the expected structure
                    const transformedQuizzes = response.data.quizzes.map(quiz => ({
                        id: quiz.quiz_id,
                        title: quiz.quiz_name,
                        code: quiz.quiz_code,
                        score: quiz.score,
                        completedAt: quiz.completed_at,
                        dueDate: quiz.due_date,
                        teacher: {
                            name: quiz.teacher_login?.username || '',
                            email: quiz.teacher_login?.email || ''
                        }
                    }));

                    setQuizzes(transformedQuizzes);
                } else {
                    console.warn('Unexpected response format:', response.data);
                    setQuizzes([]);
                }
            } catch (err) {
                console.error('Error fetching quiz results:', err);
                setError('Failed to load quiz results. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, [currentUser.id]);

    const [quizCode, setQuizCode] = useState('');
    const [quizResult, setQuizResult] = useState(null);
    const [retestMessage, setRetestMessage] = useState('');
    const [retestLoading, setRetestLoading] = useState(false);
    const { quizCode: urlQuizCode } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (!urlQuizCode) {
            setQuizResult(null);
            setQuizCode('');
        }
    }, [urlQuizCode]);

    useEffect(() => {
        const fetchQuizResult = async (code) => {
            setLoading(true);
            setError('');
            try {
                const response = await axios.get(`${API_BASE_URL}/quiz-result?quiz_code=${code}&student_id=${currentUser.id}`);
                if (response.status !== 200) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                setQuizResult(response.data);
            } catch (error) {
                setError('An error occurred while fetching the quiz result.');
            } finally {
                setLoading(false);
            }
        };

        if (urlQuizCode) {
            setQuizCode(urlQuizCode);
            fetchQuizResult(urlQuizCode);
        }
    }, [urlQuizCode, currentUser?.id]);

    const handleQuizCodeSubmit = (e) => {
        e.preventDefault();
        if (quizCode) {
            navigate(`/student-dashboard/quiz/${quizCode}`);
        }
    };

    const handleCheckLeaderboard = async () => {
        console.log('Check Leaderboard button clicked');
        console.log('quizResult:', quizResult);
        if (quizResult?.quiz_id) {
            try {
                const response = await axios.get(`${API_BASE_URL}/quizzes/id/${quizResult.quiz_id}`);
                if (response.data?.quiz_code) {
                    console.log('Navigating to leaderboard with quiz code:', response.data.quiz_code);
                    setActiveTab('leaderboard');
                    navigate(`/student-dashboard/leaderboard/${response.data.quiz_code}`, {
                        state: { activeTab: 'leaderboard' }
                    });
                } else {
                    console.log('No quiz code found in response');
                }
            } catch (error) {
                console.error('Error fetching quiz code:', error);
            }
        } else {
            console.log('No quiz_id found in quizResult');
        }
    };

    const handleRequestRetest = async (quizCode, attemptId) => {
        try {
            setRetestLoading(true);
            setRetestMessage('');
            
            const response = await axios.post(`${API_BASE_URL}/retest-requests`, {
                quiz_code: quizCode,
                student_id: currentUser.id,
                attempt_id: attemptId,
                request_date: new Date().toISOString()
            });

            if (response.data.success) {
                setRetestMessage('Retest request submitted successfully!');
                setTimeout(() => {
                    setRetestMessage('');
                    setRetestLoading(false);
                }, 3000);
            }
        } catch (error) {
            console.error('Error requesting retest:', error);
            setRetestMessage('Failed to submit retest request. Please try again.');
            setRetestLoading(false);
        }
    };

    const renderQuizResult = () => {
        if (!quizResult) return null;

        return (
            <div className="quiz-result">
                <h3>{quizResult.quizName}</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-gray-900">{quizResult.quizName}</h3>
                        <p className="text-sm text-gray-500">Code: {quizResult.quiz_code}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Score: {quizResult.score}/{quizResult.totalQuestions}</p>
                        <p className="text-sm text-gray-500">Teacher: {quizResult.teacher_login.username}</p>
                    </div>
                </div>
                {quizResult.questions.map((question, questionIndex) => (
                    <div key={questionIndex} className="question-card">
                        <span className="question-number">Question {questionIndex + 1}</span>
                        <p className="question-text">{question.question_text}</p>
                        <div className="options-container">
                            {question.options.map((option, optionIndex) => {
                                const isSelected = quizResult.userAnswers[questionIndex] == optionIndex;
                                const isCorrectAnswer = option.isCorrectAnswer;
                                let className = 'option-item';
                                if (isCorrectAnswer) {
                                    className += ' correct';
                                } else if (isSelected && !isCorrectAnswer) {
                                    className += ' incorrect';
                                }
                                return (
                                    <div key={optionIndex} className={className}>
                                        <label>
                                            <input
                                                type="radio"
                                                checked={isSelected}
                                                readOnly
                                            />
                                            <span className="option-text">{option.text}</span>
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                <div className="button-container">
                    <button
                        onClick={handleCheckLeaderboard}
                        className="check-leaderboard-btn"
                    >
                        Check Leaderboard
                    </button>
                    {!retestLoading && !retestMessage && (
                        <button
                            onClick={() => handleRequestRetest(quizResult.quiz_code, quizResult.attemptId)}
                            className="request-retest-btn"
                        >
                            Request Retest
                        </button>
                    )}
                </div>
                {retestMessage && (
                    <div className={`retest-message ${retestMessage.includes('success') ? 'success' : 'error'}`}>
                        {retestMessage}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="content">
            <div className="take-quiz-content">
                <h2>Quiz Results</h2>
                {!urlQuizCode && (
                    <form onSubmit={handleQuizCodeSubmit}>
                        <input
                            type="text"
                            placeholder="Enter Quiz Code to View Results"
                            value={quizCode}
                            onChange={(e) => setQuizCode(e.target.value)}
                            className="quiz-code-input"
                        />
                        <button type="submit" className="view-results-btn" disabled={loading}>
                            {loading ? 'Loading...' : 'View Results'}
                        </button>
                    </form>
                )}
                {error && <div className="error-message">{error}</div>}
                {loading ? <div className="loading">Loading results...</div> : renderQuizResult()}
            </div>
        </div>
    );
}

function LeaderboardContent({ currentUser }) {
    const [leaderboardData, setLeaderboardData] = useState(null);
    const [quizCode, setQuizCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();
    const { quizCode: urlQuizCode } = useParams();

    useEffect(() => {
        if (urlQuizCode) {
            setQuizCode(urlQuizCode);
            fetchLeaderboard(urlQuizCode);
        }
    }, [urlQuizCode]);

    const fetchLeaderboard = async (code) => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.get(`${API_BASE_URL}/quiz-results/leaderboard?quiz_code=${code}`);
            if (response.status !== 200) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            setLeaderboardData(response.data);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setError(error.response?.data?.message || 'Failed to fetch leaderboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleQuizCodeSubmit = async (e) => {
        e.preventDefault();
        if (quizCode) {
            navigate(`/student-dashboard/leaderboard/${quizCode}`);
        }
    };

    const filteredRankings = leaderboardData?.rankings.filter(student =>
        student.student_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="content">
            <div className="leaderboard-content">
                <div className="leaderboard-header">
                    <h2>Quiz Leaderboard</h2>
                </div>

                {!urlQuizCode ? (
                    <div className="leaderboard-search-container">
                        <form onSubmit={handleQuizCodeSubmit} className="leaderboard-search-form">
                            <div className="search-input-wrapper">
                                <input
                                    type="text"
                                    placeholder="Enter Quiz Code"
                                    value={quizCode}
                                    onChange={(e) => setQuizCode(e.target.value)}
                                    className="quiz-code-input"
                                />
                                <button type="submit" className="view-leaderboard-btn" disabled={loading}>
                                    {loading ? 'Loading...' : 'View Leaderboard'}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <>
                        {error && <div className="error-message">{error}</div>}
                        {loading ? (
                            <div className="loading">Loading leaderboard...</div>
                        ) : leaderboardData ? (
                            <div className="leaderboard-container">
                                <div className="quiz-info-card">
                                    <h3>{leaderboardData.quiz_name}</h3>
                                    <p>Total Participants: {leaderboardData.rankings.length}</p>
                                    <p>Teacher: {leaderboardData.teacher_login.username}</p>
                                </div>

                                <div className="leaderboard-search-box">
                                    <input
                                        type="text"
                                        placeholder="Search by student name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="student-search-input"
                                    />
                                </div>

                                <div className="leaderboard-table-section">
                                    <table className="leaderboard-table">
                                        <thead>
                                            <tr>
                                                <th>Rank</th>
                                                <th>Name</th>
                                                <th>Score</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredRankings.map((student) => (
                                                <tr 
                                                    key={student.student_id} 
                                                    className={student.student_id === currentUser.id ? 'current-user' : ''}
                                                >
                                                    <td>{student.rank}</td>
                                                    <td>{student.student_name}</td>
                                                    <td>{student.score}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}

function SettingsContent({ currentUser, setCurrentUser }) {
    const navigate = useNavigate();
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [showProfileFields, setShowProfileFields] = useState(false);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
    });
    const [profileData, setProfileData] = useState({
        email: currentUser?.email || '',
        username: currentUser?.username || ''
    });
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeCard, setActiveCard] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    const handlePasswordChange = async () => {
        setIsLoading(true);
        setMessage('');
        try {
            const response = await axios.put(`/api/student-password-put/${currentUser.id}`, {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            if (response.data.success) {
                setSuccessMessage('Password updated successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
                setFormData({
                    currentPassword: '',
                    newPassword: '',
                });
                setShowPasswordFields(false);
                setActiveCard(null);
            }
        } catch (error) {
            console.error('Error changing password:', error);
            setErrorMessage(error.response?.data?.error || 'Failed to change password. Please try again.');
            setTimeout(() => setErrorMessage(''), 3000);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileUpdate = async () => {
        setIsLoading(true);
        setMessage('');
        try {
            const response = await axios.put(`/.netlify/functions/students-put/${currentUser.id}`, {
                username: profileData.username,
                email: profileData.email
            });
            
            if (response.data.success) {
                const updatedUser = {
                    ...currentUser,
                    username: response.data.user.username,
                    email: response.data.user.email
                };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setCurrentUser(updatedUser);
                setSuccessMessage('Profile updated successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
                setShowProfileFields(false);
                setActiveCard(null);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setErrorMessage(error.response?.data?.error || 'Failed to update profile. Please try again.');
            setTimeout(() => setErrorMessage(''), 3000);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({ ...prevState, [name]: value }));
    };

    const handleProfileInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const settingsCards = [
        {
            id: 'profile',
            title: 'Profile Settings',
            icon: '👤',
            description: 'View and update your profile information',
            color: '#4f46e5'
        },
        {
            id: 'password',
            title: 'Security',
            icon: '🔒',
            description: 'Change your password and security settings',
            color: '#7c3aed'
        },
        {
            id: 'logout',
            title: 'Logout',
            icon: '🚪',
            description: 'Sign out of your account',
            color: '#dc2626'
        }
    ];

    return (
        <div className="content">
            <div className="settings-container">
                <div className="settings-header">
                    <h2>Settings & Preferences</h2>
                </div>
                
                <div className="settings-grid">
                    {settingsCards.map((card) => (
                        <div 
                            key={card.id}
                            className={`settings-card ${activeCard === card.id ? 'active' : ''}`}
                            style={{'--card-color': card.color}}
                            onClick={() => {
                                if (card.id === 'logout') {
                                    handleLogout();
                                } else {
                                    setActiveCard(activeCard === card.id ? null : card.id);
                                    if (card.id === 'password') {
                                        setShowPasswordFields(!showPasswordFields);
                                        setShowProfileFields(false);
                                    } else if (card.id === 'profile') {
                                        setShowProfileFields(!showProfileFields);
                                        setShowPasswordFields(false);
                                    }
                                }
                            }}
                        >
                            <div className="card-icon">{card.icon}</div>
                            <div className="card-content">
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                            </div>
                            {card.id !== 'logout' && (
                                <div className="card-arrow">→</div>
                            )}
                        </div>
                    ))}
                </div>

                {showProfileFields && activeCard === 'profile' && (
                    <div className="settings-panel">
                        <div className="panel-header">
                            <h3>Profile Settings</h3>
                            <button className="close-panel" onClick={() => {
                                setShowProfileFields(false);
                                setActiveCard(null);
                            }}>×</button>
                        </div>
                        <div className="panel-content">
                            <div className="input-group">
                                <label htmlFor="username">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={profileData.username}
                                    onChange={handleProfileInputChange}
                                    placeholder="Enter your username"
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={profileData.email}
                                    onChange={handleProfileInputChange}
                                    placeholder="Enter your email"
                                />
                            </div>
                            <button
                                className="update-profile-btn"
                                onClick={handleProfileUpdate}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Updating...' : 'Update Profile'}
                            </button>
                            {successMessage && <div className="success-message">{successMessage}</div>}
                            {errorMessage && <div className="error-message">{errorMessage}</div>}
                        </div>
                    </div>
                )}

                {showPasswordFields && (
                    <div className="settings-panel">
                        <div className="panel-header">
                            <h3>Change Password</h3>
                            <button className="close-panel" onClick={() => {
                                setShowPasswordFields(false);
                                setActiveCard(null);
                            }}>×</button>
                        </div>
                        <div className="panel-content">
                            <div className="input-group">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    name="currentPassword"
                                    placeholder="Enter your current password"
                                    value={formData.currentPassword}
                                    onChange={handleInputChange}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="input-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    placeholder="Enter your new password"
                                    value={formData.newPassword}
                                    onChange={handleInputChange}
                                    disabled={isLoading}
                                />
                            </div>
                            <button
                                className="update-password-btn"
                                onClick={handlePasswordChange}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Updating...' : 'Update Password'}
                            </button>
                            {message && <div className="settings-message">{message}</div>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StudentDashboard;