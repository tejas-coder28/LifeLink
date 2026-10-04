const { z } = require('zod');
const { BLOOD_GROUPS } = require('../utils/bloodCompatibility');

const createRequestSchema = z.object({
  patientName: z.string().min(2, 'Patient name is required'),
  bloodGroup: z.enum(BLOOD_GROUPS, {
    errorMap: () => ({ message: 'Please select a valid blood group' }),
  }),
  unitsNeeded: z.number().min(1, 'Units needed must be at least 1'),
  urgency: z.enum(['low', 'medium', 'high', 'urgent', 'critical']).default('high'),
  address: z.string().optional().default('Hospital Medical Center'),
  coordinates: z.array(z.number()).length(2).optional().default([77.2090, 28.6139]),
  targetHospital: z.string().optional(),
  hospitalId: z.string().optional(),
  requiredByDate: z.string().optional(),
  notes: z.string().optional().default(''),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'pending_hospital_review',
    'open',
    'matching',
    'partially_fulfilled',
    'fulfilled',
    'rejected',
    'hospital_no_response',
    'cancelled',
    'expired',
    'legacy',
  ]),
});

const rejectRequestSchema = z.object({
  reason: z.string().min(3, 'Rejection reason is required and must be at least 3 characters'),
});

const issueCompatibleSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS, {
    errorMap: () => ({ message: 'Please select a valid compatible blood group' }),
  }),
  units: z.number().min(1, 'Units must be at least 1').default(1),
});

const issuePatientSchema = z.object({
  units: z.number().min(1, 'Units must be at least 1').default(1).optional(),
});

module.exports = {
  createRequestSchema,
  updateStatusSchema,
  rejectRequestSchema,
  issueCompatibleSchema,
  issuePatientSchema,
};

