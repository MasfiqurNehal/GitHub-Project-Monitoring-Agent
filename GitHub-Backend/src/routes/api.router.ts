import { Router } from 'express';
import { checkDatabaseHealth } from '../db/connection.js';
import * as dashboardController from '../controllers/dashboard.controller.js';
import * as projectController from '../controllers/project.controller.js';
import * as repositoryController from '../controllers/repository.controller.js';
import * as developerController from '../controllers/developer.controller.js';
import * as activityController from '../controllers/activity.controller.js';
import * as reportController from '../controllers/report.controller.js';
import * as pullRequestController from '../controllers/pullRequest.controller.js';
import * as issueController from '../controllers/issue.controller.js';
import * as githubController from '../controllers/github.controller.js';
import * as webhookController from '../controllers/webhook.controller.js';
import * as telemetryController from '../controllers/telemetry.controller.js';

export const apiRouter = Router();

// 1. Health Checks
apiRouter.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  if (dbHealth.isHealthy) {
    res.json({
      success: true,
      message: 'Backend is running',
      database: 'connected',
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Backend is running with database issues',
      database: 'disconnected',
      error: dbHealth.error,
    });
  }
});

apiRouter.get('/health/database', async (req, res) => {
  const health = await checkDatabaseHealth();
  if (health.isHealthy) {
    res.json({ success: true, database: 'connected', timestamp: health.timestamp });
  } else {
    res.status(500).json({ success: false, database: 'disconnected', error: health.error });
  }
});

// 2. Dashboard Endpoints
apiRouter.get('/dashboard/overview', dashboardController.getDashboardOverview);
apiRouter.get('/dashboard/signals', dashboardController.getEngineeringSignals);

// 3. Projects Endpoints
apiRouter.get('/projects', projectController.listProjects);
apiRouter.post('/projects', projectController.createProject);
apiRouter.get('/projects/:id', projectController.getProjectDetail);

// 4. Repositories Endpoints
apiRouter.get('/repositories', repositoryController.listRepositories);
apiRouter.post('/repositories', repositoryController.addRepository);
apiRouter.get('/repositories/:id', repositoryController.getRepositoryDetail);
apiRouter.post('/repositories/:id/sync', repositoryController.triggerRepositorySync);
apiRouter.delete('/repositories/:id', repositoryController.removeRepository);

// 5. Developers Endpoints
apiRouter.get('/developers', developerController.listDevelopers);
apiRouter.get('/developers/:id', developerController.getDeveloperDetail);

// 6. Engineering Activity Stream
apiRouter.get('/activity', activityController.getActivityStream);

// 7. Pull Requests Endpoints
apiRouter.get('/pull-requests', pullRequestController.listPullRequests);
apiRouter.get('/pull-requests/:id', pullRequestController.getPullRequestDetail);

// 8. Issues Endpoints
apiRouter.get('/issues', issueController.listIssues);
apiRouter.get('/issues/:id', issueController.getIssueDetail);

// 9. Reports Endpoints
apiRouter.get('/reports', reportController.listReports);
apiRouter.post('/reports/generate', reportController.generateReport);
apiRouter.get('/reports/:id', reportController.getReportDetail);

// 10. Settings & GitHub Integration Endpoints
apiRouter.get('/settings/github/status', githubController.getGitHubStatus);
apiRouter.post('/settings/github/validate-repo', githubController.validateRepository);
apiRouter.get('/settings/github/monitored-repos', repositoryController.listRepositories);

// 11. GitHub Webhooks Ingestion
apiRouter.post('/webhooks/github', webhookController.handleGitHubWebhook);

// 12. Frontend Telemetry & UI Logging
apiRouter.post('/telemetry/log', telemetryController.logTelemetry);
