import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { requestApi } from '../../api/requestApi';
import RequestForm from '../../components/forms/RequestForm';
import GlassCard from '../../components/common/GlassCard';
import PageTransition from '../../components/common/PageTransition';
import Button from '../../components/common/Button';
import { Activity, AlertTriangle, ShieldCheck, Flame, Zap } from 'lucide-react';

const EmergencyRequest = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
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
        const msg = 'Request submitted to selected hospital! Redirecting to live status tracker...';
        setSuccessMsg(msg);
        showSuccess(msg);
        setTimeout(() => {
          navigate(`/individual/track/${newReq._id}`);
        }, 1200);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to submit blood request';
      showError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Emergency Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-black shadow-glow-brand bg-brand-500/15 border border-brand-500/40 text-brand-400">
          <Activity className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
          <span>Priority Emergency Dispatch</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-primary font-heading tracking-tight">
          Broadcast <span className="gradient-text-brand">Emergency Blood Need</span>
        </h1>
        <p className="text-xs sm:text-sm max-w-lg mx-auto text-secondary leading-relaxed">
          Submitting triggers the Smart Matching Engine to evaluate standby volunteer donors within hospital range and dispatch immediate push alerts.
        </p>
      </div>

      {/* Guest Warning Banner */}
      {!user && (
        <div className="p-4 rounded-2xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <span className="font-semibold">You need an active user account to broadcast emergency requests.</span>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/login?redirect=/emergency-request')}
            className="w-full sm:w-auto shrink-0"
          >
            Sign In First
          </Button>
        </div>
      )}

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-2xl text-teal-400 text-xs sm:text-sm font-semibold flex items-center shadow-glow-teal">
          <ShieldCheck className="w-5 h-5 mr-2.5 shrink-0 text-teal-400" />
          {successMsg}
        </div>
      )}

      {/* Main Request Form in Glowing Glass Card */}
      <GlassCard
        title="Emergency Request Details"
        subtitle="All hospital transmissions are verified and encrypted"
        icon={Flame}
        glow={true}
        hover={false}
        className="border-brand-500/30"
      >
        <RequestForm onSubmit={handleSubmit} loading={loading} />
      </GlassCard>
    </PageTransition>
  );
};

export default EmergencyRequest;
