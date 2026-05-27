import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import DuplicateDetector from './pages/DuplicateDetector';
import ReleaseNotes from './pages/ReleaseNotes';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';

function App() {
  const [connectedRepo, setConnectedRepo] = useState('');

  return (
    <AuthProvider>
      <Router>
        <ErrorBoundary>
          <Layout connectedRepo={connectedRepo} setConnectedRepo={setConnectedRepo}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<Dashboard connectedRepo={connectedRepo} />} />
              <Route path="/chat" element={<Chat connectedRepo={connectedRepo} />} />
              <Route path="/duplicates" element={<DuplicateDetector connectedRepo={connectedRepo} />} />
              <Route path="/release-notes" element={<ReleaseNotes />} />
            </Routes>
          </Layout>
        </ErrorBoundary>
      </Router>
    </AuthProvider>
  );
}

export default App;
