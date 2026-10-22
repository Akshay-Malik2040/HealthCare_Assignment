import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Alert from './components/Alert';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PatientsPage from './pages/PatientsPage';
import DoctorsPage from './pages/DoctorsPage';
import MappingsPage from './pages/MappingsPage';
import { authStorage } from './api/client';

export default function App() {
  const [token, setToken] = useState(() => authStorage.getToken());
  const [user, setUser] = useState(() => authStorage.getUser());
  const [activeTab, setActiveTab] = useState(() => {
    return authStorage.getToken() ? 'patients' : 'login';
  });
  const [globalMessage, setGlobalMessage] = useState(null);

  // Listen for 401 unauthorized events to gracefully expire session
  useEffect(() => {
    const handleUnauthorized = () => {
      authStorage.clear();
      setToken(null);
      setUser(null);
      setActiveTab('login');
      setGlobalMessage({
        type: 'error',
        text: 'Your session has expired or is invalid. Please log in again.',
      });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const handleLoginSuccess = (loggedInUser, userToken) => {
    setUser(loggedInUser);
    setToken(userToken);
    setActiveTab('patients');
    setGlobalMessage({
      type: 'success',
      text: `Welcome back, ${loggedInUser?.name || 'User'}!`,
    });
  };

  const handleLogout = () => {
    authStorage.clear();
    setUser(null);
    setToken(null);
    setActiveTab('login');
    setGlobalMessage({
      type: 'info',
      text: 'You have been successfully logged out.',
    });
  };

  const handleTabSelect = (tab) => {
    setGlobalMessage(null);
    setActiveTab(tab);
  };

  return (
    <div className="app-shell">
      <Header
        user={user}
        activeTab={activeTab}
        onSelectTab={handleTabSelect}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {globalMessage && (
          <div className="global-alert-container">
            <Alert
              type={globalMessage.type}
              message={globalMessage.text}
              onClose={() => setGlobalMessage(null)}
            />
          </div>
        )}

        {!user ? (
          <div className="auth-wrapper">
            {activeTab === 'register' ? (
              <RegisterPage
                onSwitchToLogin={() => setActiveTab('login')}
                onRegisterSuccess={() => setActiveTab('login')}
              />
            ) : (
              <LoginPage
                onLoginSuccess={handleLoginSuccess}
                onSwitchToRegister={() => setActiveTab('register')}
              />
            )}
          </div>
        ) : (
          <>
            {activeTab === 'patients' && <PatientsPage />}
            {activeTab === 'doctors' && <DoctorsPage />}
            {activeTab === 'mappings' && <MappingsPage />}
          </>
        )}
      </main>

      <footer className="footer">
        <div className="footer-container">
          <span>Healthcare Management REST API Client &bull; Local Environment</span>
          <span className="footer-status">Connected to port 5001</span>
        </div>
      </footer>
    </div>
  );
}
