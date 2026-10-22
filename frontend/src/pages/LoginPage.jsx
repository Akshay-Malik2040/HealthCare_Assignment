import React, { useState } from 'react';
import api, { authStorage } from '../api/client';
import Alert from '../components/Alert';

export default function LoginPage({ onLoginSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.success && response.data?.token) {
        authStorage.setToken(response.data.token);
        authStorage.setUser(response.data.user);
        onLoginSuccess(response.data.user, response.data.token);
      } else {
        setError('Login failed: Token not received from server.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Account Login</h2>
      <p className="auth-subtitle">Sign in to access Healthcare Management</p>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="login-email">Email Address</label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. doctor@example.com"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="auth-footer">
        <span>Don't have an account?</span>{' '}
        <button type="button" className="link-btn" onClick={onSwitchToRegister} disabled={loading}>
          Register here
        </button>
      </div>
    </div>
  );
}
