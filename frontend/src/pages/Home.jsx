// src/components/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
    return (
        <div className="home">
            <div className="content">
                <header className="home-header">
                    <h1>QuizSpark</h1>
                    <p>Ignite Learning with Interactive Quizzes</p>
                </header>

                <main className="home-main">
                    {/* Left side: Why Choose QuizSpark */}
                    <section className="features">
                        <h2>Why Choose QuizSpark?</h2>
                        <ul className="feature-list">
                            <li className="feature-item">
                                <i className="fas fa-puzzle-piece"></i>
                                <p>Interactive and engaging quizzes</p>
                            </li>
                            <li className="feature-item">
                                <i className="fas fa-user-friends"></i>
                                <p>User-friendly for students and teachers</p>
                            </li>
                            <li className="feature-item">
                                <i className="fas fa-chart-line"></i>
                                <p>Real-time results and feedback</p>
                            </li>
                            <li className="feature-item">
                                <i className="fas fa-sliders-h"></i>
                                <p>Customizable quiz options</p>
                            </li>
                        </ul>
                    </section>

                    {/* Right side: Call-to-action */}
                    <section className="cta">
                        <h2>Ready to Spark Your Learning?</h2>
                        <div className="cta-buttons">
                            <Link to="/student-login" className="cta-button student">
                                Student Login
                            </Link>
                            <Link to="/teacher-login" className="cta-button teacher">
                                Teacher Login
                            </Link>
                        </div>
                    </section>
                </main>

                <footer className="home-footer">
                    <p>&copy; 2025 QuizSpark. Empowering Education Through Technology.</p>
                </footer>
            </div>
        </div>
    );
}

export default Home;
