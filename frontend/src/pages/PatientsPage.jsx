import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';

const INITIAL_FORM = {
  name: '',
  age: '',
  gender: '',
  address: '',
  phone: '',
};

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  // Detail view state
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Delete confirmation state
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load patients on mount
  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/patients');
      if (response.success && Array.isArray(response.data)) {
        setPatients(response.data);
      } else {
        setPatients([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load patients.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingPatient(null);
    setFormData(INITIAL_FORM);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleOpenEdit = (patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name || '',
      age: patient.age !== undefined && patient.age !== null ? String(patient.age) : '',
      gender: patient.gender || '',
      address: patient.address || '',
      phone: patient.phone || '',
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPatient(null);
    setFormData(INITIAL_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Pre-validation matching backend schema
    const trimmedName = formData.name.trim();
    const parsedAge = parseInt(formData.age, 10);

    if (!trimmedName) {
      setError('Patient name is required.');
      return;
    }
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
      setError('Age must be an integer between 0 and 150.');
      return;
    }

    const payload = {
      name: trimmedName,
      age: parsedAge,
      gender: formData.gender.trim() || null,
      address: formData.address.trim() || null,
      phone: formData.phone.trim() || null,
    };

    setSubmitting(true);
    try {
      if (editingPatient) {
        // PUT /api/patients/:id/
        const res = await api.put(`/patients/${editingPatient.id}`, payload);
        if (res.success) {
          setSuccess(`Patient "${res.data.name}" updated successfully.`);
          handleCloseForm();
          fetchPatients();
        }
      } else {
        // POST /api/patients/
        const res = await api.post('/patients', payload);
        if (res.success) {
          setSuccess(`Patient "${res.data.name}" created successfully.`);
          handleCloseForm();
          fetchPatients();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save patient record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return;
    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/patients/${patientToDelete.id}`);
      setSuccess(`Patient "${patientToDelete.name}" deleted successfully.`);
      setPatientToDelete(null);
      if (selectedPatient?.id === patientToDelete.id) {
        setSelectedPatient(null);
      }
      fetchPatients();
    } catch (err) {
      setError(err.message || 'Failed to delete patient.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Patient Management</h2>
          <p className="page-subtitle">Manage your registered patients and their medical profile details.</p>
        </div>
        <button
          className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'}`}
          onClick={showForm ? handleCloseForm : handleOpenCreate}
        >
          {showForm ? 'Cancel' : '+ Add Patient'}
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Form Section */}
      {showForm && (
        <div className="form-card">
          <h3>{editingPatient ? `Edit Patient #${editingPatient.id}` : 'Register New Patient'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group">
              <label htmlFor="patient-name">Full Name *</label>
              <input
                id="patient-name"
                type="text"
                required
                maxLength={100}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="patient-age">Age (0 - 150) *</label>
              <input
                id="patient-age"
                type="number"
                required
                min={0}
                max={150}
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="e.g. 28"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="patient-gender">Gender</label>
              <select
                id="patient-gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                disabled={submitting}
              >
                <option value="">-- Select Gender (Optional) --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="patient-phone">Phone Number</label>
              <input
                id="patient-phone"
                type="text"
                maxLength={30}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +91-9876543210"
                disabled={submitting}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="patient-address">Address</label>
              <input
                id="patient-address"
                type="text"
                maxLength={500}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. 123 Health Ave, Mumbai, India"
                disabled={submitting}
              />
            </div>

            <div className="form-actions full-width">
              <button type="button" className="btn btn-secondary" onClick={handleCloseForm} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingPatient ? 'Update Patient' : 'Save Patient'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h3 className="modal-title">Patient Details</h3>
            <div className="details-list">
              <p><strong>ID:</strong> {selectedPatient.id}</p>
              <p><strong>Name:</strong> {selectedPatient.name}</p>
              <p><strong>Age:</strong> {selectedPatient.age}</p>
              <p><strong>Gender:</strong> {selectedPatient.gender || 'Not specified'}</p>
              <p><strong>Phone:</strong> {selectedPatient.phone || 'Not provided'}</p>
              <p><strong>Address:</strong> {selectedPatient.address || 'Not provided'}</p>
              <p><strong>Registered At:</strong> {new Date(selectedPatient.created_at).toLocaleString()}</p>
              <p><strong>Last Updated:</strong> {new Date(selectedPatient.updated_at).toLocaleString()}</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedPatient(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">Loading patient records...</div>
        ) : patients.length === 0 ? (
          <div className="empty-state">
            <p>No patients found.</p>
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              Register Your First Patient
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Phone</th>
                  <th>Registered</th>
                  <th className="actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td>#{patient.id}</td>
                    <td><strong>{patient.name}</strong></td>
                    <td>{patient.age}</td>
                    <td>{patient.gender ? <span className="badge">{patient.gender}</span> : '—'}</td>
                    <td>{patient.phone || '—'}</td>
                    <td>{new Date(patient.created_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <button
                        className="btn-action btn-view"
                        onClick={() => setSelectedPatient(patient)}
                        title="View details"
                      >
                        View
                      </button>
                      <button
                        className="btn-action btn-edit"
                        onClick={() => handleOpenEdit(patient)}
                        title="Edit patient"
                      >
                        Edit
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => setPatientToDelete(patient)}
                        title="Delete patient"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(patientToDelete)}
        title="Delete Patient"
        message={`Are you sure you want to delete patient "${patientToDelete?.name}"? All related doctor assignments will also be deleted.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPatientToDelete(null)}
        isProcessing={deleting}
      />
    </div>
  );
}
