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
    'closed',
    'expired',
    'legacy',
  ]),
});

const editRequestSchema = z.object({
  patientName: z.string().min(2, 'Patient name must be at least 2 characters').optional(),
  unitsNeeded: z.number().min(1, 'Units needed must be at least 1').optional(),
  unitsRequired: z.number().min(1, 'Units required must be at least 1').optional(),
  urgency: z.enum(['low', 'medium', 'high', 'urgent', 'critical']).optional(),
  requiredByDate: z.string().optional(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  hospital: z.string().optional(),
  targetHospital: z.string().optional(),
  hospitalId: z.string().optional(),
});

const cancelRequestSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required'),
  note: z.string().max(200, 'Note cannot exceed 200 characters').optional().default(''),
});

const closeRequestSchema = z.object({
  note: z.string().max(200, 'Note cannot exceed 200 characters').optional().default(''),
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
  editRequestSchema,
  cancelRequestSchema,
  closeRequestSchema,
  rejectRequestSchema,
  issueCompatibleSchema,
  issuePatientSchema,
};

