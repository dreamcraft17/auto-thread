import Joi from 'joi';

export const loginSchema = Joi.object({
  username: Joi.string().required().min(1).max(100),
  password: Joi.string().required().min(1),
  timezone: Joi.string().optional().default('UTC'),
});

export const createPostSchema = Joi.object({
  caption: Joi.string().required().min(1).max(500),
  mediaUrls: Joi.array().items(Joi.string().uri()).max(4).optional(),
  scheduledTime: Joi.string().isoDate().required(),
});

export const updatePostSchema = Joi.object({
  caption: Joi.string().min(1).max(500).optional(),
  mediaUrls: Joi.array().items(Joi.string().uri()).max(4).optional(),
  scheduledTime: Joi.string().isoDate().optional(),
}).min(1);

export const preferencesSchema = Joi.object({
  emailOnSuccess: Joi.boolean().optional(),
  emailOnFailure: Joi.boolean().optional(),
  dailySummary: Joi.boolean().optional(),
  dailySummaryTime: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
});

export function validate(schema: Joi.ObjectSchema) {
  return (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
          statusCode: 400,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    req.body = value;
    next();
  };
}
