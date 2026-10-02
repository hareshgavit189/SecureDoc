import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CasesPage from './pages/CasesPage.jsx';
import CaseDetailPage from './pages/CaseDetailPage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import DocumentViewerPage from './pages/DocumentViewerPage.jsx';
import AuditPage from './pages/AuditPage.jsx';
import VerifyPage from './pages/VerifyPage.jsx';
import DeadlinesPage from './pages/DeadlinesPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

function VerifyWrapper() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div
        className="d-flex align-items-center justify-content-center"
        style={{ minHeight: '100vh', background: '#f8fafc' }}
      >
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }
  if (user) {
    return (
      <Layout>
        <VerifyPage inLayout={true} />
      </Layout>
    );
  }
  return <VerifyPage inLayout={false} />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public & Contextual routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyWrapper />} />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protected routes wrapped in Layout */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/cases/:id" element={<CaseDetailPage />} />
            <Route path="/cases/:id/upload" element={<UploadPage />} />
            <Route path="/documents/:id" element={<DocumentViewerPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/deadlines" element={<DeadlinesPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
