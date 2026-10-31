import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';

export const createTicket = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { subject, description, priority } = req.body;

    if (!subject || !description) {
      throw ApiError.badRequest('Subject and description are required');
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.userId!,
        subject: subject.trim(),
        description: description.trim(),
        priority: priority || 'MEDIUM',
        status: 'OPEN',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export const getTickets = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

