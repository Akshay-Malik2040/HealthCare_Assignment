import React from 'react';

export default function Header({ user, activeTab, onSelectTab, onLogout }) {
  return (
    <header className="header">
      <div className="header-container">
        <div className="brand" onClick={() => onSelectTab(user ? 'patients' : 'login')}>
          <span className="brand-icon">⚕</span>
          <span className="brand-title">Healthcare Management</span>
        </div>

        <nav className="nav-links">
          {user ? (
            <>
              <button
                className={`nav-btn ${activeTab === 'patients' ? 'active' : ''}`}
                onClick={() => onSelectTab('patients')}
              >
                Patients
              </button>
              <button
                className={`nav-btn ${activeTab === 'doctors' ? 'active' : ''}`}
                onClick={() => onSelectTab('doctors')}
              >
                Doctors
              </button>
              <button
                className={`nav-btn ${activeTab === 'mappings' ? 'active' : ''}`}
                onClick={() => onSelectTab('mappings')}
              >
                Mappings
              </button>
            </>
          ) : (
            <>
              <button
                className={`nav-btn ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => onSelectTab('login')}
              >
                Login
              </button>
              <button
                className={`nav-btn ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => onSelectTab('register')}
              >
                Register
              </button>
            </>
          )}
        </nav>

        {user && (
          <div className="user-section">
            <span className="user-info" title={user.email}>
              👤 <strong>{user.name || 'User'}</strong>
            </span>
            <button className="logout-btn" onClick={onLogout} title="Log out of session">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
