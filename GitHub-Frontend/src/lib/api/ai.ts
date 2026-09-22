import { fetchApi } from './client';
import { AIResponseData, UIAction } from '../../types';

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metrics?: {
    label: string;
    value: string | number;
    color?: string;
  }[];
  sources?: {
    title: string;
    url?: string;
    type: 'repository' | 'pr' | 'developer' | 'database';
  }[];
  actions?: {
    label: string;
    href: string;
    type?: 'activity' | 'repository' | 'developer' | 'report';
  }[];
}

export interface ConversationThread {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessageItem[];
}

export const MOCK_CONVERSATIONS: ConversationThread[] = [
  {
    id: 'conv-enosis-audit',
    title: 'Enosis backend activity on August 16',
    updatedAt: '2026-09-22T10:30:00Z',
    messages: [
      {
        id: 'msg-u1',
        role: 'user',
        content: 'Show me Enosis backend activity on August 16.',
        timestamp: '2026-09-22T10:29:00Z',
      },
      {
        id: 'msg-a1',
        role: 'assistant',
        content: 'Here is the executive engineering activity summary for **Enosis Enterprise Suite (Backend)** on **August 16, 2026**:\n\nDuring this 24-hour period, 8 active engineers contributed across the Redis API gateway and authentication microservices. A total of 32 commits were merged and 4 high-priority issues were closed.',
        timestamp: '2026-09-22T10:30:00Z',
        metrics: [
          { label: 'Commits', value: 32, color: 'text-blue-400' },
          { label: 'Pull Requests', value: 7, color: 'text-amber-400' },
          { label: 'Issues Closed', value: 4, color: 'text-purple-400' },
          { label: 'Active Developers', value: 8, color: 'text-emerald-400' },
        ],
        sources: [
          { title: 'BetopiaLtd/enosis-api-gateway', type: 'repository', url: '/repositories/repo-3' },
          { title: 'PostgreSQL Telemetry DB (commit_events)', type: 'database' },
          { title: 'GitHub Webhook Sync Engine #88', type: 'pr', url: '/pull-requests/pr-4' },
        ],
        actions: [
          { label: 'View Activity', href: '/activity?projectId=proj-2', type: 'activity' },
          { label: 'View Repository', href: '/repositories/repo-3', type: 'repository' },
          { label: 'View Developers', href: '/developers', type: 'developer' },
          { label: 'View Report', href: '/reports/rep-monthly-1', type: 'report' },
        ],
      },
    ],
  },
  {
    id: 'conv-pr-bottlenecks',
    title: 'BeyondAI PR Bottleneck Audit',
    updatedAt: '2026-09-21T15:45:00Z',
    messages: [
      {
        id: 'msg-u2',
        role: 'user',
        content: 'Which PRs are currently blocking merge in BeyondAI platform?',
        timestamp: '2026-09-21T15:44:00Z',
      },
      {
        id: 'msg-a2',
        role: 'assistant',
        content: 'Telemetry analysis shows **1 PR with requested changes** blocking deployment in `beyondAI-new-website`:\n\n- **PR #143**: *Add interactive Recharts activity stream & filter bar*\n  - Author: @sarah_dev\n  - Review Status: Changes Requested by @alex_m\n  - Reason: High DPI CSS overflow regression on Safari Mobile.',
        timestamp: '2026-09-21T15:45:00Z',
        metrics: [
          { label: 'Open PRs', value: 3, color: 'text-amber-400' },
          { label: 'Changes Requested', value: 1, color: 'text-rose-400' },
          { label: 'Approved PRs', value: 2, color: 'text-emerald-400' },
        ],
        sources: [
          { title: 'BetopiaLtd/beyondAI-new-website #143', type: 'pr', url: '/pull-requests/pr-2' },
          { title: 'PR Review Log #284', type: 'pr', url: '/pull-requests/pr-2' },
        ],
        actions: [
          { label: 'View Pull Requests', href: '/pull-requests?state=OPEN', type: 'activity' },
          { label: 'View Repository', href: '/repositories/repo-2', type: 'repository' },
        ],
      },
    ],
  },
];

export async function sendEngineeringAgentMessage(
  conversationId: string,
  userMessage: string
): Promise<{ success: boolean; data: ChatMessageItem }> {
  try {
    const res = await fetchApi<AIResponseData>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ conversationId, prompt: userMessage }),
    });

    const assistantMsg: ChatMessageItem = {
      id: res.data.messageId || `ast-${Date.now()}`,
      role: 'assistant',
      content: res.data.answer,
      timestamp: new Date().toISOString(),
    };
    return { success: true, data: assistantMsg };
  } catch (err) {
    // Isolated Mock AI response engine for frontend demonstration
    const lower = userMessage.toLowerCase();
    let replyContent = '';
    let metrics: ChatMessageItem['metrics'] = undefined;
    let sources: ChatMessageItem['sources'] = undefined;
    let actions: ChatMessageItem['actions'] = undefined;

    if (lower.includes('enosis') || lower.includes('august 16') || lower.includes('aug 16')) {
      replyContent = 'Here is the executive engineering activity summary for **Enosis Enterprise Suite (Backend)** on **August 16, 2026**:\n\nDuring this 24-hour period, 8 active engineers contributed across the Redis API gateway and authentication microservices. A total of 32 commits were merged and 4 high-priority issues were closed.';
      metrics = [
        { label: 'Commits', value: 32, color: 'text-blue-400' },
        { label: 'Pull Requests', value: 7, color: 'text-amber-400' },
        { label: 'Issues Closed', value: 4, color: 'text-purple-400' },
        { label: 'Active Developers', value: 8, color: 'text-emerald-400' },
      ];
      sources = [
        { title: 'BetopiaLtd/enosis-api-gateway', type: 'repository', url: '/repositories/repo-3' },
        { title: 'PostgreSQL Telemetry DB (commit_events)', type: 'database' },
        { title: 'GitHub Webhook Sync Engine #88', type: 'pr', url: '/pull-requests/pr-4' },
      ];
      actions = [
        { label: 'View Activity', href: '/activity?projectId=proj-2', type: 'activity' },
        { label: 'View Repository', href: '/repositories/repo-3', type: 'repository' },
        { label: 'View Developers', href: '/developers', type: 'developer' },
        { label: 'View Report', href: '/reports/rep-monthly-1', type: 'report' },
      ];
    } else if (lower.includes('developer') || lower.includes('alex') || lower.includes('sarah') || lower.includes('john')) {
      replyContent = 'Analysis of developer contributions for the current monitoring period:\n\n- **Alex Mercer (@alex_m)**: 18 Commits, 6 PRs Authored, 8 Reviews, +1,420 / -310 lines.\n- **Sarah Chen (@sarah_dev)**: 14 Commits, 5 PRs Authored, 6 Reviews, +1,100 / -180 lines.\n- **John Doe (@johndoe)**: 16 Commits, 7 PRs Authored, 5 Reviews, +850 / -300 lines.';
      metrics = [
        { label: 'Active Developers', value: 4, color: 'text-emerald-400' },
        { label: 'Total PR Reviews', value: 19, color: 'text-purple-400' },
        { label: 'Total Commits', value: 48, color: 'text-blue-400' },
      ];
      sources = [
        { title: 'Developer Activity Telemetry', type: 'developer', url: '/developers' },
        { title: 'BetopiaLtd/beyondAI-backend', type: 'repository', url: '/repositories/repo-1' },
      ];
      actions = [
        { label: 'View Developers', href: '/developers', type: 'developer' },
        { label: 'View Activity Stream', href: '/activity', type: 'activity' },
      ];
    } else if (lower.includes('report') || lower.includes('weekly') || lower.includes('monthly') || lower.includes('summary')) {
      replyContent = 'Generated automated executive report digest:\n\n**Weekly Sprint Engineering Performance (Sep W3 2026)**\n- Overall PR review cycle time improved by 34%.\n- Zero high-severity security issues open.\n- Net code velocity: +2,580 lines merged across 3 repositories.';
      metrics = [
        { label: 'Merged PRs', value: 14, color: 'text-purple-400' },
        { label: 'Closed Issues', value: 12, color: 'text-emerald-400' },
        { label: 'Code Additions', value: '+3,370', color: 'text-emerald-400' },
      ];
      sources = [
        { title: 'Weekly Executive Report Digest #rep-weekly-1', type: 'database', url: '/reports/rep-weekly-1' },
      ];
      actions = [
        { label: 'View Report', href: '/reports/rep-weekly-1', type: 'report' },
        { label: 'View Reports Hub', href: '/reports', type: 'report' },
      ];
    } else {
      replyContent = `Analyzing telemetry parameters for query: "${userMessage}"...\n\nI scanned the monitored repositories (\`beyondAI-backend\`, \`beyondAI-new-website\`, \`enosis-api-gateway\`). Telemetry data shows steady engineering activity with 48 commits, 18 PRs, and 15 reported issues in the active dataset.`;
      metrics = [
        { label: 'Monitored Repos', value: 3, color: 'text-blue-400' },
        { label: 'Active Projects', value: 2, color: 'text-amber-400' },
        { label: 'Total Commits', value: 48, color: 'text-emerald-400' },
      ];
      sources = [
        { title: 'Database Index (monitored_repositories)', type: 'database' },
        { title: 'Activity Stream Events', type: 'repository', url: '/activity' },
      ];
      actions = [
        { label: 'View Dashboard', href: '/dashboard', type: 'activity' },
        { label: 'View Repositories', href: '/repositories', type: 'repository' },
        { label: 'View Pull Requests', href: '/pull-requests', type: 'activity' },
      ];
    }

    const mockMsg: ChatMessageItem = {
      id: `ast-${Date.now()}`,
      role: 'assistant',
      content: replyContent,
      timestamp: new Date().toISOString(),
      metrics,
      sources,
      actions,
    };

    return { success: true, data: mockMsg };
  }
}
