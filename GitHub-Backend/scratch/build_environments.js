// Script to generate complete Postman Collection and Environments
import fs from 'fs';
import path from 'path';

const postmanDir = path.resolve('postman');
if (!fs.existsSync(postmanDir)) {
  fs.mkdirSync(postmanDir, { recursive: true });
}

// 1. GitMonitor-Local.postman_environment.json
const localEnv = {
  id: "gitmonitor-local-env-uuid-001",
  name: "GitMonitor - Local Environment",
  values: [
    { key: "base_url", value: "http://localhost:5001", type: "default", enabled: true },
    { key: "ai_service_url", value: "http://localhost:8000", type: "default", enabled: true },
    { key: "email", value: "admin@betopia.com", type: "default", enabled: true },
    { key: "password", value: "password", type: "secret", enabled: true },
    { key: "auth_token", value: "", type: "secret", enabled: true },
    { key: "refresh_token", value: "", type: "secret", enabled: true },
    { key: "user_id", value: "usr-admin-2", type: "default", enabled: true },
    { key: "organization_id", value: "org-betopia-1", type: "default", enabled: true },
    { key: "secondary_email", value: "admin1@masfiqurnehal.com", type: "default", enabled: true },
    { key: "secondary_password", value: "password", type: "secret", enabled: true },
    { key: "secondary_auth_token", value: "", type: "secret", enabled: true },
    { key: "secondary_org_id", value: "org-masfiqurnehal", type: "default", enabled: true },
    { key: "project_id", value: "prj-1793187516595-a717c0", type: "default", enabled: true },
    { key: "repository_id", value: "repo-1373577934", type: "default", enabled: true },
    { key: "repository_url", value: "https://github.com/MasfiqurNehal/VELQON-Frontend", type: "default", enabled: true },
    { key: "developer_id", value: "dev-155254110", type: "default", enabled: true },
    { key: "commit_id", value: "cmt-e3803b6c9d423aea62f26f30dbbd6eb9301c8835", type: "default", enabled: true },
    { key: "commit_sha", value: "e3803b6c9d423aea62f26f30dbbd6eb9301c8835", type: "default", enabled: true },
    { key: "pull_request_id", value: "pr-repo-1400094389-4", type: "default", enabled: true },
    { key: "issue_id", value: "iss-repo-1373577934-1", type: "default", enabled: true },
    { key: "installation_id", value: "164021978", type: "default", enabled: true },
    { key: "report_id", value: "rep-daily-today", type: "default", enabled: true },
    { key: "conversation_id", value: "conv-postman-test-1", type: "default", enabled: true },
    { key: "github_webhook_secret", value: "test-secret-value", type: "secret", enabled: true }
  ],
  _postman_variable_scope: "environment",
  _postman_exported_at: new Date().toISOString(),
  _postman_exported_using: "Postman/11.0.0"
};

// 2. GitMonitor-Production.postman_environment.json
const prodEnv = {
  id: "gitmonitor-prod-env-uuid-002",
  name: "GitMonitor - Production Environment",
  values: [
    { key: "base_url", value: "https://github-project-monitoring-agent.onrender.com", type: "default", enabled: true },
    { key: "ai_service_url", value: "https://github-project-monitoring-agent.onrender.com", type: "default", enabled: true },
    { key: "email", value: "admin@betopia.com", type: "default", enabled: true },
    { key: "password", value: "YOUR_PRODUCTION_PASSWORD", type: "secret", enabled: true },
    { key: "auth_token", value: "", type: "secret", enabled: true },
    { key: "refresh_token", value: "", type: "secret", enabled: true },
    { key: "user_id", value: "", type: "default", enabled: true },
    { key: "organization_id", value: "", type: "default", enabled: true },
    { key: "secondary_email", value: "secondary_admin@domain.com", type: "default", enabled: true },
    { key: "secondary_password", value: "SECONDARY_PROD_PASSWORD", type: "secret", enabled: true },
    { key: "secondary_auth_token", value: "", type: "secret", enabled: true },
    { key: "secondary_org_id", value: "", type: "default", enabled: true },
    { key: "project_id", value: "", type: "default", enabled: true },
    { key: "repository_id", value: "", type: "default", enabled: true },
    { key: "repository_url", value: "https://github.com/MasfiqurNehal/VELQON-Frontend", type: "default", enabled: true },
    { key: "developer_id", value: "", type: "default", enabled: true },
    { key: "commit_id", value: "", type: "default", enabled: true },
    { key: "commit_sha", value: "", type: "default", enabled: true },
    { key: "pull_request_id", value: "", type: "default", enabled: true },
    { key: "issue_id", value: "", type: "default", enabled: true },
    { key: "installation_id", value: "", type: "default", enabled: true },
    { key: "report_id", value: "", type: "default", enabled: true },
    { key: "conversation_id", value: "conv-prod-test-1", type: "default", enabled: true },
    { key: "github_webhook_secret", value: "", type: "secret", enabled: true }
  ],
  _postman_variable_scope: "environment",
  _postman_exported_at: new Date().toISOString(),
  _postman_exported_using: "Postman/11.0.0"
};

fs.writeFileSync(path.join(postmanDir, 'GitMonitor-Local.postman_environment.json'), JSON.stringify(localEnv, null, 2));
fs.writeFileSync(path.join(postmanDir, 'GitMonitor-Production.postman_environment.json'), JSON.stringify(prodEnv, null, 2));
console.log('Environments written successfully.');
