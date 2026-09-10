import React, { useState } from 'react';
import { ALL_BLOOD_GROUPS } from '../../utils/bloodCompatibility';
import { Save, AlertCircle } from 'lucide-react';

const DonorProfileForm = ({ initialData = {}, onSubmit, loading = false }) => {
  const [bloodGroup, setBloodGroup] = useState(initialData.bloodGroup || 'O+');
  const [age, setAge] = useState(initialData.age || 25);
  const [gender, setGender] = useState(initialData.gender || 'male');
  const [address, setAddress] = useState(initialData.address || '');
  const [contactNumber, setContactNumber] = useState(initialData.contactNumber || '');
  const [isAvailable, setIsAvailable] = useState(initialData.isAvailable !== false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (age < 18 || age > 65) {
      setError('Donor age must be between 18 and 65');
      return;
    }

    onSubmit({
      bloodGroup,
      age: Number(age),
      gender,
      address,
      contactNumber,
      isAvailable,
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-black mb-1">Blood Group</label>
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
          <label className="block text-xs font-semibold text-black mb-1">Age (18 - 65)</label>
          <input
            type="number"
            min="18"
            max="65"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full bg-lightbg/90 text-black text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-black mb-1">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full bg-lightbg/90 text-black text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:outline-none"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-black mb-1">Contact Phone</label>
          <input
            type="text"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            placeholder="+91 9876543210"
            className="w-full bg-lightbg/90 text-black text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-black mb-1">Location Address / Area</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. Connaught Place, New Delhi"
          className="w-full bg-lightbg/90 text-black text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center space-x-3 p-3 bg-lightbg/60 rounded-xl border border-slate-200">
        <input
          type="checkbox"
          id="isAvailable"
          checked={isAvailable}
          onChange={(e) => setIsAvailable(e.target.checked)}
          className="w-4 h-4 text-rose-600 rounded border-slate-200 bg-lightbg focus:ring-rose-500"
        />
        <label htmlFor="isAvailable" className="text-xs font-medium text-black cursor-pointer">
          Currently Standby Available for Emergency Blood Donations
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center space-x-2"
      >
        <Save className="w-4 h-4" />
        <span>{loading ? 'Saving Profile...' : 'Save Donor Profile'}</span>
      </button>
    </form>
  );
};

export default DonorProfileForm;
