import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { donorApi } from '../../api/donorApi';
import DonorProfileForm from '../../components/forms/DonorProfileForm';
import Card from '../../components/common/Card';
import { User } from 'lucide-react';

const DonorProfilePage = () => {
  const { profile, setProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const res = await donorApi.updateProfile(formData);
      if (res.data && res.data.success) {
        setProfile(res.data.data);
        showSuccess('Donor profile updated successfully!');
      }
    } catch (err) {
      const errMsg = err.response?.data?.errors?.map((e) => e.message).filter(Boolean).join('. ')
        || err.response?.data?.message
        || 'Failed to update profile';
      showError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 page-enter">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-primary font-heading tracking-tight">
          Donor <span className="gradient-text-brand">Profile Management</span>
        </h1>
        <p className="text-xs sm:text-sm max-w-md mx-auto text-secondary">
          Keep your medical blood group, availability status & contact coordinates up to date for emergency matching algorithms.
        </p>
      </div>

      <Card title="Blood & Location Credentials" icon={User} hover={false}>
        <DonorProfileForm initialData={profile || {}} onSubmit={handleSubmit} loading={loading} />
      </Card>
    </div>
  );
};

export default DonorProfilePage;
