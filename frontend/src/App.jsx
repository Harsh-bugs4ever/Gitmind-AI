import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import DuplicateDetector from './pages/DuplicateDetector';
import ReleaseNotes from './pages/ReleaseNotes';
import AuthCallback from './pages/AuthCallback';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  const [connectedRepo, setConnectedRepo] = useState('');

  return (
    <AuthProvider>
      <Router>
        <ErrorBoundary>
          <Layout connectedRepo={connectedRepo} setConnectedRepo={setConnectedRepo}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard connectedRepo={connectedRepo} /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat connectedRepo={connectedRepo} /></ProtectedRoute>} />
              <Route path="/duplicates" element={<ProtectedRoute><DuplicateDetector connectedRepo={connectedRepo} /></ProtectedRoute>} />
              <Route path="/release-notes" element={<ProtectedRoute><ReleaseNotes /></ProtectedRoute>} />
            </Routes>
          </Layout>
        </ErrorBoundary>
      </Router>
    </AuthProvider>
  );
}

export default App;
