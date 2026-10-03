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
        setSuccessMsg('Emergency blood request broadcast successfully! Standby donors matching your criteria have been alerted.');
        setTimeout(() => {
          navigate('/donor/dashboard?tab=my-requests');
        }, 1500);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit blood request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 page-enter">
      <div className="text-center space-y-2">
        <div
          className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm"
          style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#fb7185' }}
        >
          <Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span>Priority Emergency Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-primary font-heading tracking-tight">
          Broadcast <span className="gradient-text-brand">Emergency Blood Need</span>
        </h1>
        <p className="text-xs max-w-md mx-auto text-secondary">
          Submitting this request immediately triggers the Smart Matching Engine to evaluate nearby standby donors and send high-priority notifications.
        </p>
      </div>

      {!user && (
        <div
          className="p-4 rounded-2xl text-xs flex items-center justify-between bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <span>You need an active account to broadcast an emergency request.</span>
          </div>
          <button
            onClick={() => navigate('/login?redirect=/emergency-request')}
            className="btn-primary text-xs px-3.5 py-1.5 rounded-xl"
          >
            Sign In
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm font-semibold flex items-center">
          <ShieldCheck className="w-5 h-5 mr-2 shrink-0 text-emerald-600" />
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
