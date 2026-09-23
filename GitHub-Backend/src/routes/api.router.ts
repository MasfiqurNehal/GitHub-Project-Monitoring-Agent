import { Router } from 'express';
import { checkDatabaseHealth } from '../db/connection.js';
import * as dashboardController from '../controllers/dashboard.controller.js';
import * as projectController from '../controllers/project.controller.js';
import * as repositoryController from '../controllers/repository.controller.js';
import * as developerController from '../controllers/developer.controller.js';
import * as activityController from '../controllers/activity.controller.js';
import * as reportController from '../controllers/report.controller.js';
import * as commitController from '../controllers/commit.controller.js';
import * as pullRequestController from '../controllers/pullRequest.controller.js';
import * as issueController from '../controllers/issue.controller.js';
import * as githubController from '../controllers/github.controller.js';
import * as githubConnectionController from '../controllers/githubConnection.controller.js';
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
apiRouter.get('/dashboard/activity', dashboardController.getDashboardActivity);
apiRouter.get('/dashboard/commits', dashboardController.getDashboardCommits);
apiRouter.get('/dashboard/pull-requests', dashboardController.getDashboardPullRequests);
apiRouter.get('/dashboard/issues', dashboardController.getDashboardIssues);
apiRouter.get('/dashboard/developers', dashboardController.getDashboardDevelopers);
apiRouter.get('/dashboard/repositories', dashboardController.getDashboardRepositories);

// 3. Projects Endpoints
apiRouter.get('/projects', projectController.listProjects);
apiRouter.post('/projects', projectController.createProject);
apiRouter.get('/projects/:id', projectController.getProjectDetail);
apiRouter.patch('/projects/:id', projectController.updateProject);
apiRouter.delete('/projects/:id', projectController.deleteProject);
apiRouter.get('/projects/:id/repositories', projectController.getProjectRepositories);

// 4. Repositories Endpoints
apiRouter.get('/repositories', repositoryController.listRepositories);
apiRouter.post('/repositories', repositoryController.addRepository);
apiRouter.post('/repositories/validate', repositoryController.validateRepositoryUrl);
apiRouter.get('/repositories/:id', repositoryController.getRepositoryDetail);
apiRouter.post('/repositories/:id/sync', repositoryController.triggerRepositorySync);
apiRouter.get('/repositories/:id/sync-status', repositoryController.getSyncStatus);
apiRouter.delete('/repositories/:id', repositoryController.removeRepository);

// 5. Developers Endpoints
apiRouter.get('/developers', developerController.listDevelopers);
apiRouter.get('/developers/:id', developerController.getDeveloperDetail);
apiRouter.get('/developers/:id/activity', developerController.getDeveloperActivity);
apiRouter.get('/developers/:id/commits', commitController.getDeveloperCommits);
apiRouter.get('/developers/:id/pull-requests', developerController.getDeveloperPullRequests);
apiRouter.get('/developers/:id/issues', developerController.getDeveloperIssues);
apiRouter.get('/developers/:id/reviews', developerController.getDeveloperReviews);

// Commits Endpoints
apiRouter.get('/repositories/:id/commits', commitController.getRepositoryCommits);
apiRouter.get('/commits/:id', commitController.getCommitDetail);
apiRouter.get('/commits/:id/changes', commitController.getCommitChanges);

// 6. Engineering Activity Stream
apiRouter.get('/activity', activityController.getActivityStream);

// 7. Pull Requests Endpoints
apiRouter.get('/pull-requests', pullRequestController.listPullRequests);
apiRouter.get('/pull-requests/:id', pullRequestController.getPullRequestDetail);
apiRouter.get('/repositories/:id/pull-requests', pullRequestController.getRepositoryPullRequests);

// 8. Issues Endpoints
apiRouter.get('/issues', issueController.listIssues);
apiRouter.get('/issues/:id', issueController.getIssueDetail);
apiRouter.get('/repositories/:id/issues', issueController.getRepositoryIssues);

// 9. Reports Endpoints
apiRouter.get('/reports', reportController.listReports);
apiRouter.post('/reports/generate', reportController.generateReport);
apiRouter.get('/reports/:id', reportController.getReportDetail);

// 10. GitHub Connection & App Flow Endpoints
apiRouter.get('/github/install', githubConnectionController.getInstallUrl);
apiRouter.get('/github/callback', githubConnectionController.handleInstallationCallback);
apiRouter.get('/github/connection', githubConnectionController.getConnectionStatus);
apiRouter.delete('/github/connection', githubConnectionController.disconnectConnection);

apiRouter.get('/github/repositories', githubConnectionController.listGithubRepositories);
apiRouter.post('/github/repositories/validate', githubConnectionController.validateGithubRepository);

// 11. Settings & GitHub Integration Endpoints
apiRouter.get('/settings/github/status', githubConnectionController.getConnectionStatus);
apiRouter.post('/settings/github/connect', githubConnectionController.getInstallUrl);
apiRouter.post('/settings/github/disconnect', githubConnectionController.disconnectConnection);
apiRouter.get('/settings/github/installations', githubController.listInstallations);
apiRouter.post('/settings/github/installations/sync', githubController.syncInstallations);
apiRouter.get('/settings/github/installations/:installationId', githubController.getInstallationDetail);
apiRouter.post('/settings/github/installations/:installationId/token', githubController.generateInstallationToken);
apiRouter.post('/settings/github/validate-repo', githubConnectionController.validateGithubRepository);
apiRouter.get('/settings/github/monitored-repos', repositoryController.listRepositories);

// 12. GitHub Webhooks Ingestion
apiRouter.post('/webhooks/github', webhookController.handleGitHubWebhook);

// 13. Frontend Telemetry & UI Logging
apiRouter.post('/telemetry/log', telemetryController.logTelemetry);
