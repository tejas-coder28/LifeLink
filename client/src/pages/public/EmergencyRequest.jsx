import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { requestApi } from '../../api/requestApi';
import RequestForm from '../../components/forms/RequestForm';
import Card from '../../components/common/Card';
import { Activity, AlertTriangle, ShieldCheck } from 'lucide-react';

const EmergencyRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (formData) => {
    if (!user) {
      navigate('/login?redirect=/emergency-request');
      return;
    }

    setLoading(true);
    setSuccessMsg('');
    try {
      const res = await requestApi.createRequest(formData);
      if (res.data && res.data.success) {
        const newReq = res.data.data;
        setSuccessMsg('Emergency blood request created! Matching engine has notified standby donors.');
        setTimeout(() => {
          navigate(`/recipient/track/${newReq._id}`);
        }, 1500);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit blood request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-100 text-rose-600 text-xs font-bold uppercase tracking-wider animate-pulse">
          <Activity className="w-4 h-4" />
          <span>Priority Emergency Portal</span>
        </div>
        <h1 className="text-3xl font-extrabold text-black">Broadcast Emergency Blood Need</h1>
        <p className="text-black text-sm">
          Submitting this request immediately triggers the Smart Matching Engine to evaluate nearby standby donors and send high-priority notifications.
        </p>
      </div>

      {!user && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            <span>You need an active recipient or donor account to create a request.</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm font-semibold flex items-center">
          <ShieldCheck className="w-5 h-5 mr-2 shrink-0" />
          {successMsg}
        </div>
      )}

      <Card title="Emergency Request Form" icon={Activity} hover={false}>
        <RequestForm onSubmit={handleSubmit} loading={loading} />
      </Card>
    </div>
  );
};

export default EmergencyRequest;
