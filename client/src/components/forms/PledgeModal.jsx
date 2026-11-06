import React, { useState, useEffect } from 'react';
import GlassModal from '../common/GlassModal';
import Badge from '../common/Badge';
import { MAX_UNITS_PER_DONOR_PER_PLEDGE, formatUnits } from '../../constants/bloodUnits';
import { DONATION_COOLDOWN_DAYS } from '../../utils/bloodCompatibility';
import {
  Heart,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

/**
 * PledgeModal — Confirmation dialog for donor blood donation pledges.
 *
 * Enforces:
 * 1. Shows blood group, patient/hospital, urgency, units still needed (with ml).
 * 2. Displays donor eligibility (eligible now vs next eligible date / cooldown).
 * 3. Units selector: min 1, default 1, max = min(MAX_UNITS_PER_DONOR_PER_PLEDGE, stillNeeded).
 * 4. Required health checkbox: "I am healthy, 18+, 50 kg+, and have not donated in the last 90 days."
 * 5. Confirm button disabled until checked and eligible; loading state on confirm; prevents double-submit.
 * 6. Cancel & Esc close without calling the API.
 */
const PledgeModal = ({
  isOpen,
  onClose,
  request,
  donorProfile,
  onConfirm,
  isSubmitting = false,
  error = null,
}) => {
  const [confirmedHealth, setConfirmedHealth] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState(1);

  // Reset state when modal opens or request changes
  useEffect(() => {
    if (isOpen) {
      setConfirmedHealth(false);
      setSelectedUnits(1);
    }
  }, [isOpen, request?._id]);

  if (!request) return null;

  // Calculate units still needed from donors
  const totalNeeded = Number(request.unitsNeeded || request.unitsRequired || request.units || 1);
  const fromStock = Number(request.unitsFromStock || 0);
  const neededFromDonors = request.unitsFromDonors !== undefined && request.unitsFromDonors !== null && request.unitsFromDonors > 0
    ? Number(request.unitsFromDonors)
    : Math.max(0, totalNeeded - fromStock);
  const fulfilledUnits = Number(request.unitsFulfilled || 0);
  const donorFulfilled = Math.max(0, fulfilledUnits - fromStock);
  const stillNeeded = Math.max(0, neededFromDonors - donorFulfilled);

  const maxUnits = Math.max(1, Math.min(MAX_UNITS_PER_DONOR_PER_PLEDGE, stillNeeded));

  // Determine donor eligibility based on 90-day cooldown and standby availability
  let isEligible = true;
  let eligibilityMessage = 'You are eligible to donate today.';
  let nextEligibleDate = null;
  let daysLeft = 0;

  if (donorProfile?.lastDonationDate) {
    const lastDate = new Date(donorProfile.lastDonationDate);
    const diffMs = Date.now() - lastDate.getTime();
    const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (daysSince < DONATION_COOLDOWN_DAYS) {
      isEligible = false;
      daysLeft = DONATION_COOLDOWN_DAYS - daysSince;
      nextEligibleDate = new Date(lastDate.getTime() + DONATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toLocaleDateString();
      eligibilityMessage = `In 90-day cooldown: ${daysLeft} day(s) remaining. Next eligible date: ${nextEligibleDate}.`;
    }
  }

  if (donorProfile && donorProfile.isAvailable === false) {
    isEligible = false;
    eligibilityMessage = 'Your standby status is currently set to OFFLINE. Toggle status ONLINE to pledge.';
  }

  const patientName = request.patientName || request.recipientName || 'Emergency Patient';
  const targetHosp = request.targetHospital || (request.hospital && typeof request.hospital === 'object' ? request.hospital : null);
  const hospital = request.hospitalName
    || (targetHosp ? targetHosp.name : '')
    || (request.hospital && typeof request.hospital === 'object' ? request.hospital.name : (request.hospital || 'LifeLink Medical Center'));
  const address = request.address || (targetHosp ? targetHosp.address : '') || '';

  const handleConfirmClick = async () => {
    if (!confirmedHealth || !isEligible || isSubmitting) return;
    await onConfirm({
      requestId: request._id || request.id,
      units: selectedUnits,
    });
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Blood Donation Pledge"
      maxWidth="max-w-xl"
    >
      <div className="p-5 sm:p-6 space-y-5 text-secondary text-xs">
        {/* Request Overview Card */}
        <div className="p-4 rounded-2xl bg-surface/90 border border-hairline space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Badge bloodGroup={request.bloodGroup} />
              <div>
                <h4 className="text-sm font-black text-primary font-heading">{patientName}</h4>
                <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{hospital}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge urgency={request.urgency || 'medium'} />
            </div>
          </div>

          {address && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted pt-1 border-t border-hairline">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-surface border border-hairline flex items-center justify-between">
            <span className="font-semibold text-muted text-[11px] uppercase tracking-wider">
              Still needed from donors:
            </span>
            <span className="font-black text-danger text-xs">
              {formatUnits(stillNeeded)}
            </span>
          </div>
        </div>

        {/* Donor Eligibility Card */}
        <div
          className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
            isEligible
              ? 'bg-success/10 border-success/30 text-success dark:text-emerald-400'
              : 'bg-warning/10 border-warning/30 text-warning dark:text-amber-400'
          }`}
        >
          {isEligible ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <div className="font-extrabold text-xs">
              {isEligible ? 'Donor Eligibility' : 'Donation Ineligible / Cooldown'}
            </div>
            <div className="text-[11px] opacity-90 leading-relaxed">
              {eligibilityMessage}
            </div>
          </div>
        </div>

        {/* Units Selection Section */}
        <div className="p-4 rounded-2xl bg-surface border border-hairline space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-primary block">Units to Donate</label>
            <span className="text-[11px] font-mono font-bold text-info">
              {formatUnits(selectedUnits)}
            </span>
          </div>

          {maxUnits === 1 ? (
            <div className="p-2.5 rounded-xl bg-surface/70 border border-hairline space-y-1">
              <div className="font-black text-primary text-xs">{formatUnits(1)}</div>
              <div className="text-[11px] text-muted leading-relaxed">
                One donation = 1 unit (≈ 450 ml). Whole-blood donations are limited to 1 unit per donor per donation for donor safety.
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={maxUnits}
                value={selectedUnits}
                onChange={(e) => setSelectedUnits(Number(e.target.value))}
                className="w-full accent-danger cursor-pointer"
              />
              <span className="text-xs font-bold font-mono px-2 py-1 rounded-lg bg-surface border border-hairline">
                {selectedUnits}
              </span>
            </div>
          )}
        </div>

        {/* Required Confirmation Checkbox */}
        <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface border border-hairline cursor-pointer select-none hover:border-theme transition-colors">
          <input
            type="checkbox"
            checked={confirmedHealth}
            onChange={(e) => setConfirmedHealth(e.target.checked)}
            disabled={!isEligible}
            className="mt-0.5 w-4 h-4 rounded text-danger border-hairline focus:ring-danger cursor-pointer disabled:cursor-not-allowed"
          />
          <span className="text-xs text-primary font-medium leading-relaxed">
            I confirm that I am feeling healthy today, am aged 18-65, weigh at least 50 kg, and have not donated whole blood in the last 90 days.
          </span>
        </label>

        {/* Inline Error Message if any */}
        {error && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-hairline">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary px-4 py-2.5 text-xs rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={!confirmedHealth || !isEligible || isSubmitting}
            className="btn-primary px-5 py-2.5 text-xs rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow-danger cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Pledging...</span>
              </>
            ) : (
              <>
                <Heart className="w-4 h-4 fill-white" />
                <span>Confirm Pledge</span>
              </>
            )}
          </button>
        </div>
      </div>
    </GlassModal>
  );
};

export default PledgeModal;
