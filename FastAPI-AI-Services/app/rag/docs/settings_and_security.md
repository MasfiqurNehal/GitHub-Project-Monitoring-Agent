# Settings & SaaS Security

## Settings Page
- **Profile Management**: Update user name, designation, company name, phone number, and avatar image (uploaded securely to Cloudinary).
- **GitHub Connection Settings**: Configure GitHub App IDs, webhook secrets, and personal access tokens.
- **Organization Tenant Scoping**: Displays current SaaS organization membership (e.g., `MasfiqurNehal Org`, `Betopia Global Org 1`).

## Security & Multi-Tenant Data Protection
- **JWT Authentication**: Shared HS256 JWT access tokens with 3-day expiration and 30-day refresh token rotation.
- **Strict Data Isolation**: Queries in both Express.js and FastAPI enforce `user_id` and `organization_id` foreign key isolation. User A cannot view User B's telemetry, projects, or AI chat conversations.
