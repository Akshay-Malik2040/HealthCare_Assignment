import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';

const INITIAL_FORM = {
  name: '',
  specialization: '',
  email: '',
  phone: '',
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  // Detail view state
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Delete confirmation state
  const [doctorToDelete, setDoctorToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/doctors');
      if (response.success && Array.isArray(response.data)) {
        setDoctors(response.data);
      } else {
        setDoctors([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load doctors list.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingDoctor(null);
    setFormData(INITIAL_FORM);
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleOpenEdit = (doctor) => {
    setEditingDoctor(doctor);
    setFormData({
      name: doctor.name || '',
      specialization: doctor.specialization || '',
      email: doctor.email || '',
      phone: doctor.phone || '',
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDoctor(null);
    setFormData(INITIAL_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedName = formData.name.trim();
    const trimmedSpec = formData.specialization.trim();
    const trimmedEmail = formData.email.trim().toLowerCase();

    if (!trimmedName) {
      setError('Doctor name is required.');
      return;
    }
    if (!trimmedSpec) {
      setError('Specialization is required.');
      return;
    }
    if (!trimmedEmail) {
      setError('Doctor email address is required.');
      return;
    }

    const payload = {
      name: trimmedName,
      specialization: trimmedSpec,
      email: trimmedEmail,
      phone: formData.phone.trim() || null,
    };

    setSubmitting(true);
    try {
      if (editingDoctor) {
        // PUT /api/doctors/:id/
        const res = await api.put(`/doctors/${editingDoctor.id}`, payload);
        if (res.success) {
          setSuccess(`Doctor "${res.data.name}" updated successfully.`);
          handleCloseForm();
          fetchDoctors();
        }
      } else {
        // POST /api/doctors/
        const res = await api.post('/doctors', payload);
        if (res.success) {
          setSuccess(`Doctor "${res.data.name}" added to catalog.`);
          handleCloseForm();
          fetchDoctors();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save doctor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!doctorToDelete) return;
    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/doctors/${doctorToDelete.id}`);
      setSuccess(`Doctor "${doctorToDelete.name}" deleted from catalog.`);
      setDoctorToDelete(null);
      if (selectedDoctor?.id === doctorToDelete.id) {
        setSelectedDoctor(null);
      }
      fetchDoctors();
    } catch (err) {
      // Handles 409 foreign key conflict if assignments exist
      setError(err.message || 'Failed to delete doctor. Ensure no active patient assignments reference this doctor.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Doctor Catalog</h2>
          <p className="page-subtitle">View and manage shared healthcare doctors and specialists.</p>
        </div>
        <button
          className={`btn ${showForm ? 'btn-secondary' : 'btn-primary'}`}
          onClick={showForm ? handleCloseForm : handleOpenCreate}
        >
          {showForm ? 'Cancel' : '+ Add Doctor'}
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Form Section */}
      {showForm && (
        <div className="form-card">
          <h3>{editingDoctor ? `Edit Doctor #${editingDoctor.id}` : 'Add New Doctor to Catalog'}</h3>
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group">
              <label htmlFor="doctor-name">Doctor Name *</label>
              <input
                id="doctor-name"
                type="text"
                required
                maxLength={100}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Dr. Neha Sharma"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="doctor-spec">Specialization *</label>
              <input
                id="doctor-spec"
                type="text"
                required
                maxLength={100}
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="e.g. Cardiology, Pediatrics"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="doctor-email">Email Address *</label>
              <input
                id="doctor-email"
                type="email"
                required
                maxLength={255}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. neha.sharma@hospital.com"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="doctor-phone">Phone Number</label>
              <input
                id="doctor-phone"
                type="text"
                maxLength={30}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +91-9876543210"
                disabled={submitting}
              />
            </div>

            <div className="form-actions full-width">
              <button type="button" className="btn btn-secondary" onClick={handleCloseForm} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingDoctor ? 'Update Doctor' : 'Save Doctor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Doctor Details Modal */}
      {selectedDoctor && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <h3 className="modal-title">Doctor Details</h3>
            <div className="details-list">
              <p><strong>ID:</strong> {selectedDoctor.id}</p>
              <p><strong>Name:</strong> {selectedDoctor.name}</p>
              <p><strong>Specialization:</strong> {selectedDoctor.specialization}</p>
              <p><strong>Email:</strong> {selectedDoctor.email}</p>
              <p><strong>Phone:</strong> {selectedDoctor.phone || 'Not provided'}</p>
              <p><strong>Created At:</strong> {new Date(selectedDoctor.created_at).toLocaleString()}</p>
              <p><strong>Last Updated:</strong> {new Date(selectedDoctor.updated_at).toLocaleString()}</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedDoctor(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">Loading doctor records...</div>
        ) : doctors.length === 0 ? (
          <div className="empty-state">
            <p>No doctors found in catalog.</p>
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              Add the First Doctor
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Specialization</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Added On</th>
                  <th className="actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doctor) => (
                  <tr key={doctor.id}>
                    <td>#{doctor.id}</td>
                    <td><strong>{doctor.name}</strong></td>
                    <td><span className="badge badge-spec">{doctor.specialization}</span></td>
                    <td>{doctor.email}</td>
                    <td>{doctor.phone || '—'}</td>
                    <td>{new Date(doctor.created_at).toLocaleDateString()}</td>
                    <td className="actions-cell">
                      <button
                        className="btn-action btn-view"
                        onClick={() => setSelectedDoctor(doctor)}
                        title="View details"
                      >
                        View
                      </button>
                      <button
                        className="btn-action btn-edit"
                        onClick={() => handleOpenEdit(doctor)}
                        title="Edit doctor"
                      >
                        Edit
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => setDoctorToDelete(doctor)}
                        title="Delete doctor"
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
        isOpen={Boolean(doctorToDelete)}
        title="Delete Doctor"
        message={`Are you sure you want to delete "${doctorToDelete?.name}"? If any patient-doctor mappings still reference this doctor, deletion will be safely rejected.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDoctorToDelete(null)}
        isProcessing={deleting}
      />
    </div>
  );
}
