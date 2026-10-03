import React, { useState } from 'react';
import { Activity, User, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { BLOOD_GROUPS } from '../../utils/bloodCompatibility';

const URGENCY_LEVELS = [
  { id: 'critical', label: 'Critical', sub: 'Trauma / Surgery — now', borderCol: 'rgba(224,21,21,0.55)', bgCol: 'rgba(224,21,21,0.15)', textCol: '#ff6b6b' },
  { id: 'high',     label: 'High',     sub: 'Required within 12–24h',  borderCol: 'rgba(243,112,32,0.50)', bgCol: 'rgba(243,112,32,0.12)', textCol: '#ffa05a' },
  { id: 'medium',   label: 'Medium',   sub: 'Standard urgency',         borderCol: 'rgba(59,158,255,0.45)', bgCol: 'rgba(59,158,255,0.12)', textCol: '#7fc3ff' },
  { id: 'low',      label: 'Low',      sub: 'Scheduled / planned',      borderCol: 'rgba(100,116,139,0.35)', bgCol: 'rgba(100,116,139,0.10)', textCol: '#94a3b8' },
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
  const [address, setAddress]               = useState(initialData.address || '');
  const [requiredByDate, setRequiredByDate] = useState(
    initialData.requiredByDate
      ? new Date(initialData.requiredByDate).toISOString().slice(0, 16)
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState(initialData.notes || '');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!bloodGroup) {
      setValidationError('Please select a required blood group');
      return;
    }
    setValidationError('');
    onSubmit({ patientName, bloodGroup, unitsNeeded: Number(unitsNeeded), urgency, address, requiredByDate: new Date(requiredByDate), notes, coordinates: [77.2090, 28.6139] });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Patient Name */}
        <div>
          <FieldLabel>Patient / Requester Name</FieldLabel>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
              <User className="w-4 h-4" />
            </div>
            <input type="text" required value={patientName} onChange={(e) => setPatientName(e.target.value)}
              placeholder="Robert Vance" className="glass-input w-full pl-10 text-xs px-3.5 py-3" />
          </div>
        </div>

        {/* Units Needed */}
        <div>
          <FieldLabel>Units Required (Blood Packets)</FieldLabel>
          <input type="number" min={1} max={10} required value={unitsNeeded}
            onChange={(e) => setUnitsNeeded(e.target.value)}
            className="glass-input w-full text-xs px-3.5 py-3" />
        </div>
      </div>

      {/* Blood Group */}
      <div>
        <FieldLabel>Required Blood Group *</FieldLabel>
        <select
          required
          value={bloodGroup}
          onChange={(e) => {
            setBloodGroup(e.target.value);
            setValidationError('');
          }}
          className="glass-select w-full text-xs px-3.5 py-3"
        >
          <option value="" disabled>Select patient blood group</option>
          {BLOOD_GROUPS.map((bg) => (
            <option key={bg} value={bg} className="bg-surface text-primary">
              {bg}
            </option>
          ))}
        </select>
        {validationError && (
          <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {validationError}
          </p>
        )}
      </div>

      {/* Urgency Selector */}
      <div>
        <FieldLabel>Urgency Level</FieldLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {URGENCY_LEVELS.map((u) => (
            <button
              key={u.id} type="button" onClick={() => setUrgency(u.id)}
              className="p-3 rounded-xl text-left transition-all cursor-pointer"
              style={urgency === u.id
                ? { background: u.bgCol, border: `1.5px solid ${u.borderCol}` }
                : { background: 'var(--surface)', border: '1px solid var(--border)' }
              }
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-primary">{u.label}</span>
                {urgency === u.id && <Activity className="w-3.5 h-3.5 animate-pulse text-rose-600 dark:text-rose-400" />}
              </div>
              <span className="text-[10px] mt-0.5 block text-muted">{u.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Required By Date */}
      <div>
        <FieldLabel>Required By Date &amp; Time</FieldLabel>
        <input type="datetime-local" required value={requiredByDate}
          onChange={(e) => setRequiredByDate(e.target.value)}
          className="glass-input w-full text-xs px-3.5 py-3" />
      </div>

      {/* Hospital Address */}
      <div>
        <FieldLabel>Hospital Name &amp; Location Address</FieldLabel>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
            <MapPin className="w-4 h-4" />
          </div>
          <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="AIIMS Emergency Ward 4, Ring Road, New Delhi"
            className="glass-input w-full pl-10 text-xs px-3.5 py-3" />
        </div>
      </div>

      {/* Notes */}
      <div>
        <FieldLabel>Additional Medical Notes / Instructions (Optional)</FieldLabel>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Urgent cardiac trauma surgery scheduled for tomorrow morning."
          className="glass-input w-full text-xs p-3.5 rounded-xl resize-none" />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 rounded-xl text-xs justify-center emergency-pulse">
        <Activity className="w-4 h-4 animate-pulse" />
        <span>{loading ? 'Broadcasting Request...' : 'Broadcast Emergency Blood Request'}</span>
      </button>
    </form>
  );
};

export default RequestForm;
