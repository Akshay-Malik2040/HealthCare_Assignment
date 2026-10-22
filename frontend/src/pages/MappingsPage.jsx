import React, { useState, useEffect } from 'react';
import api from '../api/client';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';

export default function MappingsPage() {
  const [mappings, setMappings] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Creation form state
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [showAssignForm, setShowAssignForm] = useState(false);

  // Filter state: view assigned doctors for a specific patient
  const [filterPatientId, setFilterPatientId] = useState('');
  const [patientDoctors, setPatientDoctors] = useState([]);
  const [loadingPatientDoctors, setLoadingPatientDoctors] = useState(false);

  // Delete confirmation state
  const [mappingToDelete, setMappingToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  // When patient filter changes, fetch doctors for that patient
  useEffect(() => {
    if (filterPatientId) {
      fetchDoctorsForPatient(filterPatientId);
    } else {
      setPatientDoctors([]);
    }
  }, [filterPatientId]);

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const [mappingsRes, patientsRes, doctorsRes] = await Promise.all([
        api.get('/mappings'),
        api.get('/patients'),
        api.get('/doctors'),
      ]);

      if (mappingsRes.success && Array.isArray(mappingsRes.data)) {
        setMappings(mappingsRes.data);
      }
      if (patientsRes.success && Array.isArray(patientsRes.data)) {
        setPatients(patientsRes.data);
      }
      if (doctorsRes.success && Array.isArray(doctorsRes.data)) {
        setDoctors(doctorsRes.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load mapping data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorsForPatient = async (patientId) => {
    setLoadingPatientDoctors(true);
    setError('');
    try {
      const res = await api.get(`/mappings/${patientId}`);
      if (res.success && Array.isArray(res.data)) {
        setPatientDoctors(res.data);
      } else {
        setPatientDoctors([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load assigned doctors for this patient.');
      setPatientDoctors([]);
    } finally {
      setLoadingPatientDoctors(false);
    }
  };

  const handleCreateMapping = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const patientId = parseInt(selectedPatientId, 10);
    const doctorId = parseInt(selectedDoctorId, 10);

    if (isNaN(patientId) || isNaN(doctorId)) {
      setError('Please select both a patient and a doctor.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/mappings', {
        patient_id: patientId,
        doctor_id: doctorId,
      });

      if (res.success) {
        setSuccess('Doctor successfully assigned to patient.');
        setSelectedPatientId('');
        setSelectedDoctorId('');
        setShowAssignForm(false);
        loadAllData();
        if (filterPatientId && parseInt(filterPatientId, 10) === patientId) {
          fetchDoctorsForPatient(patientId);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to assign doctor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMappingConfirm = async () => {
    if (!mappingToDelete) return;
    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/mappings/${mappingToDelete.id}`);
      setSuccess('Doctor assignment removed successfully.');
      setMappingToDelete(null);
      loadAllData();
      if (filterPatientId) {
        fetchDoctorsForPatient(filterPatientId);
      }
    } catch (err) {
      setError(err.message || 'Failed to remove assignment.');
    } finally {
      setDeleting(false);
    }
  };

  const getPatientName = (id) => {
    const pat = patients.find((p) => p.id === id);
    return pat ? pat.name : `Patient #${id}`;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Patient–Doctor Mappings</h2>
          <p className="page-subtitle">Assign doctors to your patients and manage medical care teams.</p>
        </div>
        <button
          className={`btn ${showAssignForm ? 'btn-secondary' : 'btn-primary'}`}
          onClick={() => {
            setShowAssignForm(!showAssignForm);
            setError('');
            setSuccess('');
          }}
        >
          {showAssignForm ? 'Cancel' : '+ New Assignment'}
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Assignment Creation Form */}
      {showAssignForm && (
        <div className="form-card">
          <h3>Assign Doctor to Patient</h3>
          {patients.length === 0 ? (
            <p className="form-warning">
              You must have at least one registered patient before assigning a doctor. Please create a patient first.
            </p>
          ) : doctors.length === 0 ? (
            <p className="form-warning">
              There are no doctors in the catalog yet. Please add a doctor first.
            </p>
          ) : (
            <form onSubmit={handleCreateMapping} className="form-grid">
              <div className="form-group">
                <label htmlFor="assign-patient">Select Patient *</label>
                <select
                  id="assign-patient"
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">-- Choose Patient --</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Age: {p.age})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="assign-doctor">Select Doctor *</label>
                <select
                  id="assign-doctor"
                  required
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialization}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-actions full-width">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAssignForm(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Assigning...' : 'Assign Doctor'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Filter Toolbar: Patient Specific Lookup */}
      <div className="filter-card">
        <label htmlFor="filter-patient"><strong>Filter by Patient:</strong></label>
        <select
          id="filter-patient"
          value={filterPatientId}
          onChange={(e) => setFilterPatientId(e.target.value)}
        >
          <option value="">-- View All Patient Mappings --</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (#{p.id})
            </option>
          ))}
        </select>
        {filterPatientId && (
          <button className="btn btn-sm btn-secondary" onClick={() => setFilterPatientId('')}>
            Show All
          </button>
        )}
      </div>

      {/* Results View */}
      <div className="table-card">
        {loading ? (
          <div className="loading-state">Loading assignments...</div>
        ) : filterPatientId ? (
          // View specific to one patient: GET /api/mappings/:patient_id
          <div>
            <div className="section-title-bar">
              <h4>Assigned Doctors for {getPatientName(parseInt(filterPatientId, 10))}</h4>
              <span className="badge badge-info">{patientDoctors.length} assigned</span>
            </div>
            {loadingPatientDoctors ? (
              <div className="loading-state">Fetching assigned doctors...</div>
            ) : patientDoctors.length === 0 ? (
              <div className="empty-state">
                <p>No doctors are currently assigned to this patient.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mapping ID</th>
                      <th>Doctor Name</th>
                      <th>Specialization</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Assigned At</th>
                      <th className="actions-header">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientDoctors.map((doc) => (
                      <tr key={doc.mapping_id}>
                        <td>#{doc.mapping_id}</td>
                        <td><strong>{doc.doctor_name}</strong></td>
                        <td><span className="badge badge-spec">{doc.specialization}</span></td>
                        <td>{doc.email}</td>
                        <td>{doc.phone || '—'}</td>
                        <td>{new Date(doc.assigned_at).toLocaleDateString()}</td>
                        <td className="actions-cell">
                          <button
                            className="btn-action btn-delete"
                            onClick={() =>
                              setMappingToDelete({
                                id: doc.mapping_id,
                                description: `${doc.doctor_name} from ${getPatientName(parseInt(filterPatientId, 10))}`,
                              })
                            }
                            title="Remove assignment"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          // General list: GET /api/mappings
          <div>
            <div className="section-title-bar">
              <h4>All Active Assignments ({mappings.length})</h4>
            </div>
            {mappings.length === 0 ? (
              <div className="empty-state">
                <p>No patient-doctor assignments found.</p>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAssignForm(true)}
                  disabled={patients.length === 0 || doctors.length === 0}
                >
                  Create First Assignment
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Specialization</th>
                      <th>Assigned On</th>
                      <th className="actions-header">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m) => (
                      <tr key={m.id}>
                        <td>#{m.id}</td>
                        <td>
                          <strong>{m.patient_name}</strong>
                          <span className="sub-text"> (Age: {m.patient_age})</span>
                        </td>
                        <td><strong>{m.doctor_name}</strong></td>
                        <td><span className="badge badge-spec">{m.doctor_specialization}</span></td>
                        <td>{new Date(m.created_at).toLocaleDateString()}</td>
                        <td className="actions-cell">
                          <button
                            className="btn-action btn-delete"
                            onClick={() =>
                              setMappingToDelete({
                                id: m.id,
                                description: `${m.doctor_name} from ${m.patient_name}`,
                              })
                            }
                            title="Remove assignment"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Mapping Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(mappingToDelete)}
        title="Remove Doctor Assignment"
        message={`Are you sure you want to remove the assignment of ${mappingToDelete?.description}? This will not delete the patient or doctor record.`}
        onConfirm={handleDeleteMappingConfirm}
        onCancel={() => setMappingToDelete(null)}
        isProcessing={deleting}
      />
    </div>
  );
}
