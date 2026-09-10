import React, { useState } from 'react';
import { ALL_BLOOD_GROUPS } from '../../utils/bloodCompatibility';
import { AlertCircle, Send, MapPin, Calendar, User, Activity } from 'lucide-react';

const RequestForm = ({ onSubmit, initialValues = {}, loading = false }) => {
  const [patientName, setPatientName] = useState(initialValues.patientName || '');
  const [bloodGroup, setBloodGroup] = useState(initialValues.bloodGroup || 'A+');
  const [unitsNeeded, setUnitsNeeded] = useState(initialValues.unitsNeeded || 1);
  const [urgency, setUrgency] = useState(initialValues.urgency || 'high');
  const [address, setAddress] = useState(initialValues.address || '');
  const [notes, setNotes] = useState(initialValues.notes || '');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!patientName.trim()) {
      setError('Patient name is required');
      return;
    }
    if (!address.trim()) {
      setError('Hospital or delivery address is required');
      return;
    }

    onSubmit({
      patientName,
      bloodGroup,
      unitsNeeded: Number(unitsNeeded),
      urgency,
      address,
      notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-black mb-1">Patient Name</label>
        <div className="relative">
          <User className="w-4 h-4 absolute left-3 top-3 text-black" />
          <input
            type="text"
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="e.g. Robert Vance"
            className="w-full bg-lightbg/90 text-black text-sm pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-black mb-1">Blood Group Needed</label>
          <select
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            className="w-full bg-lightbg/90 text-black text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:outline-none"
          >
            {ALL_BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-black mb-1">Units Needed</label>
          <input
            type="number"
            min="1"
            max="10"
            required
            value={unitsNeeded}
            onChange={(e) => setUnitsNeeded(e.target.value)}
            className="w-full bg-lightbg/90 text-black text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-black mb-1">Urgency Level</label>
        <div className="grid grid-cols-4 gap-2">
          {['low', 'medium', 'high', 'critical'].map((lvl) => (
            <button
              type="button"
              key={lvl}
              onClick={() => setUrgency(lvl)}
              className={`py-2 text-xs font-bold uppercase rounded-xl border transition-all ${
                urgency === lvl
                  ? lvl === 'critical'
                    ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500'
                  : 'bg-lightbg text-black border-slate-200 hover:bg-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-black mb-1">Hospital / Delivery Address</label>
        <div className="relative">
          <MapPin className="w-4 h-4 absolute left-3 top-3 text-black" />
          <input
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Hospital name, ward number & city address"
            className="w-full bg-lightbg/90 text-black text-sm pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-black mb-1">Medical Notes (Optional)</label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any specific medical requirements..."
          className="w-full bg-lightbg/90 text-black text-sm px-3 py-2 rounded-xl border border-slate-200 focus:border-rose-500 focus:outline-none resize-none"
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-2"
      >
        <Activity className="w-4 h-4" />
        <span>{loading ? 'Submitting Request...' : 'Broadcast Emergency Blood Request'}</span>
      </button>
    </form>
  );
};

export default RequestForm;
