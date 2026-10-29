// Comprehensive Postman Collection Generator for GitMonitor Backend & AI Services
import fs from 'fs';
import path from 'path';

const postmanDir = path.resolve('postman');
if (!fs.existsSync(postmanDir)) {
  fs.mkdirSync(postmanDir, { recursive: true });
}

function createUrl(pathStr, queryParams = []) {
  const parts = pathStr.split('?');
  const pathPart = parts[0];
  const urlPath = pathPart.replace(/^\//, '').split('/').map(seg => {
    if (seg.startsWith(':')) {
      return `{{${seg.slice(1)}}}`;
    }
    return seg;
  });

  const query = queryParams.map(q => ({
    key: q.key,
    value: q.value,
    description: q.description || '',
    disabled: q.disabled || false
  }));

  const rawUrl = `{{base_url}}/${pathPart.replace(/^\//, '')}` + (query.length > 0 ? '?' + query.map(q => `${q.key}=${q.value}`).join('&') : '');

  return {
    raw: rawUrl,
    host: ["{{base_url}}"],
    path: urlPath,
    query: query.length > 0 ? query : undefined
  };
}

function createAiUrl(pathStr, queryParams = []) {
  const parts = pathStr.split('?');
  const pathPart = parts[0];
  const urlPath = pathPart.replace(/^\//, '').split('/').map(seg => {
    if (seg.startsWith(':')) {
      return `{{${seg.slice(1)}}}`;
    }
    return seg;
  });

  const query = queryParams.map(q => ({
    key: q.key,
    value: q.value,
    description: q.description || '',
    disabled: q.disabled || false
  }));

  const rawUrl = `{{ai_service_url}}/${pathPart.replace(/^\//, '')}` + (query.length > 0 ? '?' + query.map(q => `${q.key}=${q.value}`).join('&') : '');

  return {
    raw: rawUrl,
    host: ["{{ai_service_url}}"],
    path: urlPath,
    query: query.length > 0 ? query : undefined
  };
}

function authBearer() {
  return {
    type: "bearer",
    bearer: [
      {
        key: "token",
        value: "{{auth_token}}",
        type: "string"
      }
    ]
  };
}

function jsonHeaders() {
  return [
    {
      key: "Content-Type",
      value: "application/json",
      type: "text"
    },
    {
      key: "Accept",
      value: "application/json",
      type: "text"
    }
  ];
}

function createTestScript(tests) {
  const lines = [
    "pm.test(\"Status code is successful\", function () {",
    `    pm.expect(pm.response.code).to.be.oneOf([${tests.statusCodes ? tests.statusCodes.join(', ') : '200, 201, 204'}]);`,
    "});",
    "",
    "pm.test(\"Response time is within acceptable SLA (< 3000ms)\", function () {",
    "    pm.expect(pm.response.responseTime).to.be.below(3000);",
    "});"
  ];

  if (tests.custom) {
    lines.push("");
    lines.push(tests.custom);
  }

  return [
    {
      listen: "test",
      script: {
        exec: lines,
        type: "text/javascript"
      }
    }
  ];
}

const collection = {
  info: {
    _postman_id: "gitmonitor-collection-v2-complete",
    name: "GitMonitor - Complete Backend & AI API Collection",
    description: "# GitMonitor Complete API Collection\n\nProduction-grade Postman collection for the **GitHub Project Monitoring Agent** backend ecosystem.\n\n### Tech Stack\n- **Backend**: Node.js, Express.js, TypeScript\n- **Database**: Neon Serverless PostgreSQL\n- **GitHub App**: GitHub REST & Octokit Webhooks\n- **AI Microservice**: Python FastAPI, LangChain, Google Gemini / OpenAI\n\n### Authentication Flow\n1. Run `01 Authentication & Users -> Login (Betopia Admin)`.\n2. The post-response test script automatically extracts `accessToken` and updates the `{{auth_token}}` variable.\n3. All protected endpoints automatically inherit `Bearer {{auth_token}}`.",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  variable: [
    { key: "base_url", value: "http://localhost:5001", type: "string" },
    { key: "ai_service_url", value: "http://localhost:8000", type: "string" },
    { key: "auth_token", value: "", type: "string" },
    { key: "refresh_token", value: "", type: "string" },
    { key: "organization_id", value: "org-betopia-1", type: "string" },
    { key: "project_id", value: "prj-1793187516595-a717c0", type: "string" },
    { key: "repository_id", value: "repo-1373577934", type: "string" },
    { key: "developer_id", value: "dev-155254110", type: "string" },
    { key: "commit_id", value: "cmt-e3803b6c9d423aea62f26f30dbbd6eb9301c8835", type: "string" },
    { key: "commit_sha", value: "e3803b6c9d423aea62f26f30dbbd6eb9301c8835", type: "string" },
    { key: "pull_request_id", value: "pr-repo-1400094389-4", type: "string" },
    { key: "issue_id", value: "iss-repo-1373577934-1", type: "string" },
    { key: "installation_id", value: "164021978", type: "string" },
    { key: "report_id", value: "rep-daily-today", type: "string" },
    { key: "conversation_id", value: "conv-postman-test-1", type: "string" }
  ],
  item: []
};

// -------------------------------------------------------------
// FOLDER 1: 01 Authentication & Users
// -------------------------------------------------------------
const authFolder = {
  name: "01 Authentication & Users",
  description: "User authentication, JWT token refresh, current user profile, organization context, and user provisioning.",
  item: [
    {
      name: "Login (Primary Admin - Betopia)",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Token returned and extracted", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('accessToken');
    pm.expect(jsonData.data).to.have.property('refreshToken');
    pm.environment.set("auth_token", jsonData.data.accessToken);
    pm.collectionVariables.set("auth_token", jsonData.data.accessToken);
    pm.environment.set("refresh_token", jsonData.data.refreshToken);
    pm.collectionVariables.set("refresh_token", jsonData.data.refreshToken);
    if (jsonData.data.organizationId) {
        pm.environment.set("organization_id", jsonData.data.organizationId);
        pm.collectionVariables.set("organization_id", jsonData.data.organizationId);
    }
});`
      }),
      request: {
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            email: "{{email}}",
            password: "{{password}}"
          }, null, 2)
        },
        url: createUrl("/api/auth/login"),
        description: "Authenticates tenant admin and returns JWT access token (valid 3 days) and refresh token (valid 30 days). Automatically sets `{{auth_token}}`."
      }
    },
    {
      name: "Login (Secondary Org Admin - MasfiqurNehal)",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Secondary Token saved", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.environment.set("secondary_auth_token", jsonData.data.accessToken);
    pm.collectionVariables.set("secondary_auth_token", jsonData.data.accessToken);
    pm.environment.set("secondary_org_id", jsonData.data.organizationId);
    pm.collectionVariables.set("secondary_org_id", jsonData.data.organizationId);
});`
      }),
      request: {
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            email: "{{secondary_email}}",
            password: "{{secondary_password}}"
          }, null, 2)
        },
        url: createUrl("/api/auth/login"),
        description: "Authenticates secondary organization admin for testing multi-tenant isolation barriers."
      }
    },
    {
      name: "Refresh Access Token",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("New access token generated", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('accessToken');
    pm.environment.set("auth_token", jsonData.data.accessToken);
    pm.collectionVariables.set("auth_token", jsonData.data.accessToken);
});`
      }),
      request: {
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            refreshToken: "{{refresh_token}}"
          }, null, 2)
        },
        url: createUrl("/api/auth/refresh"),
        description: "Refreshes an expired or expiring access token using the active refresh token."
      }
    },
    {
      name: "Get Current Authenticated User (Me)",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Profile structure matches DTO", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('id');
    pm.expect(jsonData.data).to.have.property('email');
    pm.expect(jsonData.data).to.have.property('role');
    pm.environment.set("user_id", jsonData.data.id);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/auth/me"),
        description: "Returns currently authenticated user profile, assigned role, organization identifier, and permissions."
      }
    },
    {
      name: "Update Current User Profile",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Profile updated successfully", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "PUT",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            name: "Betopia Admin Specialist",
            avatarUrl: "https://avatars.githubusercontent.com/u/155254110"
          }, null, 2)
        },
        url: createUrl("/api/auth/profile"),
        description: "Updates display name and avatar URL for the currently authenticated user."
      }
    },
    {
      name: "Get Audit Login History",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Login history array returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/auth/logins", [{ key: "limit", value: "20", description: "Max logs to return" }]),
        description: "Retrieves recent login audit logs including IP address, user-agent, and timestamp."
      }
    },
    {
      name: "Create Tenant User (Admin Only)",
      event: createTestScript({
        statusCodes: [201, 400, 409],
        custom: `pm.test("Handled user creation", function () {
    pm.expect(pm.response.code).to.be.oneOf([201, 400, 409]);
});`
      }),
      request: {
        auth: authBearer(),
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            name: "Automation QA Engineer",
            email: "qa.engineer@betopia.com",
            password: "SecurePassword123!",
            role: "developer"
          }, null, 2)
        },
        url: createUrl("/api/auth/users"),
        description: "Provisions a new user within the current organization. Requires organization admin privileges."
      }
    },
    {
      name: "Logout",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Session revoked", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({}, null, 2)
        },
        url: createUrl("/api/auth/logout"),
        description: "Revokes current refresh token and terminates active session."
      }
    }
  ]
};
collection.item.push(authFolder);

// -------------------------------------------------------------
// FOLDER 2: 02 System & Health
// -------------------------------------------------------------
const healthFolder = {
  name: "02 System & Health",
  description: "Liveness, readiness, uptime diagnostics, and PostgreSQL connection pool telemetry.",
  item: [
    {
      name: "Root Service Banner",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Service name and status are healthy", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.name).to.include("GitHub Project Monitoring Agent");
});`
      }),
      request: {
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/"),
        description: "Root entry point returning microservice identification, environment, and version."
      }
    },
    {
      name: "Health Status & Metrics",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Database and memory are operational", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.status).to.eql("healthy");
    pm.expect(jsonData.data.database).to.eql("connected");
});`
      }),
      request: {
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/health"),
        description: "Comprehensive health check verifying Express app status, Neon PostgreSQL connectivity, memory heap usage, and uptime."
      }
    },
    {
      name: "Database Health & Connection Ping",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Database latency is verified", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('connected');
});`
      }),
      request: {
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/health/database"),
        description: "Dedicated PostgreSQL connection test executing a live query against Neon DB."
      }
    }
  ]
};
collection.item.push(healthFolder);

// -------------------------------------------------------------
// FOLDER 3: 03 Demo Access Requests
// -------------------------------------------------------------
const demoFolder = {
  name: "03 Demo Access Requests",
  description: "Public landing page demo lead capture and admin review endpoints.",
  item: [
    {
      name: "Submit Demo Request (Public)",
      event: createTestScript({
        statusCodes: [200, 201],
        custom: `pm.test("Demo request recorded", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            name: "Alex Vance",
            email: "alex.vance@blackmesa.org",
            company: "Black Mesa Research",
            teamSize: "10-25",
            notes: "Evaluating automated PR tracking and developer analytics for quarterly engineering audits."
          }, null, 2)
        },
        url: createUrl("/api/demo-requests"),
        description: "Public endpoint for website visitors to register interest and schedule an enterprise demo."
      }
    },
    {
      name: "List Demo Requests (Admin)",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Demo requests array returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/demo-requests"),
        description: "Lists all captured demo requests. Protected by authentication middleware."
      }
    }
  ]
};
collection.item.push(demoFolder);

// -------------------------------------------------------------
// FOLDER 4: 04 GitHub App & Integration
// -------------------------------------------------------------
const githubFolder = {
  name: "04 GitHub App & Integration",
  description: "GitHub App setup, installation management, repository synchronization, and installation tokens.",
  item: [
    {
      name: "Get GitHub Connection Status",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("GitHub connection status object returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('connected');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/github/status"),
        description: "Checks whether current tenant has an active GitHub App installation connected."
      }
    },
    {
      name: "Get GitHub App Install URL",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Install URL returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('installationUrl');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/github/install-url"),
        description: "Generates the authorized GitHub App installation URL containing the tenant state parameter."
      }
    },
    {
      name: "GitHub Setup Callback",
      event: createTestScript({
        statusCodes: [200, 302],
        custom: `pm.test("Callback processed", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 302]);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/github/setup-callback", [
          { key: "installation_id", value: "{{installation_id}}", description: "GitHub App installation ID" },
          { key: "setup_action", value: "install", description: "Action type" }
        ]),
        description: "OAuth redirect callback invoked by GitHub upon installation of the GitHub App."
      }
    },
    {
      name: "List Repositories from GitHub App",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("GitHub repositories list returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/github/repositories"),
        description: "Fetches repositories made accessible to the GitHub App installation directly from GitHub API."
      }
    },
    {
      name: "Validate GitHub Repository URL",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Validation status returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            repositoryUrl: "https://github.com/MasfiqurNehal/VELQON-Frontend"
          }, null, 2)
        },
        url: createUrl("/api/github/validate-repository"),
        description: "Validates if a specific GitHub repository exists and is accessible under the app's permissions."
      }
    },
    {
      name: "List Installed GitHub App Connections",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Installations array returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
    if (jsonData.data.length > 0) {
        pm.environment.set("installation_id", jsonData.data[0].installationId || jsonData.data[0].id);
    }
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/settings/github/installations"),
        description: "Returns all recorded GitHub App installations linked to the organization."
      }
    },
    {
      name: "Trigger Manual GitHub Sync",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Sync triggered successfully", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({}, null, 2)
        },
        url: createUrl("/api/settings/github/sync"),
        description: "Initiates asynchronous synchronization of repositories and permissions with GitHub."
      }
    },
    {
      name: "Generate Installation Access Token",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Token returned or acknowledged", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            installationId: "{{installation_id}}"
          }, null, 2)
        },
        url: createUrl("/api/settings/github/generate-token"),
        description: "Generates an ephemeral GitHub App installation access token for scoped Octokit operations."
      }
    }
  ]
};
collection.item.push(githubFolder);

// -------------------------------------------------------------
// FOLDER 5: 05 Dashboard & Analytics
// -------------------------------------------------------------
const dashboardFolder = {
  name: "05 Dashboard & Analytics",
  description: "Aggregated metrics, productivity trends, churn analysis, risk signals, and executive summaries.",
  item: [
    {
      name: "Get Dashboard Summary",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Summary KPI metrics present", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('totalRepos');
    pm.expect(jsonData.data).to.have.property('totalCommits');
    pm.expect(jsonData.data).to.have.property('totalPRs');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/dashboard/summary", [
          { key: "timeframe", value: "30d", description: "Analytics window (7d, 30d, 90d)" }
        ]),
        description: "High-level KPI statistics including active repositories, total commits, pull requests, and contributors."
      }
    },
    {
      name: "Get Dashboard Overview",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Overview payload returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/dashboard/overview", [
          { key: "timeframe", value: "30d", description: "Timeframe filter" }
        ]),
        description: "Comprehensive operational overview with velocity rates and merge cycle times."
      }
    },
    {
      name: "Get Activity Trends",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Trends time series returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/dashboard/trends", [
          { key: "timeframe", value: "30d", description: "Timeframe" },
          { key: "interval", value: "day", description: "Bucketing interval (day, week)" }
        ]),
        description: "Time-series commit and pull request trends for charting and visualization."
      }
    },
    {
      name: "Get Recent Activity Feed",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Activity array returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/dashboard/activity", [
          { key: "limit", value: "25", description: "Item count" }
        ]),
        description: "Chronological stream of recent GitHub actions across all connected organization repositories."
      }
    },
    {
      name: "Get Commits Analytics",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Commit metrics returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/dashboard/commits", [
          { key: "timeframe", value: "30d", description: "Window" }
        ]),
        description: "Aggregated commit frequency, line additions/deletions, and author breakdowns."
      }
    },
    {
      name: "Get Pull Requests Analytics",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("PR metrics returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/dashboard/pull-requests", [
          { key: "timeframe", value: "30d", description: "Window" }
        ]),
        description: "PR lifecycle metrics: time-to-first-review, open vs merged ratio, and review turnaround."
      }
    },
    {
      name: "Get Issues Analytics",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Issue metrics returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/dashboard/issues", [
          { key: "timeframe", value: "30d", description: "Window" }
        ]),
        description: "Issue resolution velocity, stale issue counts, and issue-to-PR links."
      }
    },
    {
      name: "Get Developers Analytics",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Developer metrics returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/dashboard/developers", [
          { key: "timeframe", value: "30d", description: "Window" }
        ]),
        description: "Active contributor rankings, commit share, and PR participation."
      }
    },
    {
      name: "Get Repositories Analytics",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Repository comparison returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/dashboard/repositories", [
          { key: "timeframe", value: "30d", description: "Window" }
        ]),
        description: "Cross-repository health comparisons and activity volume."
      }
    },
    {
      name: "Get Daily Engineering Snapshot",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Daily metrics present", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/dashboard/daily"),
        description: "Current day's real-time commits, open PRs, and active contributors snapshot."
      }
    },
    {
      name: "Get AI Risk & Velocity Signals",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Signals array returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/dashboard/signals"),
        description: "Heuristic alerts detecting unreviewed PRs, high churn, or stalled work."
      }
    },
    {
      name: "Refresh Dashboard Analytics Cache",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Cache invalidated and rebuilt", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({}, null, 2)
        },
        url: createUrl("/api/dashboard/refresh"),
        description: "Forces a fresh computation of aggregated dashboard rollups in PostgreSQL."
      }
    },
    {
      name: "Get Code Churn Analytics (Organization)",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Code churn data returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/analytics/code-churn", [
          { key: "timeframe", value: "30d", description: "Timeframe" }
        ]),
        description: "Organization-wide code churn metrics measuring rewritten vs new code."
      }
    },
    {
      name: "Get Code Churn by Repository",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Repository churn returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/analytics/code-churn/repository/:id"),
        description: "Repository-scoped code rework and deletion ratios."
      }
    },
    {
      name: "Get Code Churn by Developer",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Developer churn returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/analytics/code-churn/developer/:id"),
        description: "Developer-specific code rework and modification metrics."
      }
    }
  ]
};
collection.item.push(dashboardFolder);

// -------------------------------------------------------------
// FOLDER 6: 06 Projects
// -------------------------------------------------------------
const projectFolder = {
  name: "06 Projects",
  description: "Logical project groups bundling multiple monitored repositories together.",
  item: [
    {
      name: "List Projects",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Projects list returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
    if (jsonData.data.length > 0) {
        pm.environment.set("project_id", jsonData.data[0].id);
        pm.collectionVariables.set("project_id", jsonData.data[0].id);
    }
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/projects"),
        description: "Returns all monitored projects under the authenticated organization."
      }
    },
    {
      name: "Create Project",
      event: createTestScript({
        statusCodes: [201],
        custom: `pm.test("Project created", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('id');
    pm.environment.set("project_id", jsonData.data.id);
    pm.collectionVariables.set("project_id", jsonData.data.id);
});`
      }),
      request: {
        auth: authBearer(),
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            name: "Cloud Infrastructure & Backend Monitoring",
            description: "Tracks cloud microservices, database migrations, and CI/CD pipelines.",
            repositoryIds: ["{{repository_id}}"]
          }, null, 2)
        },
        url: createUrl("/api/projects"),
        description: "Creates a new monitored project and links repositories."
      }
    },
    {
      name: "Get Project Details",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Project detail matches ID", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.id).to.eql(pm.environment.get("project_id"));
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/projects/:id"),
        description: "Fetches metadata, linked repositories, and metrics for a specific project."
      }
    },
    {
      name: "Update Project",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Project updated", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "PUT",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            name: "Cloud Infrastructure & Backend Monitoring (Active)",
            description: "High priority project monitoring core services and automated pull requests."
          }, null, 2)
        },
        url: createUrl("/api/projects/:id"),
        description: "Updates project name and description."
      }
    },
    {
      name: "Get Project Repositories",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Repositories array returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/projects/:id/repositories"),
        description: "Retrieves list of all repositories assigned to this project."
      }
    },
    {
      name: "Link Repository to Project",
      event: createTestScript({
        statusCodes: [200, 201, 409],
        custom: `pm.test("Handled repository attachment", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 409]);
});`
      }),
      request: {
        auth: authBearer(),
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            repositoryId: "{{repository_id}}"
          }, null, 2)
        },
        url: createUrl("/api/projects/:id/repositories"),
        description: "Attaches a monitored repository to this project."
      }
    },
    {
      name: "Unlink Repository from Project [DESTRUCTIVE]",
      event: createTestScript({
        statusCodes: [200, 204],
        custom: `pm.test("Repository unlinked", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 204]);
});`
      }),
      request: {
        auth: authBearer(),
        method: "DELETE",
        header: jsonHeaders(),
        url: createUrl("/api/projects/:id/repositories/:repoId"),
        description: "Removes a repository linkage from this project without deleting the underlying repository."
      }
    },
    {
      name: "Delete Project [DESTRUCTIVE - REQUIRES PASSWORD]",
      event: createTestScript({
        statusCodes: [200, 400, 401],
        custom: `pm.test("Handled project deletion", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 400, 401]);
});`
      }),
      request: {
        auth: authBearer(),
        method: "DELETE",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            password: "{{password}}",
            confirmation: true
          }, null, 2)
        },
        url: createUrl("/api/projects/:id"),
        description: "Permanently deletes a project. Requires admin password in request body for multi-tenant security verification."
      }
    }
  ]
};
collection.item.push(projectFolder);

// -------------------------------------------------------------
// FOLDER 7: 07 Repositories
// -------------------------------------------------------------
const repoFolder = {
  name: "07 Repositories",
  description: "Repository registration, sync lifecycle, commit indexing, and repository deletion.",
  item: [
    {
      name: "List Monitored Repositories",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Repositories list returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
    if (jsonData.data.length > 0) {
        pm.environment.set("repository_id", jsonData.data[0].id);
        pm.collectionVariables.set("repository_id", jsonData.data[0].id);
    }
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/repositories"),
        description: "Returns all monitored repositories registered for this organization."
      }
    },
    {
      name: "Add Repository to Monitor",
      event: createTestScript({
        statusCodes: [200, 201, 409],
        custom: `pm.test("Handled repository addition", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 409]);
});`
      }),
      request: {
        auth: authBearer(),
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            githubUrl: "https://github.com/MasfiqurNehal/VELQON-Frontend",
            name: "VELQON-Frontend",
            isPrivate: false
          }, null, 2)
        },
        url: createUrl("/api/repositories"),
        description: "Registers a repository for background sync, commit analysis, and PR tracking."
      }
    },
    {
      name: "Validate Repository URL",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("URL validation response received", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            url: "https://github.com/MasfiqurNehal/VELQON-Frontend"
          }, null, 2)
        },
        url: createUrl("/api/repositories/validate"),
        description: "Validates format and accessibility of a prospective GitHub repository URL."
      }
    },
    {
      name: "Trigger Sync All Repositories",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Sync all initiated", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({}, null, 2)
        },
        url: createUrl("/api/repositories/sync-all"),
        description: "Enqueues background synchronization tasks across all tenant repositories."
      }
    },
    {
      name: "Get Repository Details",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Repository details match ID", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.id).to.eql(pm.environment.get("repository_id"));
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/repositories/:id"),
        description: "Retrieves metadata, branch counts, sync status, and default branch for a repository."
      }
    },
    {
      name: "Trigger Single Repository Sync",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Sync triggered", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({}, null, 2)
        },
        url: createUrl("/api/repositories/:id/sync"),
        description: "Triggers on-demand synchronization of commits, branches, PRs, and contributors."
      }
    },
    {
      name: "Get Repository Sync Status",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Sync status payload returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('status');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/repositories/:id/sync-status"),
        description: "Checks real-time sync progress (queued, in_progress, completed, failed)."
      }
    },
    {
      name: "Delete Repository [DESTRUCTIVE]",
      event: createTestScript({
        statusCodes: [200, 204],
        custom: `pm.test("Repository deletion handled", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 204]);
});`
      }),
      request: {
        auth: authBearer(),
        method: "DELETE",
        header: jsonHeaders(),
        url: createUrl("/api/repositories/:id"),
        description: "Removes repository from monitoring and unindexes associated commits and activity."
      }
    }
  ]
};
collection.item.push(repoFolder);

// -------------------------------------------------------------
// FOLDER 8: 08 Developers
// -------------------------------------------------------------
const devFolder = {
  name: "08 Developers",
  description: "Contributor profiling, developer velocity, review participation, and factual performance metrics.",
  item: [
    {
      name: "List Developers",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Developers array returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
    if (jsonData.data.length > 0) {
        pm.environment.set("developer_id", jsonData.data[0].id);
        pm.collectionVariables.set("developer_id", jsonData.data[0].id);
    }
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/developers", [
          { key: "timeframe", value: "30d", description: "Timeframe filter" }
        ]),
        description: "Lists all detected developers across organization repositories with high-level stats."
      }
    },
    {
      name: "Get Developer Profile",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Developer details returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.id).to.eql(pm.environment.get("developer_id"));
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/developers/:id"),
        description: "Returns developer GitHub profile, email, aggregate commits, and merged PR count."
      }
    },
    {
      name: "Get Developer Activity Feed",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Developer activity array returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/developers/:id/activity", [
          { key: "timeframe", value: "30d", description: "Window" }
        ]),
        description: "Filtered chronological action log specific to this developer."
      }
    },
    {
      name: "Get Developer Commits",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Developer commits returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/developers/:id/commits", [
          { key: "timeframe", value: "30d", description: "Window" },
          { key: "limit", value: "30", description: "Limit" }
        ]),
        description: "Detailed list of recent commits authored by this developer."
      }
    },
    {
      name: "Get Developer Pull Requests",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Developer PRs returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/developers/:id/pull-requests", [
          { key: "timeframe", value: "30d", description: "Window" }
        ]),
        description: "Pull requests authored or assigned to this developer."
      }
    },
    {
      name: "Get Developer Issues",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Developer issues returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/developers/:id/issues", [
          { key: "timeframe", value: "30d", description: "Window" }
        ]),
        description: "Issues opened by or assigned to this developer."
      }
    },
    {
      name: "Get Developer Code Reviews",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Developer reviews returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/developers/:id/reviews", [
          { key: "timeframe", value: "30d", description: "Window" }
        ]),
        description: "Peer code reviews conducted by this developer."
      }
    },
    {
      name: "Get Developer Factual Analytics",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Factual analytics returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/developers/:id/factual-analytics", [
          { key: "timeframe", value: "30d", description: "Window" }
        ]),
        description: "Unbiased factual analytics covering impact, consistency, review latency, and code churn."
      }
    }
  ]
};
collection.item.push(devFolder);

// -------------------------------------------------------------
// FOLDER 9: 09 Commits
// -------------------------------------------------------------
const commitFolder = {
  name: "09 Commits",
  description: "Git commit history, commit details, patch diffs, and file modification stats.",
  item: [
    {
      name: "List Commits for Repository",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Commits list returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
    if (jsonData.data.length > 0) {
        pm.environment.set("commit_id", jsonData.data[0].id);
        pm.collectionVariables.set("commit_id", jsonData.data[0].id);
        if (jsonData.data[0].sha) {
            pm.environment.set("commit_sha", jsonData.data[0].sha);
            pm.collectionVariables.set("commit_sha", jsonData.data[0].sha);
        }
    }
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/repositories/:id/commits", [
          { key: "limit", value: "50", description: "Max commits" },
          { key: "branch", value: "main", description: "Branch filter", disabled: true }
        ]),
        description: "Fetches commits synchronized for the specified repository."
      }
    },
    {
      name: "Get Commit Details",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Commit detail returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.have.property('sha');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/commits/:id"),
        description: "Retrieves commit author, message, additions, deletions, and verification status."
      }
    },
    {
      name: "Get Commit File Changes (Diff)",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("File changes returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/commits/:id/changes"),
        description: "Returns list of changed files, patches, line insertions, and deletions for this commit."
      }
    }
  ]
};
collection.item.push(commitFolder);

// -------------------------------------------------------------
// FOLDER 10: 10 Pull Requests
// -------------------------------------------------------------
const prFolder = {
  name: "10 Pull Requests",
  description: "Pull request tracking, review progress, merge checks, and repo-specific PR lists.",
  item: [
    {
      name: "List Pull Requests (All Repositories)",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("PRs array returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
    if (jsonData.data.length > 0) {
        pm.environment.set("pull_request_id", jsonData.data[0].id);
        pm.collectionVariables.set("pull_request_id", jsonData.data[0].id);
    }
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/pull-requests", [
          { key: "status", value: "all", description: "Filter (open, closed, merged, all)" },
          { key: "limit", value: "50", description: "Limit" }
        ]),
        description: "Returns all pull requests synchronized across organization repositories."
      }
    },
    {
      name: "Get Pull Request Details",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("PR details returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data.id).to.eql(pm.environment.get("pull_request_id"));
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/pull-requests/:id"),
        description: "Retrieves complete pull request details including branch names, reviews, labels, and CI status."
      }
    },
    {
      name: "List Pull Requests for Repository",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Repo PRs returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/repositories/:id/pull-requests", [
          { key: "status", value: "all", description: "Status filter" }
        ]),
        description: "Returns pull requests scoped to a single repository."
      }
    }
  ]
};
collection.item.push(prFolder);

// -------------------------------------------------------------
// FOLDER 11: 11 Issues
// -------------------------------------------------------------
const issueFolder = {
  name: "11 Issues",
  description: "GitHub issues monitoring, lifecycle states, assignments, and repo-specific issues.",
  item: [
    {
      name: "List Issues (All Repositories)",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Issues array returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
    if (jsonData.data.length > 0) {
        pm.environment.set("issue_id", jsonData.data[0].id);
        pm.collectionVariables.set("issue_id", jsonData.data[0].id);
    }
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/issues", [
          { key: "status", value: "all", description: "Filter (open, closed, all)" },
          { key: "limit", value: "50", description: "Limit" }
        ]),
        description: "Returns issues tracked across organization repositories."
      }
    },
    {
      name: "Get Issue Details",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Issue details returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/issues/:id"),
        description: "Retrieves issue metadata, labels, assignees, and comments count."
      }
    },
    {
      name: "List Issues for Repository",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Repo issues returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/repositories/:id/issues", [
          { key: "status", value: "open", description: "Filter" }
        ]),
        description: "Returns issues scoped to a specific repository."
      }
    }
  ]
};
collection.item.push(issueFolder);

// -------------------------------------------------------------
// FOLDER 12: 12 Activity Stream
// -------------------------------------------------------------
const activityFolder = {
  name: "12 Activity Stream",
  description: "Global event log and real-time activity stream across all monitored entities.",
  item: [
    {
      name: "Get Global Activity Stream",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Activity stream returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/activity", [
          { key: "limit", value: "50", description: "Item count" },
          { key: "type", value: "all", description: "Filter by action type (push, pr, review, issue)" }
        ]),
        description: "Provides an audit trail and live feed of engineering actions."
      }
    }
  ]
};
collection.item.push(activityFolder);

// -------------------------------------------------------------
// FOLDER 13: 13 Reports
// -------------------------------------------------------------
const reportFolder = {
  name: "13 Reports",
  description: "Automated executive digests: Daily standup summaries, weekly engineering reviews, and monthly retrospectives.",
  item: [
    {
      name: "List Historical Reports",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Reports array returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
    pm.expect(jsonData.data).to.be.an('array');
    if (jsonData.data.length > 0) {
        pm.environment.set("report_id", jsonData.data[0].id);
        pm.collectionVariables.set("report_id", jsonData.data[0].id);
    }
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/reports", [
          { key: "limit", value: "20", description: "Limit" }
        ]),
        description: "Lists generated engineering summaries and reports."
      }
    },
    {
      name: "Get Daily Standup Report",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Daily report returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/reports/daily", [
          { key: "date", value: "2026-10-28", description: "Target date (YYYY-MM-DD)" }
        ]),
        description: "Daily automated summary of commits pushed, PRs opened/merged, and blockers."
      }
    },
    {
      name: "Get Weekly Engineering Report",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Weekly report returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/reports/weekly", [
          { key: "week", value: "2026-W43", description: "ISO week identifier" }
        ]),
        description: "Weekly velocity digest highlighting sprint progress, team contributions, and cycle times."
      }
    },
    {
      name: "Get Monthly Retrospective Report",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Monthly report returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/reports/monthly", [
          { key: "month", value: "2026-10", description: "Month (YYYY-MM)" }
        ]),
        description: "Monthly high-level executive report summarizing engineering throughput and repository growth."
      }
    },
    {
      name: "Get Project-Specific Report",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Project report returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/reports/project/:id", [
          { key: "timeframe", value: "30d", description: "Timeframe" }
        ]),
        description: "Consolidated report scoped to a specific project bundle."
      }
    },
    {
      name: "Get Repository-Specific Report",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Repository report returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/reports/repository/:id", [
          { key: "timeframe", value: "30d", description: "Timeframe" }
        ]),
        description: "Activity, churn, and quality report scoped to a single repository."
      }
    },
    {
      name: "Get Developer-Specific Report",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Developer report returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/reports/developer/:id", [
          { key: "timeframe", value: "30d", description: "Timeframe" }
        ]),
        description: "Individual performance, review participation, and commit volume report."
      }
    },
    {
      name: "Generate On-Demand Report",
      event: createTestScript({
        statusCodes: [200, 201],
        custom: `pm.test("Report generation initiated", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            type: "daily",
            format: "json",
            date: "2026-10-28"
          }, null, 2)
        },
        url: createUrl("/api/reports/generate"),
        description: "Triggers on-demand calculation and persistence of a new report."
      }
    },
    {
      name: "Get Report Details by ID",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Report payload returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        auth: authBearer(),
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/reports/:id"),
        description: "Retrieves a previously stored report by unique ID."
      }
    }
  ]
};
collection.item.push(reportFolder);

// -------------------------------------------------------------
// FOLDER 14: 14 Webhooks & Telemetry
// -------------------------------------------------------------
const webhookFolder = {
  name: "14 Webhooks & Telemetry",
  description: "GitHub Webhook ingestion handler (HMAC signature verified) and frontend user telemetry logging.",
  item: [
    {
      name: "GitHub Webhook Receiver (/api/webhooks/github)",
      event: createTestScript({
        statusCodes: [200, 400, 401],
        custom: `pm.test("Webhook endpoint responded", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 400, 401]);
});`
      }),
      request: {
        method: "POST",
        header: [
          { key: "Content-Type", value: "application/json", type: "text" },
          { key: "X-GitHub-Event", value: "push", type: "text" },
          { key: "X-GitHub-Delivery", value: "72d3162e-cc78-11e3-814f-bd7995305b45", type: "text" },
          { key: "X-Hub-Signature-256", value: "sha256=test_signature_placeholder", type: "text" }
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            ref: "refs/heads/main",
            before: "0000000000000000000000000000000000000000",
            after: "e3803b6c9d423aea62f26f30dbbd6eb9301c8835",
            repository: {
              id: 1373577934,
              name: "VELQON-Frontend",
              full_name: "MasfiqurNehal/VELQON-Frontend",
              owner: {
                login: "MasfiqurNehal"
              }
            },
            pusher: {
              name: "MasfiqurNehal",
              email: "nehal@betopia.com"
            },
            commits: [
              {
                id: "e3803b6c9d423aea62f26f30dbbd6eb9301c8835",
                message: "feat: add comprehensive automated API tests",
                timestamp: "2026-10-28T12:00:00Z",
                author: {
                  name: "Masfiqur Nehal",
                  email: "nehal@betopia.com"
                }
              }
            ]
          }, null, 2)
        },
        url: createUrl("/api/webhooks/github"),
        description: "Primary receiver for GitHub App webhook events (push, pull_request, issues, installation)."
      }
    },
    {
      name: "GitHub Webhook Receiver (Alias: /api/webhook/github)",
      event: createTestScript({
        statusCodes: [200, 400, 401],
        custom: `pm.test("Webhook alias responded", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 400, 401]);
});`
      }),
      request: {
        method: "POST",
        header: [
          { key: "Content-Type", value: "application/json", type: "text" },
          { key: "X-GitHub-Event", value: "ping", type: "text" }
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            zen: "Keep it logically awesome.",
            hook_id: 12345678
          }, null, 2)
        },
        url: createUrl("/api/webhook/github"),
        description: "Singular path alias for webhook event listeners."
      }
    },
    {
      name: "Log Telemetry Event",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Telemetry event recorded", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});`
      }),
      request: {
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            eventType: "navigation",
            path: "/projects",
            timestamp: new Date().toISOString(),
            metadata: {
              browser: "Chrome",
              version: "130.0",
              device: "Desktop"
            }
          }, null, 2)
        },
        url: createUrl("/api/telemetry/log"),
        description: "Frontend telemetry ingestion endpoint logging user interactions and errors."
      }
    }
  ]
};
collection.item.push(webhookFolder);

// -------------------------------------------------------------
// FOLDER 15: 15 Multi-Tenant & Security Tests
// -------------------------------------------------------------
const securityFolder = {
  name: "15 Multi-Tenant & Security Tests",
  description: "Negative security tests, cross-tenant isolation enforcement, authorization barriers, and password protected mutations.",
  item: [
    {
      name: "SEC-01: Reject Access Without Token (Unauthorized)",
      event: createTestScript({
        statusCodes: [401],
        custom: `pm.test("Rejected with 401 Unauthorized", function () {
    pm.expect(pm.response.code).to.eql(401);
});`
      }),
      request: {
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/auth/me"),
        description: "Ensures endpoints protected by auth middleware reject requests without Bearer token."
      }
    },
    {
      name: "SEC-02: Reject Malformed / Forged JWT Token",
      event: createTestScript({
        statusCodes: [401],
        custom: `pm.test("Rejected with 401 Unauthorized", function () {
    pm.expect(pm.response.code).to.eql(401);
});`
      }),
      request: {
        auth: {
          type: "bearer",
          bearer: [{ key: "token", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.signature", type: "string" }]
        },
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/dashboard/summary"),
        description: "Verifies that forged or modified JWT tokens are denied."
      }
    },
    {
      name: "SEC-03: Reject Invalid Login Credentials",
      event: createTestScript({
        statusCodes: [401],
        custom: `pm.test("Rejected with 401 Unauthorized", function () {
    pm.expect(pm.response.code).to.eql(401);
});`
      }),
      request: {
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            email: "nonexistent.user@betopia.com",
            password: "WrongPassword999!"
          }, null, 2)
        },
        url: createUrl("/api/auth/login"),
        description: "Ensures incorrect passwords do not yield authentication tokens."
      }
    },
    {
      name: "SEC-04: Cross-Tenant Isolation - Access Repository With Different Tenant Token",
      event: createTestScript({
        statusCodes: [403, 404],
        custom: `pm.test("Cross-tenant access blocked (403 or 404)", function () {
    pm.expect(pm.response.code).to.be.oneOf([403, 404]);
});`
      }),
      request: {
        auth: {
          type: "bearer",
          bearer: [{ key: "token", value: "{{secondary_auth_token}}", type: "string" }]
        },
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/repositories/:id"),
        description: "Uses Secondary Org Admin token (org-masfiqurnehal) to request a Betopia repository (`{{repository_id}}`). Must return 404 or 403."
      }
    },
    {
      name: "SEC-05: Cross-Tenant Isolation - Access Project With Different Tenant Token",
      event: createTestScript({
        statusCodes: [403, 404],
        custom: `pm.test("Cross-tenant project access blocked (403 or 404)", function () {
    pm.expect(pm.response.code).to.be.oneOf([403, 404]);
});`
      }),
      request: {
        auth: {
          type: "bearer",
          bearer: [{ key: "token", value: "{{secondary_auth_token}}", type: "string" }]
        },
        method: "GET",
        header: jsonHeaders(),
        url: createUrl("/api/projects/:id"),
        description: "Uses Secondary Org Admin token to request a Betopia project (`{{project_id}}`). Must be blocked."
      }
    },
    {
      name: "SEC-06: Reject Project Deletion Without Password Confirmation",
      event: createTestScript({
        statusCodes: [400, 401],
        custom: `pm.test("Rejected with 400 or 401 when password missing", function () {
    pm.expect(pm.response.code).to.be.oneOf([400, 401]);
});`
      }),
      request: {
        auth: authBearer(),
        method: "DELETE",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            password: "",
            confirmation: false
          }, null, 2)
        },
        url: createUrl("/api/projects/:id"),
        description: "Ensures destructive project deletion strictly checks for password verification."
      }
    }
  ]
};
collection.item.push(securityFolder);

// -------------------------------------------------------------
// FOLDER 16: 16 AI Microservice (FastAPI Services)
// -------------------------------------------------------------
const aiFolder = {
  name: "16 AI Microservice (FastAPI)",
  description: "Python FastAPI AI service endpoints: Chatbot conversational assistance, Engineering Agent code reasoning, and conversation sessions.",
  item: [
    {
      name: "AI Service Health",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("AI service is healthy", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.status).to.eql("healthy");
});`
      }),
      request: {
        method: "GET",
        header: jsonHeaders(),
        url: createAiUrl("/health"),
        description: "Checks Python FastAPI microservice health, LLM provider readiness, and vector store connection."
      }
    },
    {
      name: "Chatbot Direct Chat (/api/chat)",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Chatbot response received", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('reply');
});`
      }),
      request: {
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            message: "What are the recent open pull requests and what is their status?",
            conversation_id: "{{conversation_id}}",
            context: {
              organization_id: "{{organization_id}}",
              repository_id: "{{repository_id}}"
            }
          }, null, 2)
        },
        url: createAiUrl("/api/chat"),
        description: "Direct conversational interface for GitMonitor Chatbot."
      }
    },
    {
      name: "Chatbot v1 Chat Endpoint",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("v1 Chatbot reply returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('response');
});`
      }),
      request: {
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            message: "Summarize developer activity for the past 7 days.",
            conversation_id: "{{conversation_id}}"
          }, null, 2)
        },
        url: createAiUrl("/api/v1/chatbot/chat"),
        description: "Versioned chatbot query endpoint supporting multi-turn dialogue."
      }
    },
    {
      name: "List Chatbot Conversations",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Conversations array returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.be.an('array');
});`
      }),
      request: {
        method: "GET",
        header: jsonHeaders(),
        url: createAiUrl("/api/v1/chatbot/conversations"),
        description: "Retrieves active conversation threads."
      }
    },
    {
      name: "Create Chatbot Conversation",
      event: createTestScript({
        statusCodes: [200, 201],
        custom: `pm.test("Conversation created", function () {
    var jsonData = pm.response.json();
    if (jsonData.id) {
        pm.environment.set("conversation_id", jsonData.id);
    }
});`
      }),
      request: {
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            title: "Sprint 43 Code Review Analysis"
          }, null, 2)
        },
        url: createAiUrl("/api/v1/chatbot/conversations"),
        description: "Initializes a new persistent conversation session."
      }
    },
    {
      name: "Get Conversation Messages",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Messages array returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.be.an('array');
});`
      }),
      request: {
        method: "GET",
        header: jsonHeaders(),
        url: createAiUrl("/api/v1/chatbot/conversations/:id/messages"),
        description: "Retrieves message history for the active conversation."
      }
    },
    {
      name: "Delete Conversation [DESTRUCTIVE]",
      event: createTestScript({
        statusCodes: [200, 204],
        custom: `pm.test("Conversation deleted", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 204]);
});`
      }),
      request: {
        method: "DELETE",
        header: jsonHeaders(),
        url: createAiUrl("/api/v1/chatbot/conversations/:id"),
        description: "Deletes a conversation and frees stored memory context."
      }
    },
    {
      name: "Test AI Provider Connection",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Provider connection verified", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('status');
});`
      }),
      request: {
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            provider: "gemini"
          }, null, 2)
        },
        url: createAiUrl("/api/v1/chatbot/provider/test"),
        description: "Tests LLM provider API credentials and latency."
      }
    },
    {
      name: "Get AI Configuration Status",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Configuration returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('active_provider');
});`
      }),
      request: {
        method: "GET",
        header: jsonHeaders(),
        url: createAiUrl("/api/v1/chatbot/config/status"),
        description: "Returns currently active AI model, provider settings, and temperature."
      }
    },
    {
      name: "Engineering Agent Chat",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Agent reasoning received", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('response');
});`
      }),
      request: {
        method: "POST",
        header: jsonHeaders(),
        body: {
          mode: "raw",
          raw: JSON.stringify({
            query: "Analyze repository VELQON-Frontend commit churn and explain risk areas.",
            repository_id: "{{repository_id}}",
            timeframe: "30d"
          }, null, 2)
        },
        url: createAiUrl("/api/v1/engineering-agent/chat"),
        description: "Autonomous reasoning agent providing technical diagnoses, architecture insights, and risk assessments."
      }
    },
    {
      name: "Engineering Agent Chat (Streaming)",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Streaming initiated", function () {
    pm.expect(pm.response.code).to.eql(200);
});`
      }),
      request: {
        method: "POST",
        header: [
          { key: "Content-Type", value: "application/json", type: "text" },
          { key: "Accept", value: "text/event-stream", type: "text" }
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            query: "Provide a line-by-line summary of recent commit changes.",
            repository_id: "{{repository_id}}"
          }, null, 2)
        },
        url: createAiUrl("/api/v1/engineering-agent/chat/stream"),
        description: "Server-Sent Events (SSE) streaming endpoint for live token-by-token generation."
      }
    },
    {
      name: "List Engineering Agent Conversations",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Agent conversations returned", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.be.an('array');
});`
      }),
      request: {
        method: "GET",
        header: jsonHeaders(),
        url: createAiUrl("/api/v1/engineering-agent/conversations"),
        description: "Lists past reasoning tasks executed by the Engineering Agent."
      }
    },
    {
      name: "Engineering Agent Health",
      event: createTestScript({
        statusCodes: [200],
        custom: `pm.test("Agent health ok", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.status).to.eql("healthy");
});`
      }),
      request: {
        method: "GET",
        header: jsonHeaders(),
        url: createAiUrl("/api/v1/engineering-agent/health"),
        description: "Checks Engineering Agent vector indices and background tool execution workers."
      }
    }
  ]
};
collection.item.push(aiFolder);

// Output Collection
const collectionPath = path.join(postmanDir, 'GitMonitor-Complete-API.postman_collection.json');
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));

console.log(`Successfully generated Postman Collection at: ${collectionPath}`);
console.log(`Total folders generated: ${collection.item.length}`);
let totalRequests = 0;
collection.item.forEach(f => {
  totalRequests += f.item.length;
  console.log(` - ${f.name}: ${f.item.length} requests`);
});
console.log(`Total API Requests in Collection: ${totalRequests}`);
