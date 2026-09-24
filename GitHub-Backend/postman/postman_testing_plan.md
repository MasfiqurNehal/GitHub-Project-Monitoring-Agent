# Complete Postman API Testing Plan & Documentation

This testing plan provides exhaustive documentation for all 20 endpoint categories of the **GitHub Project Monitoring Agent API**. 

- **Postman Collection JSON**: [`github_monitoring_agent.postman_collection.json`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/GitHub-Backend/postman/github_monitoring_agent.postman_collection.json)
- **Postman Environment JSON**: [`github_monitoring_agent.postman_environment.json`](file:///c:/Nehal%20devs/Nehal-Personal/Project/GitHub-Project-Monitoring-Agent/GitHub-Backend/postman/github_monitoring_agent.postman_environment.json)

---

## Environment Variables Configuration

Import the environment file into Postman and set the variables according to your active deployment or local server:

| Variable Name | Description | Default Value / Example |
|---|---|---|
| `baseUrl` | Base URL of Express backend API | `http://localhost:5001/api` |
| `projectId` | Active Project UUID | `11111111-1111-1111-1111-111111111111` |
| `repositoryId` | Monitored Repository UUID | `22222222-2222-2222-2222-222222222222` |
| `developerId` | Contributor / Developer UUID | `33333333-3333-3333-3333-333333333333` |
| `commitSha` | Git Commit Hash SHA | `a1b2c3d4e5f678901234567890abcdef12345678` |
| `pullRequestId` | Pull Request UUID | `44444444-4444-4444-4444-444444444444` |
| `issueId` | Issue UUID | `55555555-5555-5555-5555-555555555555` |
| `installationId` | GitHub App Installation ID | `12345678` |
| `dateFrom` | Filter Start Date (ISO 8601) | `2026-09-01` |
| `dateTo` | Filter End Date (ISO 8601) | `2026-09-30` |

---

## 1. Health

### 1.1 System Health Check
- **Method**: `GET`
- **URL**: `{{baseUrl}}/health`
- **Headers**: None
- **Query Parameters**: None
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "status": "ok",
  "timestamp": "2026-09-24T00:00:00.000Z",
  "uptime": 124.5
}
```
- **Error Responses**:
  - `500 Internal Server Error`: `{"status": "error", "message": "System check failed"}`

### 1.2 Database Health Check
- **Method**: `GET`
- **URL**: `{{baseUrl}}/health/database`
- **Headers**: None
- **Query Parameters**: None
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "status": "connected",
  "database": "PostgreSQL",
  "pool": { "totalCount": 10, "idleCount": 9, "waitingCount": 0 }
}
```
- **Error Responses**:
  - `500 Internal Server Error`: `{"status": "disconnected", "error": "Connection timed out"}`

---

## 2. GitHub Connection

### 2.1 Get Connection Status
- **Method**: `GET`
- **URL**: `{{baseUrl}}/github/connection`
- **Headers**: None
- **Query Parameters**: None
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "connected": true,
  "installationId": 12345678,
  "account": "MasfiqurNehal",
  "installedAt": "2026-09-20T10:00:00.000Z"
}
```
- **Error Responses**:
  - `200 OK`: `{"connected": false, "message": "GitHub App is not connected"}`

### 2.2 Get GitHub App Installation URL
- **Method**: `GET`
- **URL**: `{{baseUrl}}/github/install`
- **Headers**: None
- **Query Parameters**: None
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "installUrl": "https://github.com/apps/github-monitoring-agent/installations/new"
}
```

---

## 3. GitHub Callback

### 3.1 Handle Installation Callback
- **Method**: `GET`
- **URL**: `{{baseUrl}}/github/callback`
- **Headers**: None
- **Query Parameters**:
  - `installation_id`: `{{installationId}}` (Required)
  - `setup_action`: `install` (Optional)
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "success": true,
  "message": "GitHub App installation verified successfully",
  "installationId": 12345678
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"error": "Missing installation_id parameter"}`

---

## 4. Repository Validation

### 4.1 Validate Repository URL
- **Method**: `POST`
- **URL**: `{{baseUrl}}/repositories/validate`
- **Headers**:
  - `Content-Type`: `application/json`
- **Query Parameters**: None
- **Request Body**:
```json
{
  "url": "https://github.com/MasfiqurNehal/GitHub-Project-Monitoring-Agent"
}
```
- **Expected Response (200 OK)**:
```json
{
  "valid": true,
  "owner": "MasfiqurNehal",
  "name": "GitHub-Project-Monitoring-Agent",
  "full_name": "MasfiqurNehal/GitHub-Project-Monitoring-Agent",
  "is_private": true,
  "default_branch": "main"
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"valid": false, "message": "Invalid GitHub repository URL format"}`
  - `404 Not Found`: `{"valid": false, "message": "Repository not found or access denied"}`

---

## 5. Project Creation

### 5.1 Create Project
- **Method**: `POST`
- **URL**: `{{baseUrl}}/projects`
- **Headers**:
  - `Content-Type`: `application/json`
- **Query Parameters**: None
- **Request Body**:
```json
{
  "name": "Betopia AI Engine",
  "description": "Real-time engineering monitoring intelligence platform."
}
```
- **Expected Response (201 Created)**:
```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "name": "Betopia AI Engine",
  "description": "Real-time engineering monitoring intelligence platform.",
  "created_at": "2026-09-24T00:00:00.000Z"
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"error": "Project name is required"}`

---

## 6. Repository Creation

### 6.1 Add Monitored Repository
- **Method**: `POST`
- **URL**: `{{baseUrl}}/repositories`
- **Headers**:
  - `Content-Type`: `application/json`
- **Query Parameters**: None
- **Request Body**:
```json
{
  "url": "https://github.com/MasfiqurNehal/GitHub-Project-Monitoring-Agent",
  "name": "GitHub-Project-Monitoring-Agent",
  "owner": "MasfiqurNehal",
  "full_name": "MasfiqurNehal/GitHub-Project-Monitoring-Agent",
  "default_branch": "main",
  "is_private": true
}
```
- **Expected Response (201 Created)**:
```json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "name": "GitHub-Project-Monitoring-Agent",
  "full_name": "MasfiqurNehal/GitHub-Project-Monitoring-Agent",
  "sync_status": "pending",
  "created_at": "2026-09-24T00:00:00.000Z"
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"error": "Repository URL is required"}`
  - `409 Conflict`: `{"error": "Repository already exists"}`

---

## 7. Repository Synchronization

### 7.1 Trigger Repository Sync
- **Method**: `POST`
- **URL**: `{{baseUrl}}/repositories/{{repositoryId}}/sync`
- **Headers**: None
- **Query Parameters**: None
- **Request Body**: None
- **Expected Response (200 OK / 202 Accepted)**:
```json
{
  "message": "Repository sync initiated",
  "repositoryId": "22222222-2222-2222-2222-222222222222",
  "status": "in_progress"
}
```
- **Error Responses**:
  - `404 Not Found`: `{"error": "Repository not found"}`

### 7.2 Get Sync Status
- **Method**: `GET`
- **URL**: `{{baseUrl}}/repositories/{{repositoryId}}/sync-status`
- **Headers**: None
- **Query Parameters**: None
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "status": "completed",
  "lastSyncedAt": "2026-09-24T00:00:00.000Z",
  "itemsSynced": { "commits": 142, "pullRequests": 18, "issues": 12 }
}
```

---

## 8. Repository Metadata

### 8.1 List Repositories
- **Method**: `GET`
- **URL**: `{{baseUrl}}/repositories`
- **Headers**: None
- **Query Parameters**:
  - `project_id`: `{{projectId}}` (Optional)
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
[
  {
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "GitHub-Project-Monitoring-Agent",
    "full_name": "MasfiqurNehal/GitHub-Project-Monitoring-Agent",
    "default_branch": "main",
    "sync_status": "completed"
  }
]
```

### 8.2 Get Repository Detail
- **Method**: `GET`
- **URL**: `{{baseUrl}}/repositories/{{repositoryId}}`
- **Headers**: None
- **Query Parameters**: None
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "name": "GitHub-Project-Monitoring-Agent",
  "owner": "MasfiqurNehal",
  "full_name": "MasfiqurNehal/GitHub-Project-Monitoring-Agent",
  "url": "https://github.com/MasfiqurNehal/GitHub-Project-Monitoring-Agent",
  "default_branch": "main",
  "is_private": true,
  "stats": { "commits": 142, "pullRequests": 18, "issues": 12, "developers": 5 }
}
```

---

## 9. Developers

### 9.1 List Developers
- **Method**: `GET`
- **URL**: `{{baseUrl}}/developers`
- **Headers**: None
- **Query Parameters**:
  - `project_id`: `{{projectId}}` (Optional)
  - `repository_id`: `{{repositoryId}}` (Optional)
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
[
  {
    "id": "33333333-3333-3333-3333-333333333333",
    "github_username": "MasfiqurNehal",
    "name": "Masfiqur Nehal",
    "avatar_url": "https://avatars.githubusercontent.com/u/12345",
    "commits_count": 84
  }
]
```

### 9.2 Get Developer Detail
- **Method**: `GET`
- **URL**: `{{baseUrl}}/developers/{{developerId}}`
- **Headers**: None
- **Query Parameters**: None
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "id": "33333333-3333-3333-3333-333333333333",
  "github_username": "MasfiqurNehal",
  "name": "Masfiqur Nehal",
  "avatar_url": "https://avatars.githubusercontent.com/u/12345",
  "metrics": {
    "commits": 84,
    "additions": 4500,
    "deletions": 1200,
    "pullRequests": 12,
    "reviews": 15
  }
}
```

---

## 10. Commits

### 10.1 Get Repository Commits
- **Method**: `GET`
- **URL**: `{{baseUrl}}/repositories/{{repositoryId}}/commits`
- **Headers**: None
- **Query Parameters**:
  - `developer_id`: `{{developerId}}` (Optional)
  - `date_from`: `{{dateFrom}}` (Optional)
  - `date_to`: `{{dateTo}}` (Optional)
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
[
  {
    "sha": "a1b2c3d4e5f678901234567890abcdef12345678",
    "message": "feat: implement unified activity stream API",
    "author_name": "Masfiqur Nehal",
    "authored_date": "2026-09-23T18:00:00Z",
    "additions": 145,
    "deletions": 20
  }
]
```

### 10.2 Get Commit Detail
- **Method**: `GET`
- **URL**: `{{baseUrl}}/commits/{{commitSha}}`
- **Headers**: None
- **Query Parameters**: None
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "sha": "a1b2c3d4e5f678901234567890abcdef12345678",
  "message": "feat: implement unified activity stream API",
  "author": { "name": "Masfiqur Nehal", "username": "MasfiqurNehal" },
  "authored_date": "2026-09-23T18:00:00Z",
  "stats": { "additions": 145, "deletions": 20, "files_changed": 3 }
}
```

---

## 11. Commit Changes

### 11.1 Get Commit File Changes
- **Method**: `GET`
- **URL**: `{{baseUrl}}/commits/{{commitSha}}/changes`
- **Headers**: None
- **Query Parameters**: None
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
[
  {
    "filename": "src/controllers/activity.controller.ts",
    "status": "modified",
    "additions": 80,
    "deletions": 10,
    "patch": "@@ -1,5 +1,10 @@ ..."
  }
]
```

---

## 12. Pull Requests

### 12.1 List Pull Requests
- **Method**: `GET`
- **URL**: `{{baseUrl}}/pull-requests`
- **Headers**: None
- **Query Parameters**:
  - `repository_id`: `{{repositoryId}}` (Optional)
  - `state`: `open | closed | merged` (Optional)
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
[
  {
    "id": "44444444-4444-4444-4444-444444444444",
    "number": 14,
    "title": "Unify activity timeline stream",
    "state": "merged",
    "author_username": "MasfiqurNehal",
    "created_at": "2026-09-22T10:00:00Z",
    "merged_at": "2026-09-23T11:00:00Z"
  }
]
```

### 12.2 Get Pull Request Detail
- **Method**: `GET`
- **URL**: `{{baseUrl}}/pull-requests/{{pullRequestId}}`
- **Headers**: None
- **Query Parameters**: None
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "id": "44444444-4444-4444-4444-444444444444",
  "number": 14,
  "title": "Unify activity timeline stream",
  "body": "Merges commits, PRs, reviews, and issues into single feed",
  "state": "merged",
  "additions": 320,
  "deletions": 45,
  "changed_files": 5
}
```

---

## 13. PR Reviews

### 13.1 Get Developer Reviews
- **Method**: `GET`
- **URL**: `{{baseUrl}}/developers/{{developerId}}/reviews`
- **Headers**: None
- **Query Parameters**: None
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
[
  {
    "id": "rev-12345",
    "pull_request_number": 14,
    "state": "APPROVED",
    "submitted_at": "2026-09-23T10:30:00Z"
  }
]
```

---

## 14. Issues

### 14.1 List Issues
- **Method**: `GET`
- **URL**: `{{baseUrl}}/issues`
- **Headers**: None
- **Query Parameters**:
  - `repository_id`: `{{repositoryId}}` (Optional)
  - `state`: `open | closed` (Optional)
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
[
  {
    "id": "55555555-5555-5555-5555-555555555555",
    "number": 8,
    "title": "Fix date range filter bug in daily analytics",
    "state": "open",
    "author_username": "MasfiqurNehal",
    "created_at": "2026-09-23T14:00:00Z"
  }
]
```

### 14.2 Get Issue Detail
- **Method**: `GET`
- **URL**: `{{baseUrl}}/issues/{{issueId}}`
- **Headers**: None
- **Query Parameters**: None
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "id": "55555555-5555-5555-5555-555555555555",
  "number": 8,
  "title": "Fix date range filter bug in daily analytics",
  "body": "Preset selector does not correctly populate ISO date string",
  "state": "open",
  "comments_count": 3
}
```

---

## 15. Activity

### 15.1 Get Unified Activity Stream
- **Method**: `GET`
- **URL**: `{{baseUrl}}/activity`
- **Headers**: None
- **Query Parameters**:
  - `project`: `{{projectId}}` (Optional)
  - `repository`: `{{repositoryId}}` (Optional)
  - `developer`: `{{developerId}}` (Optional)
  - `activity_type`: `commit | push | pr_opened | pr_merged | review | issue_opened | issue_closed` (Optional)
  - `date_from`: `{{dateFrom}}` (Optional)
  - `date_to`: `{{dateTo}}` (Optional)
  - `page`: `1` (Optional)
  - `limit`: `20` (Optional)
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "data": [
    {
      "type": "commit",
      "developer": { "id": "33333333-3333-3333-3333-333333333333", "username": "MasfiqurNehal" },
      "repository": { "id": "22222222-2222-2222-2222-222222222222", "name": "GitHub-Project-Monitoring-Agent" },
      "timestamp": "2026-09-23T18:00:00Z",
      "title": "feat: implement unified activity stream API",
      "url": "https://github.com/MasfiqurNehal/GitHub-Project-Monitoring-Agent/commit/a1b2c3d4"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 142, "totalPages": 8 }
}
```

---

## 16. Dashboard

### 16.1 Get Dashboard Overview
- **Method**: `GET`
- **URL**: `{{baseUrl}}/dashboard/overview`
- **Headers**: None
- **Query Parameters**:
  - `project_id`: `{{projectId}}` (Optional)
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "stats": {
    "totalRepositories": 1,
    "totalDevelopers": 5,
    "totalCommits": 142,
    "openPullRequests": 3,
    "openIssues": 2
  },
  "recentActivity": [],
  "healthStatus": "healthy"
}
```

---

## 17. Daily Analytics

### 17.1 Get Daily Activity Analytics
- **Method**: `GET`
- **URL**: `{{baseUrl}}/analytics/daily`
- **Headers**: None
- **Query Parameters**:
  - `preset`: `today | yesterday | this_week | last_week | this_month` (Optional)
  - `date_from`: `{{dateFrom}}` (Optional)
  - `date_to`: `{{dateTo}}` (Optional)
  - `repository`: `{{repositoryId}}` (Optional)
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
[
  {
    "date": "2026-09-23",
    "commits": 23,
    "pullRequests": 5,
    "reviews": 8,
    "issues": 3,
    "additions": 1200,
    "deletions": 450
  }
]
```

---

## 18. Developer Analytics

### 18.1 Get Factual Developer Analytics
- **Method**: `GET`
- **URL**: `{{baseUrl}}/analytics/developers/{{developerId}}`
- **Headers**: None
- **Query Parameters**:
  - `date_from`: `{{dateFrom}}` (Optional)
  - `date_to`: `{{dateTo}}` (Optional)
  - `repository`: `{{repositoryId}}` (Optional)
- **Request Body**: None
- **Expected Response (200 OK)**:
```json
{
  "developer": { "id": "33333333-3333-3333-3333-333333333333", "username": "MasfiqurNehal" },
  "factualMetrics": {
    "commits": 84,
    "additions": 4500,
    "deletions": 1200,
    "changedFiles": 48,
    "pullRequests": 12,
    "mergedPRs": 10,
    "reviews": 15,
    "issues": 4
  }
}
```

---

## 19. Reports

### 19.1 Get Daily Report
- **Method**: `GET`
- **URL**: `{{baseUrl}}/reports/daily`
- **Expected Response (200 OK)**: Detailed JSON daily engineering metrics report.

### 19.2 Get Weekly Report
- **Method**: `GET`
- **URL**: `{{baseUrl}}/reports/weekly`
- **Expected Response (200 OK)**: Aggregate weekly velocity and throughput data.

### 19.3 Get Monthly Report
- **Method**: `GET`
- **URL**: `{{baseUrl}}/reports/monthly`
- **Expected Response (200 OK)**: Comprehensive monthly repository trends.

### 19.4 Get Project Report
- **Method**: `GET`
- **URL**: `{{baseUrl}}/reports/project/{{projectId}}`
- **Expected Response (200 OK)**: Project-level aggregated data.

### 19.5 Get Repository Report
- **Method**: `GET`
- **URL**: `{{baseUrl}}/reports/repository/{{repositoryId}}`
- **Expected Response (200 OK)**: Repository-level analytics snapshot.

### 19.6 Get Developer Report
- **Method**: `GET`
- **URL**: `{{baseUrl}}/reports/developer/{{developerId}}`
- **Expected Response (200 OK)**: Individual developer output data snapshot.

---

## 20. Webhooks

### 20.1 Ingest GitHub Webhook Event
- **Method**: `POST`
- **URL**: `{{baseUrl}}/webhooks/github`
- **Headers**:
  - `Content-Type`: `application/json`
  - `X-GitHub-Event`: `push` (or `pull_request`, `issues`, etc.)
  - `X-GitHub-Delivery`: `722970e0-8b40-11ec-872f-51828f72365a`
- **Query Parameters**: None
- **Request Body**:
```json
{
  "ref": "refs/heads/main",
  "repository": {
    "id": 101,
    "name": "GitHub-Project-Monitoring-Agent",
    "full_name": "MasfiqurNehal/GitHub-Project-Monitoring-Agent"
  },
  "pusher": { "name": "MasfiqurNehal" },
  "commits": [
    {
      "id": "c3d4e5f678901234567890abcdef12345678a9b0",
      "message": "feat: push webhook event delivery",
      "timestamp": "2026-09-23T18:00:00Z"
    }
  ]
}
```
- **Expected Response (200 OK)**:
```json
{
  "received": true,
  "event": "push",
  "processed": true
}
```
- **Error Responses**:
  - `400 Bad Request`: `{"error": "Missing X-GitHub-Event header"}`
  - `500 Server Error`: `{"error": "Webhook processing failed"}`
