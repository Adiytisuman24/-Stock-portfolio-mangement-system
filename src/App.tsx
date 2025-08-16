import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import StockDetail from './pages/StockDetail';
import Portfolio from './pages/Portfolio';
import AdminDashboard from './pages/AdminDashboard';

function AppContent() {
  const { user, preferences, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          <Route 
            path="/onboarding" 
            element={
              user && !preferences?.onboarding_completed ? 
                <Onboarding /> : 
                <Navigate to="/" />
            } 
          />
          <Route 
            path="/" 
            element={
              user ? (
                user.role === 'admin' ? <AdminDashboard /> :
                !preferences?.onboarding_completed ? <Navigate to="/onboarding" /> :
                <Dashboard />
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route path="/stocks/:symbol" element={user ? <StockDetail /> : <Navigate to="/login" />} />
          <Route 
            path="/portfolio" 
            element={
              user && user.role !== 'admin' ? <Portfolio /> : <Navigate to="/" />
            } 
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;