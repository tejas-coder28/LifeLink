import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { donorApi } from '../../api/donorApi';
import DonorProfileForm from '../../components/forms/DonorProfileForm';
import Card from '../../components/common/Card';
import { User, CheckCircle2 } from 'lucide-react';

const DonorProfilePage = () => {
  const { profile, setProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSubmit = async (formData) => {
    setLoading(true);
    setMsg('');
    try {
      const res = await donorApi.updateProfile(formData);
      if (res.data && res.data.success) {
        setProfile(res.data.data);
        setMsg('Donor profile updated successfully!');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-white">Donor Profile Management</h1>
        <p className="text-black text-sm">
          Keep your medical blood group, availability status & contact coordinates up to date for emergency matching algorithms.
        </p>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm font-semibold flex items-center">
          <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />
          {msg}
        </div>
      )}

      <Card title="Blood & Location Credentials" icon={User} hover={false}>
        <DonorProfileForm initialData={profile || {}} onSubmit={handleSubmit} loading={loading} />
      </Card>
    </div>
  );
};

export default DonorProfilePage;
