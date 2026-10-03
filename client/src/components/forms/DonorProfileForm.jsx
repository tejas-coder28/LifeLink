import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Heart, ShieldAlert } from 'lucide-react';
import { BLOOD_GROUPS, compatibleRecipientGroups, compatibleDonorGroups } from '../../utils/bloodCompatibility';

const HEALTH_FLAGS_OPTIONS = [
  { id: 'none',             label: 'No Known Medical Conditions' },
  { id: 'active_infection', label: 'Active Infection / Fever' },
  { id: 'tattoos_recent',   label: 'Tattoo / Piercing (Last 6 Months)' },
  { id: 'underweight',      label: 'Weight Below 50 kg' },
  { id: 'hepatitis',        label: 'History of Hepatitis' },
];

const FieldLabel = ({ children, icon: Icon }) => (
  <label className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
    {Icon && <Icon className="w-3.5 h-3.5" style={{ color: '#fb7185' }} />}
    {children}
  </label>
);

const DonorProfileForm = ({ initialData = {}, onSubmit, loading }) => {
  const [bloodGroup, setBloodGroup]         = useState(initialData.bloodGroup || 'O+');
  const [contactNumber, setContactNumber]   = useState(initialData.contactNumber || initialData.user?.phone || '');
  const [age, setAge]                       = useState(initialData.age || '');
  const [gender, setGender]                 = useState(initialData.gender || 'male');
  const [address, setAddress]               = useState(initialData.address || '');
  const [lastDonationDate, setLastDonationDate] = useState(
    initialData.lastDonationDate ? new Date(initialData.lastDonationDate).toISOString().split('T')[0] : ''
  );
  const [isAvailable, setIsAvailable]       = useState(initialData.isAvailable !== false);
  const [healthFlags, setHealthFlags]       = useState(initialData.healthFlags || ['none']);

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      if (initialData.bloodGroup) setBloodGroup(initialData.bloodGroup);
      if (initialData.contactNumber || initialData.user?.phone) {
        setContactNumber(initialData.contactNumber || initialData.user?.phone || '');
      }
      if (initialData.age !== undefined) setAge(initialData.age || '');
      if (initialData.gender) setGender(initialData.gender);
      if (initialData.address !== undefined) setAddress(initialData.address || '');
      if (initialData.lastDonationDate) {
        setLastDonationDate(new Date(initialData.lastDonationDate).toISOString().split('T')[0]);
      }
      if (initialData.isAvailable !== undefined) setIsAvailable(initialData.isAvailable);
      if (initialData.healthFlags) setHealthFlags(initialData.healthFlags);
    }
  }, [initialData]);

  const handleFlagToggle = (flagId) => {
    if (flagId === 'none') { setHealthFlags(['none']); return; }
    let updated = healthFlags.filter((f) => f !== 'none');
    if (updated.includes(flagId)) updated = updated.filter((f) => f !== flagId);
    else updated.push(flagId);
    if (updated.length === 0) updated = ['none'];
    setHealthFlags(updated);
  };

  const [formError, setFormError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    let parsedAge = undefined;
    if (age !== '' && age !== null && age !== undefined) {
      const num = Number(age);
      if (isNaN(num) || num < 18 || num > 65) {
        setFormError('Eligible donor age must be between 18 and 65 years.');
        return;
      }
      parsedAge = num;
    }

    if (lastDonationDate) {
      const d = new Date(lastDonationDate);
      if (isNaN(d.getTime())) {
        setFormError('Please enter a valid last donation date.');
        return;
      }
      if (d > new Date()) {
        setFormError('Last donation date cannot be in the future.');
        return;
      }
    }

    const payload = {
      bloodGroup,
      contactNumber,
      gender,
      address,
      lastDonationDate: lastDonationDate ? new Date(lastDonationDate).toISOString() : null,
      isAvailable,
      healthFlags,
      coordinates: initialData.location?.coordinates || initialData.coordinates || [77.2090, 28.6139],
    };

    if (parsedAge !== undefined) {
      payload.age = parsedAge;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Availability toggle */}
      <div
        className="p-4 rounded-2xl flex items-center justify-between border border-theme bg-surface"
      >
        <div>
          <span className="text-xs font-extrabold text-primary block">Standby Availability Status</span>
          <span className="text-[11px] block mt-0.5 text-secondary">
            {isAvailable ? 'Active — receiving emergency donor alerts' : 'Inactive / Offline (paused)'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsAvailable(!isAvailable)}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            isAvailable
              ? 'bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
              : 'bg-slate-200 dark:bg-white/10 text-secondary border border-theme'
          }`}
        >
          {isAvailable ? '● ONLINE' : '○ OFFLINE'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Blood Group */}
        <div>
          <FieldLabel>Blood Group</FieldLabel>
          <div className="grid grid-cols-4 gap-2">
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={bg} type="button" onClick={() => setBloodGroup(bg)}
                className={`py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                  bloodGroup === bg
                    ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 shadow-sm'
                    : 'bg-surface text-secondary border-theme hover:border-slate-400'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>

          {bloodGroup && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-theme text-xs space-y-1.5">
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="text-muted font-semibold text-[10px]">You can donate to:</span>
                {compatibleRecipientGroups(bloodGroup).map((bg) => (
                  <span key={bg} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                    {bg}
                  </span>
                ))}
              </div>
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="text-muted font-semibold text-[10px]">You can receive from:</span>
                {compatibleDonorGroups(bloodGroup).map((bg) => (
                  <span key={bg} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                    {bg}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contact Number */}
        <div>
          <FieldLabel>Contact Number</FieldLabel>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
              <Phone className="w-4 h-4" />
            </div>
            <input type="text" required value={contactNumber} onChange={(e) => setContactNumber(e.target.value)}
              placeholder="+91 9876543210" className="glass-input w-full pl-10 text-xs px-3.5 py-3" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Age */}
        <div>
          <FieldLabel>Age (Years)</FieldLabel>
          <input type="number" min={18} max={65} value={age} onChange={(e) => setAge(e.target.value)}
            className="glass-input w-full text-xs px-3.5 py-3" />
        </div>

        {/* Gender */}
        <div>
          <FieldLabel>Gender</FieldLabel>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="glass-select w-full text-xs px-3.5 py-3">
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Last Donation Date */}
        <div>
          <FieldLabel>Last Donation Date</FieldLabel>
          <input type="date" value={lastDonationDate} onChange={(e) => setLastDonationDate(e.target.value)}
            className="glass-input w-full text-xs px-3.5 py-3" />
        </div>
      </div>

      {/* Address */}
      <div>
        <FieldLabel>Primary City / Region Address</FieldLabel>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none" style={{ color: 'var(--text-muted)' }}>
            <MapPin className="w-4 h-4" />
          </div>
          <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="Connaught Place, New Delhi"
            className="glass-input w-full pl-10 text-xs px-3.5 py-3" />
        </div>
      </div>

      {/* Health Flags */}
      <div>
        <FieldLabel icon={ShieldAlert}>Medical &amp; Eligibility Health Flags</FieldLabel>
        <div className="space-y-2 p-4 rounded-2xl bg-surface-glass border border-theme">
          {HEALTH_FLAGS_OPTIONS.map((opt) => (
            <label key={opt.id} className="flex items-center space-x-3 cursor-pointer">
              <div
                className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                style={healthFlags.includes(opt.id)
                  ? { background: 'rgba(220,38,38,0.25)', border: '1.5px solid rgba(220,38,38,0.55)' }
                  : { background: 'var(--surface-glass)', border: '1.5px solid var(--border)' }
                }
                onClick={() => handleFlagToggle(opt.id)}
              >
                {healthFlags.includes(opt.id) && (
                  <svg className="w-2.5 h-2.5" style={{ color: '#fb7185' }} fill="currentColor" viewBox="0 0 12 12">
                    <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                )}
              </div>
              <input type="checkbox" checked={healthFlags.includes(opt.id)} onChange={() => handleFlagToggle(opt.id)} className="sr-only" />
              <span className="text-xs font-medium" style={{ color: healthFlags.includes(opt.id) ? '#fb7185' : 'var(--text-secondary)' }}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {formError && (
        <div className="p-3.5 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <span>⚠️ {formError}</span>
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 rounded-xl text-xs justify-center cursor-pointer">
        <Heart className="w-4 h-4" />
        <span>{loading ? 'Saving Profile...' : 'Update Donor Profile'}</span>
      </button>
    </form>
  );
};

export default DonorProfileForm;
