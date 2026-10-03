const { z } = require('zod');
const { BLOOD_GROUPS } = require('../utils/bloodCompatibility');

const createRequestSchema = z.object({
  patientName: z.string().min(2, 'Patient name is required'),
  bloodGroup: z.enum(BLOOD_GROUPS, {
    errorMap: () => ({ message: 'Please select a valid blood group' }),
  }),
  unitsNeeded: z.number().min(1, 'Units needed must be at least 1'),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).default('high'),
  address: z.string().min(5, 'Delivery address/hospital location is required'),
  coordinates: z.array(z.number()).length(2).optional().default([77.2090, 28.6139]),
  hospitalId: z.string().optional(),
  requiredByDate: z.string().optional(),
  notes: z.string().optional().default(''),
});

const updateStatusSchema = z.object({
  status: z.enum(['open', 'matching', 'fulfilled', 'cancelled', 'expired']),
});

module.exports = {
  createRequestSchema,
  updateStatusSchema,
};
