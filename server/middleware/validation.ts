import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { createChildLogger } from '../lib/logger';

const logger = createChildLogger('validation');

export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({ errors: error.errors }, 'Request validation failed');
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors,
        });
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({ errors: error.errors }, 'Query validation failed');
        return res.status(400).json({
          message: 'Query validation error',
          errors: error.errors,
        });
      }
      next(error);
    }
  };
};

export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn({ errors: error.errors }, 'Params validation failed');
        return res.status(400).json({
          message: 'Parameter validation error',
          errors: error.errors,
        });
      }
      next(error);
    }
  };
};

// Common validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  page_size: z.coerce.number().min(1).max(100).default(10),
});

export const countrySearchSchema = z.object({
  query: z.string().optional(),
  type: z.enum(['independent', 'eor', 'freelancer']).optional(),
  payment: z.enum(['wire', 'ach', 'crypto', 'paypal']).optional(),
  risk: z.enum(['low', 'medium', 'high']).optional(),
  sort: z.enum(['name', 'risk', 'updated']).default('name'),
}).merge(paginationSchema);

export const analyticsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});
