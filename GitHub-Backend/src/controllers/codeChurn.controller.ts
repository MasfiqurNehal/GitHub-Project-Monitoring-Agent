import { Request, Response, NextFunction } from 'express';
import { codeChurnService, CodeChurnFilters } from '../services/codeChurn.service.js';

export async function getCodeChurnAnalysis(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      project,
      projectId,
      repository,
      repositoryId,
      developer,
      developerId,
      date_from,
      dateFrom,
      date_to,
      dateTo,
      file,
      limit,
    } = req.query;

    const orgId = (req as any).organizationId;

    const filters: CodeChurnFilters = {
      organizationId: orgId,
      projectId: (projectId || project) as string,
      repositoryId: (repositoryId || repository) as string,
      developerId: (developerId || developer) as string,
      dateFrom: (dateFrom || date_from) as string,
      dateTo: (dateTo || date_to) as string,
      file: file as string,
      limit: limit ? Number(limit) : 50,
    };

    const analysis = await codeChurnService.analyzeCodeChurn(filters);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (err) {
    next(err);
  }
}
