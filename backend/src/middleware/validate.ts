import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ApiError } from '../utils/ApiError';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map((err) => {
      if (err.type === 'field') {
        return { field: err.path, message: err.msg };
      }
      return { message: err.msg };
    });

    next(new ApiError(422, 'Validation failed', true));
  };
};

export const handleValidationErrors = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors
      .array()
      .map((err) => {
        if (err.type === 'field') {
          return `${err.path}: ${err.msg}`;
        }
        return err.msg;
      })
      .join(', ');
    throw ApiError.badRequest(messages);
  }
  next();
};
