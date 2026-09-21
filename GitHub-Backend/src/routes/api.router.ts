import crypto from 'crypto';
import { Router } from 'express';
import { analyticsService } from '../analytics/analytics.service.js';
import { config } from '../config/index.js';
import { prisma } from '../db/prisma.js';
import { orchestratorService } from '../agents/orchestrator/orchestrator.service.js';
import { syncRepositoryHistoricalData } from '../workers/sync-worker.js';

export const apiRouter = Router();

// Health Check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'github-monitoring-backend',
    timestamp: new Date().toISOString(),
  });
});

// Dashboard Overview Metrics
apiRouter.get('/dashboard/overview', async (req, res, next) => {
  try {
    const { projectId, repositoryId, developerId, from, to } = req.query;
    const filters = {
      projectId: projectId as string,
      repositoryId: repositoryId as string,
      developerId: developerId as string,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
    };
    const data = await analyticsService.getDashboardOverview(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Engineering Signals & Alerts
apiRouter.get('/dashboard/signals', async (req, res, next) => {
  try {
    const data = await analyticsService.getEngineeringSignals();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// List Projects
apiRouter.get('/projects', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        repositories: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
});

// Create Project
apiRouter.post('/projects', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Project name is required' });
    }
    const project = await prisma.project.create({
      data: { name, description },
    });
    res.json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
});

// Connect Repository to Project
apiRouter.post('/projects/:id/repositories', async (req, res, next) => {
  try {
    const { id: projectId } = req.params;
    const { owner, name } = req.body;

    if (!owner || !name) {
      return res.status(400).json({ success: false, error: 'Repository owner and name are required' });
    }

    const fullName = `${owner}/${name}`;
    let repository = await prisma.repository.findUnique({ where: { fullName } });

    if (!repository) {
      repository = await prisma.repository.create({
        data: {
          projectId,
          githubId: BigInt(Date.now()), // Temporary placeholder until sync updates with exact GitHub ID
          owner,
          name,
          fullName,
          url: `https://github.com/${owner}/${name}`,
        },
      });
    } else {
      repository = await prisma.repository.update({
        where: { id: repository.id },
        data: { projectId },
      });
    }

    // Trigger async sync in background
    syncRepositoryHistoricalData(repository.id, owner, name).catch((err) => {
      console.error(`Async sync error for ${fullName}:`, err.message);
    });

    res.json({ success: true, data: repository });
  } catch (err) {
    next(err);
  }
});

// Trigger Manual Sync for Repository
apiRouter.post('/repositories/:id/sync', async (req, res, next) => {
  try {
    const { id } = req.params;
    const repo = await prisma.repository.findUnique({ where: { id } });
    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    // Run sync asynchronously
    syncRepositoryHistoricalData(repo.id, repo.owner, repo.name).catch((err) => {
      console.error(`Manual sync error for ${repo.fullName}:`, err.message);
    });

    res.json({ success: true, message: `Sync initiated for ${repo.fullName}` });
  } catch (err) {
    next(err);
  }
});

// List Developers
apiRouter.get('/developers', async (req, res, next) => {
  try {
    const developers = await prisma.developer.findMany({
      include: {
        _count: {
          select: { commits: true, pullRequests: true, reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: developers });
  } catch (err) {
    next(err);
  }
});

// Get Developer Detail Breakdown
apiRouter.get('/developers/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await analyticsService.getDeveloperMetrics(id);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Developer not found' });
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// AI Chatbot Endpoint
apiRouter.post('/ai/chat', async (req, res, next) => {
  try {
    const { conversationId, message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    const convId = conversationId || `conv-${Date.now()}`;
    const result = await orchestratorService.processUserMessage(convId, message);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Webhook Receiver (GitHub Events)
apiRouter.post('/webhooks/github', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;

  if (config.githubWebhookSecret && signature) {
    const hmac = crypto.createHmac('sha256', config.githubWebhookSecret);
    const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
    if (signature !== digest) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
    }
  }

  console.log(`[Webhook] Received GitHub Event: ${event}`);
  res.status(200).json({ success: true, received: true });
});
