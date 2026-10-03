const { z } = require('zod');
const { BLOOD_GROUPS } = require('../utils/bloodCompatibility');

const donorProfileSchema = z.object({
  bloodGroup: z.enum(BLOOD_GROUPS, { errorMap: () => ({ message: 'Please select a valid blood group' }) }).optional(),
  coordinates: z.array(z.number()).length(2, 'Coordinates must be [longitude, latitude]').optional(),
  address: z.string().optional().default(''),
  lastDonationDate: z.union([z.string(), z.date(), z.null()]).optional(),
  isAvailable: z.boolean().optional().default(true),
  age: z.union([
    z.number().min(18, 'Age must be between 18 and 65').max(65, 'Age must be between 18 and 65'),
    z.literal('').transform(() => undefined),
    z.null().transform(() => undefined),
  ]).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  healthFlags: z.array(z.string()).optional(),
  contactNumber: z.string().optional(),
});

module.exports = {
  donorProfileSchema,
};
