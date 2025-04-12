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
                setUser(JSON.parse(storedUser));
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
                        <Route path="/" element={<Layout><Home /></Layout>} />
                        <Route path="/student-login" element={<Layout><StudentLogin setUser={setUser} /></Layout>} />
                        <Route path="/teacher-login" element={<Layout><TeacherLogin setUser={setUser} /></Layout>} />
                        <Route path="/signup" element={<Layout><SignupForm /></Layout>} />

                        {/* Student Dashboard Routes */}
                        <Route 
                            path="/student-dashboard/*" 
                            element={user?.role === 'student' ? <StudentDashboard /> : <Navigate to="/" />} 
                        />

                        {/* Teacher Dashboard Routes */}
                        <Route 
                            path="/teacher-dashboard/*" 
                            element={user?.role === 'teacher' ? <TeacherDashboard /> : <Navigate to="/" />} 
                        />

                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
            </Router>
        </ChakraProvider>
    );
}

export default App;