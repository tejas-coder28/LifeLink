const { z } = require('zod');
const { BLOOD_GROUPS } = require('../utils/bloodCompatibility');

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  // Only 'user' and 'hospital' allowed via public registration.
  // 'admin' accounts are created by the seed script only — never via the API.
  accountType: z.enum(['user', 'hospital'], {
    errorMap: () => ({ message: "Account type must be 'user' or 'hospital'" }),
  }).optional().default('user'),
  role: z.enum(['donor', 'recipient', 'hospital', 'user']).optional(),
  phone: z.string().optional().default(''),
  bloodGroup: z.enum(BLOOD_GROUPS, {
    errorMap: () => ({ message: 'Please select a valid blood group' }),
  }).optional(),
}).superRefine((data, ctx) => {
  const accountType = data.accountType || (data.role === 'hospital' ? 'hospital' : 'user');
  if (accountType === 'user' && !data.bloodGroup) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Blood group is required for donor accounts',
      path: ['bloodGroup'],
    });
  }
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
};
