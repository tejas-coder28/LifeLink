import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestApi } from '../../api/requestApi';
import RequestForm from '../../components/forms/RequestForm';
import Card from '../../components/common/Card';
import { Activity, ShieldCheck } from 'lucide-react';

const CreateRequest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const res = await requestApi.createRequest(formData);
      if (res.data && res.data.success) {
        const newReq = res.data.data;
        navigate(`/recipient/track/${newReq._id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create blood request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-white">Create Emergency Request</h1>
        <p className="text-black text-sm">
          Specify patient requirements and address to trigger immediate rule-based donor ranking.
        </p>
      </div>

      <Card title="Patient Details & Need" icon={Activity} hover={false}>
        <RequestForm onSubmit={handleSubmit} loading={loading} />
      </Card>
    </div>
  );
};

export default CreateRequest;
