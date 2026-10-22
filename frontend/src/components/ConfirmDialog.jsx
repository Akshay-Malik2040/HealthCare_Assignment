import React from 'react';

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, isProcessing }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <h3 className="modal-title">{title || 'Confirm Action'}</h3>
        <p className="modal-message">{message || 'Are you sure you want to proceed with this action?'}</p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
