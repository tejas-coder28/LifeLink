import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import { useToast } from '../../context/ToastContext';
import RequestForm from '../../components/forms/RequestForm';
import Card from '../../components/common/Card';
import { Activity } from 'lucide-react';

const CreateRequest = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const res = await requestApi.createRequest(formData);
      if (res.data && res.data.success) {
        const newReq = res.data.data;
        showSuccess('Emergency request created! Matching donors are being notified.');
        navigate(`/individual/track/${newReq._id}`);
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create blood request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 page-enter">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-1" style={{ background: 'rgba(220,38,38,0.15)', color: '#fb7185', border: '1px solid rgba(220,38,38,0.3)' }}>
          <Activity className="w-3.5 h-3.5" /> Emergency Dispatch
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-primary font-heading tracking-tight">
          Create <span className="gradient-text-brand">Emergency Request</span>
        </h1>
        <p className="text-xs max-w-md mx-auto text-secondary">
          Specify patient requirements and hospital address to trigger immediate rule-based donor matching.
        </p>
      </div>

      <Card title="Patient Details & Need" icon={Activity} hover={false}>
        <RequestForm onSubmit={handleSubmit} loading={loading} />
      </Card>
    </div>
  );
};

export default CreateRequest;
