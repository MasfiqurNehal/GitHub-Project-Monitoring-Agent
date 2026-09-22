import { Request, Response, NextFunction } from 'express';
import { developerRepository } from '../repositories/developer.repository.js';
import { developerService } from '../services/developer.service.js';

export async function listDevelopers(req: Request, res: Response, next: NextFunction) {
  try {
    const developers = await developerRepository.findAll();
    res.json({ success: true, data: developers });
  } catch (err) {
    next(err);
  }
}

export async function getDeveloperDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const detail = await developerService.getDeveloperDetail(id);
    if (!detail) {
      return res.status(404).json({ success: false, error: 'Developer not found' });
    }
    res.json({ success: true, data: detail });
  } catch (err) {
    next(err);
  }
}
