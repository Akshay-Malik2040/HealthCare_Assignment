import React, { useState } from 'react';
import api from '../api/client';
import Alert from '../components/Alert';

export default function RegisterPage({ onSwitchToLogin, onRegisterSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Please provide your name.');
      return;
    }
    if (!email.trim()) {
      setError('Please provide a valid email.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (response.success) {
        setSuccess('Registration successful! You can now log in.');
        setName('');
        setEmail('');
        setPassword('');
        if (onRegisterSuccess) {
          setTimeout(() => {
            onRegisterSuccess();
          }, 1500);
        }
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Create an Account</h2>
      <p className="auth-subtitle">Register to manage patients and doctors</p>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} />}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="reg-name">Full Name</label>
          <input
            id="reg-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dr. Sarah Connor"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-email">Email Address</label>
          <input
            id="reg-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. sarah@example.com"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-password">Password (minimum 8 characters)</label>
          <input
            id="reg-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            disabled={loading}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <div className="auth-footer">
        <span>Already have an account?</span>{' '}
        <button type="button" className="link-btn" onClick={onSwitchToLogin} disabled={loading}>
          Sign in here
        </button>
      </div>
    </div>
  );
}
