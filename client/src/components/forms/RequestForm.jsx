import React, { useState, useEffect } from 'react';
import { Activity, User, Building2, MapPin, Calendar, AlertCircle, Phone, ShieldCheck } from 'lucide-react';
import { BLOOD_GROUPS } from '../../utils/bloodCompatibility';
import { hospitalApi } from '../../api/hospitalApi';

const URGENCY_LEVELS = [
  { id: 'critical', label: 'Critical', sub: 'Trauma / Surgery — now (15m response window)' },
  { id: 'high',     label: 'High',     sub: 'Required within 12–24h' },
  { id: 'medium',   label: 'Medium',   sub: 'Standard urgency' },
  { id: 'low',      label: 'Low',      sub: 'Scheduled / planned' },
];

/* Shared field label */
const FieldLabel = ({ children }) => (
  <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
    {children}
  </label>
);

const RequestForm = ({ onSubmit, loading, initialData = {} }) => {
  const [patientName, setPatientName]       = useState(initialData.patientName || '');
  const [bloodGroup, setBloodGroup]         = useState(initialData.bloodGroup || '');
  const [unitsNeeded, setUnitsNeeded]       = useState(initialData.unitsNeeded || 2);
  const [urgency, setUrgency]               = useState(initialData.urgency || 'critical');
  const [targetHospital, setTargetHospital] = useState(initialData.targetHospital || initialData.hospitalId || '');
  const [hospitals, setHospitals]           = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [requiredByDate, setRequiredByDate] = useState(
    initialData.requiredByDate
      ? new Date(initialData.requiredByDate).toISOString().slice(0, 16)
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState(initialData.notes || '');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const fetchVerifiedHospitals = async () => {
      try {
        const res = await hospitalApi.getVerifiedHospitals();
        if (res.data && res.data.success) {
          setHospitals(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load verified hospitals:', err);
      } finally {
        setLoadingHospitals(false);
      }
    };
    fetchVerifiedHospitals();
  }, []);

  const selectedHospitalObj = hospitals.find(h => h._id === targetHospital);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!targetHospital) {
      setValidationError('Please select a verified hospital to review this request');
      return;
    }
    if (!bloodGroup) {
      setValidationError('Please select a required blood group');
      return;
    }
    setValidationError('');

    const address = selectedHospitalObj?.address || selectedHospitalObj?.name || 'Hospital Center';
    const coordinates = selectedHospitalObj?.location?.coordinates || [77.2090, 28.6139];

    onSubmit({
      patientName,
      bloodGroup,
      unitsNeeded: Number(unitsNeeded),
      urgency,
      targetHospital,
      hospitalId: targetHospital,
      address,
      coordinates,
      requiredByDate: new Date(requiredByDate),
      notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Target Hospital Dropdown */}
      <div>
        <FieldLabel>Select Verified Hospital *</FieldLabel>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
            <Building2 className="w-4 h-4" />
          </div>
          <select
            required
            id="targetHospitalSelect"
            value={targetHospital}
            onChange={(e) => {
              setTargetHospital(e.target.value);
              setValidationError('');
            }}
            disabled={loadingHospitals}
            className="glass-select w-full pl-10 text-xs px-3.5 py-3 cursor-pointer"
          >
            <option value="" disabled>
              {loadingHospitals ? 'Loading verified hospitals...' : 'Select hospital'}
            </option>
            {hospitals.map((h) => (
              <option key={h._id} value={h._id} className="bg-surface text-primary">
                {h.name} {h.address ? `• ${h.address}` : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedHospitalObj && (
          <div className="mt-2.5 p-3 rounded-xl bg-surface border border-hairline flex items-start gap-2.5 text-xs text-secondary">
            <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-extrabold text-primary block">{selectedHospitalObj.name} (Verified)</span>
              <p className="text-[11px] text-muted flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {selectedHospitalObj.address || 'Address registered with portal'}
              </p>
              {selectedHospitalObj.phone && (
                <p className="text-[11px] text-muted flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3" /> {selectedHospitalObj.phone}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Patient Name */}
        <div>
          <FieldLabel>Patient Name *</FieldLabel>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="e.g. Kaneesh Sharma"
              className="glass-input w-full pl-10 text-xs px-3.5 py-3"
            />
          </div>
        </div>

        {/* Units Needed */}
        <div>
          <FieldLabel>Units Required (Blood Packets) *</FieldLabel>
          <input
            type="number"
            min={1}
            max={20}
            required
            value={unitsNeeded}
            onChange={(e) => setUnitsNeeded(e.target.value)}
            className="glass-input w-full text-xs px-3.5 py-3"
          />
        </div>
      </div>

      {/* Blood Group */}
      <div>
        <FieldLabel>Required Blood Group * (No Default)</FieldLabel>
        <select
          required
          id="bloodGroupSelect"
          value={bloodGroup}
          onChange={(e) => {
            setBloodGroup(e.target.value);
            setValidationError('');
          }}
          className="glass-select w-full text-xs px-3.5 py-3 cursor-pointer"
        >
          <option value="" disabled>Select patient blood group</option>
          {BLOOD_GROUPS.map((bg) => (
            <option key={bg} value={bg} className="bg-surface text-primary">
              {bg}
            </option>
          ))}
        </select>
        {validationError && (
          <p className="mt-2 text-xs text-danger font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {validationError}
          </p>
        )}
      </div>

      {/* Urgency Selector */}
      <div>
        <FieldLabel>Urgency Level</FieldLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {URGENCY_LEVELS.map((u) => {
            const isSelected = urgency === u.id;
            const isUrgent = u.id === 'critical' || u.id === 'high';
            const isMedium = u.id === 'medium';
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setUrgency(u.id)}
                className={`p-3 rounded-2xl text-left transition-all cursor-pointer border ${
                  isSelected
                    ? isUrgent
                      ? 'bg-danger/15 border-danger shadow-glow-danger'
                      : isMedium
                      ? 'bg-warning/15 border-warning shadow-sm'
                      : 'bg-info/15 border-info shadow-sm'
                    : 'bg-surface/60 border-hairline hover:bg-surface text-secondary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-primary">{u.label}</span>
                  {isSelected && (
                    <Activity
                      className={`w-3.5 h-3.5 animate-pulse ${
                        isUrgent ? 'text-danger' : isMedium ? 'text-warning' : 'text-info'
                      }`}
                    />
                  )}
                </div>
                <span className="text-[10px] mt-1 block text-muted">{u.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Required By Date */}
      <div>
        <FieldLabel>Required By Date &amp; Time</FieldLabel>
        <div className="relative">
          <input
            type="datetime-local"
            required
            value={requiredByDate}
            onChange={(e) => setRequiredByDate(e.target.value)}
            className="glass-input w-full text-xs px-3.5 py-3"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <FieldLabel>Additional Medical Notes / Instructions (Optional)</FieldLabel>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Diagnosis, ward/bed number, surgery requirements..."
          className="glass-input w-full text-xs p-3.5 rounded-xl resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3.5 rounded-xl text-xs justify-center emergency-pulse"
      >
        <Activity className="w-4 h-4 animate-pulse" />
        <span>{loading ? 'Submitting to Hospital...' : 'Submit Emergency Request to Hospital'}</span>
      </button>
    </form>
  );
};

export default RequestForm;

