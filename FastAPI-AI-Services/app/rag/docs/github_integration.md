# GitHub Connection & Integration

## GitHub Connection Setup
GitMonitor connects to your GitHub organization or personal account via:
1. **GitHub App Installation**: Enables fine-grained repository permissions and secure webhook payload processing.
2. **Personal Access Token (PAT)**: Classic or fine-grained tokens with `repo` and `read:org` scopes.

## Automatic Sync & Webhook Events
- **Webhooks**: Receives real-time push events, pull_request state changes, pull_request_review submissions, and issue state updates.
- **Sync Jobs**: Background job scheduler (`sync.service.ts`) periodically polls GitHub APIs to ensure telemetry accuracy and sync missing commits or repository metadata.
- **Connection Status**: The Settings page displays GitHub installation health, API rate limit usage, and webhook payload logs.
