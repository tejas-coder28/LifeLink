import React from 'react';
import Badge from '../common/Badge';
import { MapPin, Phone, ShieldCheck, Award } from 'lucide-react';

const DonorCard = ({ donor, searchedBloodGroup, onContact, className = '' }) => {
  if (!donor) return null;

  const name = donor.user?.name || donor.fullName || donor.name || 'Standby Blood Donor';
  const address = donor.address || donor.city || 'Regional Area';
  const isAvailable = donor.isAvailable !== false && donor.availabilityStatus !== 'unavailable';
  const contact = donor.contactNumber || donor.user?.phone || donor.phone;
  const initial = name.charAt(0).toUpperCase();

  let matchBadge = null;
  if (searchedBloodGroup && searchedBloodGroup !== 'ALL') {
    if (donor.bloodGroup === searchedBloodGroup) {
      matchBadge = { label: 'Exact match', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    } else {
      matchBadge = { label: 'Compatible', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
    }
  }

  return (
    <div
      className={`glass-card glass-card-hover flex flex-col justify-between h-full rounded-2xl overflow-hidden border border-theme transition-all duration-200 ${className}`}
    >
      {/* ── 1. HEADER ────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm shrink-0 bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25"
            >
              {initial}
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-extrabold text-primary text-base flex items-center gap-1.5 leading-snug truncate">
                {name}
                {donor.isVerified && (
                  <ShieldCheck className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" title="Verified Donor" />
                )}
              </h3>
              <p className="text-xs mt-0.5 flex items-center gap-1.5 text-muted truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span className="truncate">{address}</span>
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <Badge bloodGroup={donor.bloodGroup} />
            {matchBadge && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${matchBadge.color}`}>
                {matchBadge.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* FULL WIDTH DIVIDER */}
      <div className="w-full border-t border-theme" />

      {/* ── 2. DETAILS ────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 py-4 sm:py-5 flex-1 space-y-2.5 text-xs text-secondary">
        <div className="flex items-center justify-between">
          <span className="text-muted">Standby Status:</span>
          <Badge status={isAvailable ? 'verified' : 'cancelled'} text={isAvailable ? 'AVAILABLE' : 'OFFLINE'} />
        </div>

        {donor.age && (
          <div className="flex items-center justify-between">
            <span className="text-muted">Demographics:</span>
            <span className="font-semibold text-primary">
              {donor.age} yrs {donor.gender ? `• ${donor.gender}` : ''}
            </span>
          </div>
        )}

        {donor.totalDonations !== undefined && donor.totalDonations !== null && (
          <div className="flex items-center justify-between">
            <span className="text-muted">Total Donations:</span>
            <span className="font-extrabold text-primary">{donor.totalDonations} Times</span>
          </div>
        )}

        {contact && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-muted">Contact:</span>
            <a
              href={`tel:${contact}`}
              className="font-bold flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline font-mono"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{contact}</span>
            </a>
          </div>
        )}
      </div>

      {/* ── 3. FOOTER ────────────────────────────────────────────────────── */}
      {(onContact || contact) && (
        <>
          <div className="w-full border-t border-theme" />
          <div className="p-5 sm:p-6 pt-4 sm:pt-5">
            {onContact ? (
              <button
                type="button"
                onClick={() => onContact(donor)}
                className="btn-secondary w-full py-2.5 text-xs rounded-xl justify-center font-bold"
              >
                <Phone className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Contact Donor</span>
              </button>
            ) : (
              <a
                href={`tel:${contact}`}
                className="btn-secondary w-full py-2 text-xs rounded-xl justify-center font-bold flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Call Standby Donor</span>
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DonorCard;
