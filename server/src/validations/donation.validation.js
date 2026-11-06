const { z } = require('zod');

const pledgeDonationSchema = z.object({
  requestId: z
    .string({ required_error: 'Request ID is required' })
    .min(1, 'Request ID is required'),
  units: z
    .number({
      required_error: 'Units is required and must be an integer',
      invalid_type_error: 'Units must be an integer',
    })
    .int('Units must be an integer')
    .min(1, 'Units must be at least 1'),
});

module.exports = {
  pledgeDonationSchema,
};

