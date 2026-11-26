import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { formatUnits } from '../../constants/bloodUnits';
import { formatDate, formatDateTime } from '../../utils/dateFormatter';
import {
  MAX_DONATION_BACKDATE_DAYS,
  computeNextEligibleDate,
  toLocalDateTimeInputValue,
  validateDonatedAt,
} from '../../utils/eligibility';
import { Calendar, CheckCircle2, AlertTriangle, Clock, Loader2 } from 'lucide-react';

/**
 * ConfirmDonationModal — Hospital/Admin confirmation dialog requiring actual collection date/time (donatedAt).
 * Validates donatedAt against pledgedAt, current time, and backdate limit (7 days unless admin).
 * Previews donor's new cooldown end date ("Cooldown ends <date>").
 */
const ConfirmDonationModal = ({
  isOpen,
  onClose,
  pledge,
  request,
  isAdmin = false,
  onConfirm,
  submitting = false,
  serverError = null,
}) => {
  const [donationDateInput, setDonationDateInput] = useState('');
  const [hasEditedDate, setHasEditedDate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDonationDateInput(toLocalDateTimeInputValue(new Date()));
      setHasEditedDate(false);
    }
  }, [isOpen, pledge?._id]);

  if (!pledge) return null;

  const donorName = pledge.donor?.name || pledge.donorName || 'Anonymous Donor';
  const bloodGroup =
    pledge.donorProfile?.bloodGroup ||
    pledge.donor?.bloodGroup ||
    request?.bloodGroup ||
    'O+';
  const units = Number(pledge.unitsDonated || pledge.units || 1);
  const pledgedAt = pledge.pledgedAt || pledge.createdAt || null;

  const now = new Date();
  const validation = hasEditedDate
    ? validateDonatedAt({
        donatedAt: donationDateInput,
        pledgedAt,
        confirmationDate: now,
        isAdmin,
      })
    : {
        valid: true,
        statusCode: 200,
        error: null,
        donatedAtDate: now,
      };

  const previewDonatedAt = validation.donatedAtDate || now;
  const nextEligibleDate = computeNextEligibleDate(previewDonatedAt);
  const activeError = validation.error || serverError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const submitNow = new Date();
    const donatedAtPayload = hasEditedDate
      ? (() => {
          const check = validateDonatedAt({
            donatedAt: donationDateInput,
            pledgedAt,
            confirmationDate: submitNow,
            isAdmin,
          });
          return check.valid ? check.donatedAtDate.toISOString() : null;
        })()
      : submitNow.toISOString();

    if (!donatedAtPayload) return;

    await onConfirm({
      donationId: pledge._id || pledge.id,
      requestId: request?._id || request?.id || (pledge.request?._id || pledge.request),
      donatedAt: donatedAtPayload,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !submitting && onClose()}
      title="Confirm Donation"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs text-secondary">
        {/* Pledge Overview */}
        <div className="p-4 rounded-2xl bg-surface border border-hairline space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <Badge bloodGroup={bloodGroup} />
              <div>
                <h4 className="text-sm font-black text-primary font-heading">{donorName}</h4>
                <span className="text-[11px] text-muted block">
                  {formatUnits(units)}
                  {request?.patientName ? ` • For ${request.patientName}` : ''}
                </span>
              </div>
            </div>
            <Badge status={pledge.status || 'pledged'} />
          </div>
          {pledgedAt && (
            <div className="pt-2 border-t border-hairline flex items-center gap-1.5 text-[11px] text-muted font-mono">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Pledged on: {formatDateTime(pledgedAt)}</span>
            </div>
          )}
        </div>

        {/* Donation Date Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirm-donation-date"
            className="block text-xs font-bold text-primary"
          >
            Donation date <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-muted absolute left-3.5 top-3 pointer-events-none" />
            <input
              id="confirm-donation-date"
              name="donationDate"
              type="datetime-local"
              required
              value={donationDateInput}
              max={toLocalDateTimeInputValue(new Date())}
              onChange={(e) => {
                setHasEditedDate(true);
                setDonationDateInput(e.target.value);
              }}
              className="glass-input w-full pl-10 pr-3.5 py-2.5 text-sm font-mono text-primary"
            />
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            Record the actual date &amp; time blood was collected. Must not be in the future, before the pledge date,
            {isAdmin
              ? ' and can be backdated as an administrator.'
              : ` or more than ${MAX_DONATION_BACKDATE_DAYS} days before confirmation (unless confirmed by an admin).`}
          </p>
        </div>

        {/* Validation Error */}
        {activeError && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-danger font-semibold flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{activeError}</span>
          </div>
        )}

        {/* Next Eligible Date Preview */}
        {validation.valid && nextEligibleDate && (
          <div className="p-3.5 rounded-xl bg-info/10 border border-info/25 text-info flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <div className="font-semibold">
              Cooldown ends {formatDate(nextEligibleDate)}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!validation.valid || submitting}
            className="btn-success px-5 py-2 text-xs font-extrabold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Confirming...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Donation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ConfirmDonationModal;
