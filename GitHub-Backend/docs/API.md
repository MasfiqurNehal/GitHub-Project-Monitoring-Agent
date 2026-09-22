# GitHub Project Monitoring Agent — API Documentation

**Base URL:** `http://localhost:5000/api`

---

## 1. Health Endpoints

### `GET /api/health`
* **Description:** Check basic service health.
* **Response:**
```json
{
  "success": true,
  "service": "github-project-monitoring-backend",
  "status": "healthy",
  "timestamp": "2026-09-22T18:20:00.000Z"
}
```

### `GET /api/health/database`
* **Description:** Check Neon PostgreSQL connectivity.
* **Response:**
```json
{
  "success": true,
  "database": "connected",
  "timestamp": "2026-09-22T18:20:00.000Z"
}
```

---

## 2. Executive Dashboard

### `GET /api/dashboard/overview`
* **Description:** Fetch high-level KPIs, activity trend charts, code change volume, and developer contribution summary.
* **Query Params:** `projectId`, `repositoryId`, `developerId`, `from`, `to`
* **Response:**
```json
{
  "success": true,
  "data": {
    "kpi": {
      "totalProjects": 1,
      "totalRepositories": 2,
      "activeDevelopers": 5,
      "totalCommits": 142,
      "totalPRs": 18,
      "mergedPRs": 15,
      "openPRs": 3,
      "issuesOpened": 12,
      "issuesClosed": 10,
      "linesAdded": 4500,
      "linesDeleted": 1200,
      "totalReviews": 22
    },
    "activityTrend": [],
    "codeChangesTrend": [],
    "developerActivity": []
  }
}
```

### `GET /api/dashboard/signals`
* **Description:** Returns engineering alerts (inactive repositories, stale PRs).

---

## 3. Repositories Management

### `POST /api/settings/github/validate-repo`
* **Description:** Validates GitHub repository access and metadata prior to monitoring.
* **Body:**
```json
{
  "url": "https://github.com/MasfiqurNehal/GitHub-Project-Monitoring-Agent"
}
```

### `POST /api/repositories`
* **Description:** Connect a validated repository for monitoring and start initial historical sync.
* **Body:**
```json
{
  "repositoryUrl": "https://github.com/MasfiqurNehal/GitHub-Project-Monitoring-Agent",
  "projectName": "GitHub Monitoring Agent"
}
```

### `POST /api/repositories/:id/sync`
* **Description:** Triggers an immediate historical sync for the specified repository.

---

## 4. Activity Stream

### `GET /api/activity`
* **Description:** Paginated activity stream feed.
* **Query Params:** `repositoryId`, `projectId`, `developerId`, `activityType`, `from`, `to`, `page`, `pageSize`

---

## 5. Webhooks Ingestion

### `POST /api/webhooks/github`
* **Description:** GitHub Event Webhook receiver validating `X-Hub-Signature-256`.
