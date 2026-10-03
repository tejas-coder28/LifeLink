import React, { useState, useEffect } from 'react';
import { requestApi } from '../../api/requestApi';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { Heart, Calendar, MapPin, CheckCircle2 } from 'lucide-react';

const DonationHistoryPage = () => {
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 page-enter">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-primary font-heading tracking-tight">
          Your Donation <span className="gradient-text-brand">Impact History</span>
        </h1>
        <p className="text-xs sm:text-sm max-w-md mx-auto text-secondary">
          Track your past pledges, completed blood donations, and verified hospital fulfillments.
        </p>
      </div>

      {loading ? (
        <Loader text="Loading your donation activity..." />
      ) : history.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No Past Donations Recorded"
          description="You haven't pledged or completed any blood donations yet."
        />
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item._id}
              className="glass-card p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-theme hover:border-slate-300 dark:hover:border-white/20 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2.5">
                  <Badge bloodGroup={item.request?.bloodGroup || 'O+'} />
                  <h3 className="text-base font-bold text-primary font-heading truncate">
                    {item.request?.patientName ? `Donation for ${item.request.patientName}` : 'Emergency Blood Request'}
                  </h3>
                  <Badge status={item.status} />
                </div>
                <div className="text-xs space-y-1.5 text-secondary">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 shrink-0 text-rose-500" />
                    <span className="truncate">{item.request?.address || 'Medical Facility'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0 text-sky-500" />
                    <span className="font-mono text-[11px]">Pledged on: {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="sm:text-right shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200/80 dark:border-white/10 w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end bg-rose-500/5 dark:bg-rose-500/10 px-4 py-2.5 rounded-xl border border-rose-500/15">
                <span className="text-base font-black text-rose-600 dark:text-rose-400 block tracking-tight">
                  {item.unitsDonated} Unit(s)
                </span>
                <span className="text-[11px] text-muted block font-mono mt-0.5">
                  ID: {item._id.slice(-6)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DonationHistoryPage;
