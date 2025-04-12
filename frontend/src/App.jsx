// src/App.jsx
import './App.css';
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import Home from './pages/Home';
import StudentLogin from './pages/StudentLogin';
import TeacherLogin from './pages/TeacherLogin';
import SignupForm from './pages/SignupForm';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import Header from './components/Header';

const Layout = ({ children }) => {
    const location = useLocation();
    const hideHeaderPaths = ['/student-dashboard', '/teacher-dashboard'];
    const shouldShowHeader = !hideHeaderPaths.some(path => location.pathname.startsWith(path));

    return (
        <div className="layout-container">
            {shouldShowHeader && <Header />}
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                // Redirect to appropriate dashboard if user is logged in
                if (parsedUser?.role) {
                    const currentPath = window.location.pathname;
                    if (!currentPath.includes(`${parsedUser.role}-dashboard`)) {
                        window.location.href = `/${parsedUser.role}-dashboard`;
                    }
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
                localStorage.removeItem('user');
            }
        }
        setLoading(false);
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <ChakraProvider>
            <Router basename="/">
                <div className="App">
                    <Routes>
                        <Route 
                            path="/" 
                            element={
                                user ? 
                                    <Navigate to={`/${user.role}-dashboard`} replace /> : 
                                    <Layout><Home /></Layout>
                            } 
                        />
                        <Route 
                            path="/student-login" 
                            element={
                                user?.role === 'student' ? 
                                    <Navigate to="/student-dashboard" replace /> : 
                                    <Layout><StudentLogin setUser={setUser} /></Layout>
                            } 
                        />
                        <Route 
                            path="/teacher-login" 
                            element={
                                user?.role === 'teacher' ? 
                                    <Navigate to="/teacher-dashboard" replace /> : 
                                    <Layout><TeacherLogin setUser={setUser} /></Layout>
                            } 
                        />
                        <Route 
                            path="/signup" 
                            element={
                                user ? 
                                    <Navigate to={`/${user.role}-dashboard`} replace /> : 
                                    <Layout><SignupForm /></Layout>
                            } 
                        />

                        {/* Student Dashboard Routes */}
                        <Route 
                            path="/student-dashboard/*" 
                            element={
                                user?.role === 'student' ? 
                                    <StudentDashboard /> : 
                                    <Navigate to="/student-login" replace />
                            } 
                        />

                        {/* Teacher Dashboard Routes */}
                        <Route 
                            path="/teacher-dashboard/*" 
                            element={
                                user?.role === 'teacher' ? 
                                    <TeacherDashboard /> : 
                                    <Navigate to="/teacher-login" replace />
                            } 
                        />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </Router>
        </ChakraProvider>
    );
}

export default App;