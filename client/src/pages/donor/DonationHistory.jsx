import React, { useState, useEffect } from 'react';
import PageTransition from '../../components/common/PageTransition';
import EmptyState from '../../components/common/EmptyState';
import DonationHistoryCard from '../../components/cards/DonationHistoryCard';
import { Heart, Loader2 } from 'lucide-react';
import { requestApi } from '../../api/requestApi';

const DonationHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await requestApi.getDonationHistory();
        if (res.data?.success) {
          setHistory(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch donation history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <PageTransition className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-primary font-heading">
          Donation History
        </h1>
        <p className="text-xs text-secondary mt-1">
          Review your completed and pledged blood donation contributions.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12 text-info">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No Past Donations Recorded"
          description="You haven't pledged or completed any blood donations yet."
        />
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <DonationHistoryCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </PageTransition>
  );
};

export default DonationHistoryPage;
