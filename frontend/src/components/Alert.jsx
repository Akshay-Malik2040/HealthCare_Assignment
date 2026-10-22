import React from 'react';

export default function Alert({ type = 'info', message, onClose }) {
  if (!message) return null;

  return (
    <div className={`alert alert-${type}`}>
      <span className="alert-message">{message}</span>
      {onClose && (
        <button className="alert-close" onClick={onClose} title="Dismiss notification">
          ×
        </button>
      )}
    </div>
  );
}
