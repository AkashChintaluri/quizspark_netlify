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
                const response = await axios.get(`/api/student-quizzes?student_id=${currentUser.id}`);
                if (response.data.success) {
                    setQuizzes(response.data.upcomingQuizzes);
                } else {
                    setError('Failed to fetch quizzes');
                }
            } catch (err) {
                console.error('Error fetching quizzes:', err);
                setError('Failed to fetch quizzes');
            } finally {
                setLoading(false);
            }
        };

        if (currentUser?.id) {
            fetchQuizzes();
        }
    }, [currentUser]);

    useEffect(() => {
        const fetchQuiz = async () => {
            const pathname = location.pathname;
            const quizCodeMatch = pathname.match(/\/student-dashboard\/(?:take-quiz|quiz)\/([^/]+)/);
            const quizCode = quizCodeMatch ? quizCodeMatch[1] : null;
            
            if (!quizCode) {
                console.log('No quiz code in URL:', pathname);
                return;
            }
            
            try {
                setLoading(true);
                setError(null);
                console.log('Fetching quiz with code:', quizCode);
                const response = await axios.post(`${API_BASE_URL}/quizzes-get-by-code`, { quiz_code: quizCode });
                console.log('Raw API response:', response.data);
                
                if (response.data?.quiz) {
                    const quizData = response.data.quiz;
                    console.log('Quiz data structure:', quizData);
                    
                    // Transform the quiz data to match the expected structure
                    const transformedQuiz = {
                        id: quizData.quiz_id,
                        name: quizData.quiz_name,
                        code: quizData.quiz_code,
                        creator: quizData.created_by,
                        questions: quizData.questions.questions.map(q => ({
                            text: q.question_text,
                            options: q.options.map(opt => ({
                                text: opt.text,
                                isCorrect: opt.is_correct
                            }))
                        })),
                        dueDate: quizData.due_date,
                        createdAt: quizData.created_at
                    };
                    
                    console.log('Transformed quiz data:', transformedQuiz);
                    setCurrentQuiz(transformedQuiz);
                } else {
                    console.log('No quiz data found in response');
                    setError('Quiz not found');
                }
            } catch (err) {
                console.error('Error fetching quiz:', err);
                setError(err.response?.data?.error || 'Failed to fetch quiz');
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();
    }, [location.pathname]);

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

    const handleSubmitQuiz = async (quizId, answers) => {
        try {
            const response = await axios.post('/api/submit-quiz', {
                quiz_id: quizId,
                student_id: currentUser.id,
                answers
            });

            if (response.data.success) {
                // Refresh quizzes after submission
                const newResponse = await axios.get(`/api/student-quizzes?student_id=${currentUser.id}`);
                if (newResponse.data.success) {
                    setQuizzes(newResponse.data.upcomingQuizzes);
                }
                
                // Navigate to results page
                const quizCode = quizzes.find(q => q.quiz_id === quizId)?.quiz_code;
                if (quizCode) {
                    navigate(`/student-dashboard/quiz-results/${quizCode}`);
                } else {
                    navigate('/student-dashboard/quiz-results');
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
    const [currentQuiz, setCurrentQuiz] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Extract quiz code from URL for both take-quiz and quiz results routes
    const quizCodeMatch = pathname.match(/\/student-dashboard\/(?:take-quiz|quiz)\/([^/]+)/);
    const quizCode = quizCodeMatch ? quizCodeMatch[1] : null;

    useEffect(() => {
        const fetchQuiz = async () => {
            if (!quizCode) {
                console.log('No quiz code in URL:', pathname);
                return;
            }
            
            setLoading(true);
            setError(null);
            try {
                console.log('Fetching quiz with code:', quizCode);
                const response = await axios.post(`${API_BASE_URL}/quizzes-get-by-code`, { quiz_code: quizCode });
                console.log('Raw API response:', response.data);
                
                if (response.data?.quiz) {
                    const quizData = response.data.quiz;
                    console.log('Quiz data structure:', quizData);
                    
                    // Transform the quiz data to match the expected structure
                    const transformedQuiz = {
                        id: quizData.quiz_id,
                        name: quizData.quiz_name,
                        code: quizData.quiz_code,
                        creator: quizData.created_by,
                        questions: quizData.questions.questions.map(q => ({
                            text: q.question_text,
                            options: q.options.map(opt => ({
                                text: opt.text,
                                isCorrect: opt.is_correct
                            }))
                        })),
                        dueDate: quizData.due_date,
                        createdAt: quizData.created_at
                    };
                    
                    console.log('Transformed quiz data:', transformedQuiz);
                    setCurrentQuiz(transformedQuiz);
                } else {
                    console.log('No quiz data found in response');
                    setError('Quiz not found');
                }
            } catch (err) {
                console.error('Error fetching quiz:', err);
                setError(err.response?.data?.error || 'Failed to fetch quiz');
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();
    }, [quizCode, pathname]);

    console.log('Content rendering with:', { pathname, activeTab, currentQuiz, loading, error });

    if (pathname.includes('/take-quiz/')) {
        const code = pathname.split('/take-quiz/')[1];
        console.log('Rendering TakeQuizContent with code:', code);
        return <TakeQuizContent 
            currentUser={currentUser} 
            quizCode={code} 
            currentQuiz={currentQuiz}
            loading={loading}
            error={error}
        />;
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`/api/student-quizzes?student_id=${currentUser.id}`);
                if (response.data.success) {
                    setUpcomingQuizzes(response.data.upcomingQuizzes);
                    setAttemptedQuizzes(response.data.attemptedQuizzes);
                } else {
                    setError('Failed to fetch quizzes');
                }
            } catch (err) {
                console.error('Error fetching quizzes:', err);
                setError('Failed to fetch quizzes');
            } finally {
                setLoading(false);
            }
        };

        if (currentUser?.id) {
            fetchQuizzes();
        }
    }, [currentUser]);

    const handleSubmitQuiz = async (quizId, answers) => {
        try {
            const response = await axios.post('/api/submit-quiz', {
                quiz_id: quizId,
                student_id: currentUser.id,
                answers
            });

            if (response.data.success) {
                // Refresh quizzes after submission
                const newResponse = await axios.get(`/api/student-quizzes?student_id=${currentUser.id}`);
                if (newResponse.data.success) {
                    setUpcomingQuizzes(newResponse.data.upcomingQuizzes);
                    setAttemptedQuizzes(newResponse.data.attemptedQuizzes);
                }
                
                // Navigate to results page
                const quizCode = upcomingQuizzes.find(q => q.quiz_id === quizId)?.quiz_code;
                if (quizCode) {
                    navigate(`/student-dashboard/quiz-results/${quizCode}`);
                } else {
                    navigate('/student-dashboard/quiz-results');
                }
            }
        } catch (err) {
            console.error('Error submitting quiz:', err);
            setError('Failed to submit quiz');
        }
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="dashboard-content">
            <div className="quiz-section">
                <h2>Upcoming Quizzes</h2>
                {upcomingQuizzes.length === 0 ? (
                    <p>No upcoming quizzes available</p>
                ) : (
                    <div className="quiz-grid">
                        {upcomingQuizzes.map(quiz => (
                            <QuizCard
                                key={quiz.quiz_id}
                                quiz={quiz}
                                onStartQuiz={() => navigate(`/student-dashboard/take-quiz/${quiz.quiz_code}`)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="quiz-section">
                <h2>Attempted Quizzes</h2>
                {attemptedQuizzes.length === 0 ? (
                    <p>No attempted quizzes yet</p>
                ) : (
                    <div className="quiz-grid">
                        {attemptedQuizzes.map(quiz => (
                            <QuizCard
                                key={quiz.quiz_id}
                                quiz={quiz}
                                attempt={quiz.attempt}
                                onViewResults={() => navigate(`/student-dashboard/quiz-results/${quiz.quiz_code}`)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function TakeQuizContent({ currentUser, quizCode, currentQuiz, loading, error }) {
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const navigate = useNavigate();

    console.log('TakeQuizContent rendering with quiz:', currentQuiz);

    const handleAnswerChange = (questionIndex, optionIndex) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [questionIndex]: optionIndex
        }));
    };

    const handleSubmitQuiz = async () => {
        try {
            // Transform selectedAnswers into the format expected by the backend
            const answersObject = {};
            let correctAnswers = 0;
            
            Object.entries(selectedAnswers).forEach(([questionIndex, optionIndex]) => {
                answersObject[questionIndex] = optionIndex;
                // Check if the selected option is correct
                if (currentQuiz.questions[questionIndex].options[optionIndex].isCorrect) {
                    correctAnswers++;
                }
            });

            const response = await axios.post(`${API_BASE_URL}/submit-quiz`, {
                quiz_id: currentQuiz.id,
                student_id: currentUser.id,
                answers: answersObject,
                total_questions: currentQuiz.questions.length,
                correct_answers: correctAnswers
            });
            
            if (response.data.success) {
                // Immediately navigate to results page
                navigate(`/student-dashboard/quiz/${quizCode}`);
            }
        } catch (err) {
            console.error('Error submitting quiz:', err);
            alert(err.response?.data?.error || 'Failed to submit quiz. Please try again.');
        }
    };

    if (!quizCode) {
        return (
            <div className="content">
                <div className="take-quiz-content">
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
                            className="quiz-code-input"
                            placeholder="Enter quiz code"
                            required
                        />
                        <button type="submit" className="start-quiz-btn">
                            Start Quiz
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="content">
                <div className="loading">Loading quiz...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="content">
                <div className="error-message">{error}</div>
            </div>
        );
    }

    if (!currentQuiz) {
        return (
            <div className="content">
                <div className="error-message">Quiz not found</div>
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="content">
                <div className="quiz-submitted">
                    <h2>Quiz Submitted!</h2>
                    <p>Your score: {score}/{currentQuiz.questions.length}</p>
                    <p>Redirecting to results...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="content">
            <div className="quiz-title">
                <span>{currentQuiz.name}</span>
                <span>Quiz Code: {currentQuiz.code}</span>
            </div>
            <div className="question-list">
                {currentQuiz.questions.map((question, index) => (
                    <div key={index} className="question-card">
                        <span className="question-number">Question {index + 1}</span>
                        <p className="question-text">{question.question_text}</p>
                        <div className="options-container">
                            {question.options.map((option, optionIndex) => (
                                <div key={optionIndex} className="option-item">
                                    <label className={selectedAnswers[index] === optionIndex ? 'selected' : ''}>
                                        <input
                                            type="radio"
                                            name={`question_${index}`}
                                            value={optionIndex}
                                            checked={selectedAnswers[index] === optionIndex}
                                            onChange={() => handleAnswerChange(index, optionIndex)}
                                        />
                                        <span className="option-text">{option.text}</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <button
                className="submit-quiz-btn"
                onClick={handleSubmitQuiz}
                disabled={loading || Object.keys(selectedAnswers).length !== currentQuiz.questions.length}
            >
                {loading ? 'Submitting...' : 'Submit Quiz'}
            </button>
        </div>
    );
}

function ResultsContent({ currentUser, setActiveTab }) {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quizResult, setQuizResult] = useState(null);
    const { quizCode } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchQuizResult = async () => {
            if (!quizCode) return;
            
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`${API_BASE_URL}/quiz-result?quiz_code=${quizCode}&student_id=${currentUser.id}`);
                if (response.data?.attempt) {
                    setQuizResult(response.data.attempt);
                }
            } catch (err) {
                console.error('Error fetching quiz result:', err);
                setError('Failed to load quiz result');
            } finally {
                setLoading(false);
            }
        };

        fetchQuizResult();
    }, [quizCode, currentUser.id]);

    useEffect(() => {
        const fetchAttemptedQuizzes = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await axios.get(`${API_BASE_URL}/attempted-quizzes?student_id=${currentUser.id}`);
                
                if (response.data?.quizzes) {
                    const transformedQuizzes = response.data.quizzes.map(quiz => ({
                        id: quiz.quiz_id,
                        name: quiz.quiz_name,
                        code: quiz.quiz_code,
                        score: quiz.score,
                        total_questions: quiz.total_questions,
                        percentage: Math.round((quiz.score / quiz.total_questions) * 100),
                        completedAt: quiz.attempt_date,
                        dueDate: quiz.due_date,
                        teacher: {
                            name: quiz.teacher_login?.username || 'Unknown Teacher'
                        }
                    }));
                    setQuizzes(transformedQuizzes);
                }
            } catch (err) {
                console.error('Error fetching attempted quizzes:', err);
                setError('Failed to load quiz history');
            } finally {
                setLoading(false);
            }
        };

        fetchAttemptedQuizzes();
    }, [currentUser.id]);

    const handleQuizClick = (code) => {
        navigate(`/student-dashboard/quiz/${code}`);
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    if (quizCode && quizResult) {
        return (
            <div className="content">
                <div className="quiz-result-details">
                    <h2>Quiz Results</h2>
                    <div className="result-card">
                        <div className="result-header">
                            <h3>{quizResult.quiz_name}</h3>
                            <span className="quiz-code">Code: {quizResult.quiz_code}</span>
                        </div>
                        <div className="result-stats">
                            <div className="stat-item">
                                <span className="label">Score:</span>
                                <span className="value">{quizResult.score}/{quizResult.total_questions}</span>
                            </div>
                            <div className="stat-item">
                                <span className="label">Percentage:</span>
                                <span className="value">{Math.round((quizResult.score / quizResult.total_questions) * 100)}%</span>
                            </div>
                            <div className="stat-item">
                                <span className="label">Completed:</span>
                                <span className="value">{new Date(quizResult.attempt_date).toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="questions-list">
                            {quizResult.questions?.map((question, index) => (
                                <div key={index} className="question-result">
                                    <div className="question-header">
                                        <span className="question-number">Question {index + 1}</span>
                                        <span className={`status ${question.is_correct ? 'correct' : 'incorrect'}`}>
                                            {question.is_correct ? 'Correct' : 'Incorrect'}
                                        </span>
                                    </div>
                                    <p className="question-text">{question.question_text}</p>
                                    <div className="answer-details">
                                        <div className="your-answer">
                                            <span className="label">Your Answer:</span>
                                            <span className="value">{question.your_answer}</span>
                                        </div>
                                        {!question.is_correct && (
                                            <div className="correct-answer">
                                                <span className="label">Correct Answer:</span>
                                                <span className="value">{question.correct_answer}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="content">
            <div className="quiz-history">
                <h2>Quiz History</h2>
                {quizzes.length === 0 ? (
                    <p>No quiz attempts found.</p>
                ) : (
                    <div className="quiz-list">
                        {quizzes.map(quiz => (
                            <div 
                                key={quiz.id} 
                                className="quiz-card"
                                onClick={() => handleQuizClick(quiz.code)}
                            >
                                <div className="quiz-card-content">
                                    <div className="quiz-header">
                                        <h3>{quiz.name}</h3>
                                        <span className="quiz-code">{quiz.code}</span>
                                    </div>
                                    <div className="quiz-details">
                                        <div className="detail-item">
                                            <span className="label">Score:</span>
                                            <span className="value">{quiz.score}/{quiz.total_questions}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">Percentage:</span>
                                            <span className="value">{quiz.percentage}%</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">Completed:</span>
                                            <span className="value">{new Date(quiz.completedAt).toLocaleString()}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label">Teacher:</span>
                                            <span className="value">{quiz.teacher.name}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
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