import React, { useState, useEffect } from 'react';
import { requestApi } from '../../api/requestApi';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import { Heart, Calendar, MapPin, CheckCircle2 } from 'lucide-react';

const DonationHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await requestApi.getDonationHistory();
        if (res.data && res.data.success) {
          setHistory(res.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch donation history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-white">Your Donation Impact History</h1>
        <p className="text-black text-sm">
          Track your past pledges, completed blood donations, and verified hospital fulfillments.
        </p>
      </div>

      {loading ? (
        <Loader text="Loading your donation activity..." />
      ) : history.length === 0 ? (
        <Card hover={false} className="text-center py-12">
          <p className="text-black text-sm">You haven't pledged or completed any donations yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <Card key={item._id} hover={false} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <Badge bloodGroup={item.request?.bloodGroup || 'O+'} />
                  <span className="text-base font-bold text-white">
                    {item.request?.patientName ? `Donation for ${item.request.patientName}` : 'Emergency Blood Request'}
                  </span>
                  <Badge status={item.status} />
                </div>
                <div className="text-xs text-black space-y-1">
                  <div className="flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-rose-400" />
                    <span>{item.request?.address || 'Medical Facility'}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-sky-400" />
                    <span>Pledged on: {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-extrabold text-rose-400 block">{item.unitsDonated} Unit(s)</span>
                <span className="text-[11px] text-black block">ID: {item._id.slice(-6)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DonationHistory;
