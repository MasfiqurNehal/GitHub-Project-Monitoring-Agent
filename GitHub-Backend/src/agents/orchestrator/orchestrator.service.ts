import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config/index.js';
import { prisma } from '../../db/prisma.js';
import { agentTools } from '../tools/index.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class OrchestratorService {
  private ai: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.geminiApiKey) {
      try {
        this.ai = new GoogleGenerativeAI(config.geminiApiKey);
      } catch (e: any) {
        console.warn('[Orchestrator] Gemini SDK initialization warning:', e.message);
      }
    }
  }

  /**
   * Main multi-agent process message handler
   */
  async processUserMessage(conversationId: string, userMessage: string) {
    // 1. Fetch conversation history
    const conversation = await prisma.aIConversation.upsert({
      where: { id: conversationId },
      update: { updatedAt: new Date() },
      create: { id: conversationId, title: userMessage.slice(0, 40) },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });

    // Save user message
    await prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: userMessage,
      },
    });

    // 2. Fetch context facts from tools
    const [overview, projects, signals] = await Promise.all([
      agentTools.getDashboardOverview({}),
      agentTools.getProjectsAndRepositories(),
      agentTools.getEngineeringSignals(),
    ]);

    const contextFactSummary = {
      dashboardKPI: overview.kpi,
      projects: projects.map((p) => ({ name: p.name, repos: p.repositories.map((r) => r.fullName) })),
      signals: {
        inactiveRepositoriesCount: signals.inactiveRepositories.length,
        stalePullRequestsCount: signals.stalePullRequests.length,
      },
    };

    let answerText = '';
    let uiActions: any[] = [];

    // Check if query is requesting dashboard filter adjustment
    const lowerMsg = userMessage.toLowerCase();
    if (lowerMsg.includes('show') || lowerMsg.includes('filter')) {
      const matchedProject = projects.find((p) => lowerMsg.includes(p.name.toLowerCase()));
      if (matchedProject) {
        uiActions.push({
          type: 'APPLY_FILTERS',
          projectId: matchedProject.id,
          projectName: matchedProject.name,
        });
      }
    }

    if (this.ai) {
      try {
        const prompt = `You are the GitHub Project Monitoring AI Agent Orchestrator for executive CTO management.
You must answer questions strictly based on empirical engineering metrics and facts provided below.
Never hallucinate numbers, write commits, or push code. Enforce read-only behavior.

Factual Context:
${JSON.stringify(contextFactSummary, null, 2)}

User Question: "${userMessage}"

Provide a concise, professional executive answer in markdown format. Highlight key metrics and findings.`;

        const model = this.ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const response = await model.generateContent(prompt);
        answerText = response.response.text() || 'Unable to generate response.';
      } catch (err: any) {
        console.warn('[Orchestrator] Gemini API call error:', err.message);
        answerText = this.buildFallbackResponse(userMessage, contextFactSummary);
      }
    } else {
      answerText = this.buildFallbackResponse(userMessage, contextFactSummary);
    }

    // Save assistant message
    const assistantMessage = await prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: answerText,
        metadataJson: { uiActions },
      },
    });

    return {
      messageId: assistantMessage.id,
      conversationId,
      answer: answerText,
      uiActions,
      contextSummary: contextFactSummary,
    };
  }

  private buildFallbackResponse(userMessage: string, facts: any): string {
    const kpi = facts.dashboardKPI;
    return `### Engineering Summary

Here is the current operational activity snapshot across all connected repositories:

- **Total Monitored Projects:** ${kpi.totalProjects}
- **Connected Repositories:** ${kpi.totalRepositories}
- **Total Commits:** ${kpi.totalCommits} (${kpi.linesAdded} lines added / ${kpi.linesDeleted} lines deleted)
- **Pull Requests:** ${kpi.totalPRs} total (${kpi.mergedPRs} merged, ${kpi.openPRs} open)
- **Active Developers:** ${kpi.activeDevelopers}
- **Attention Signals:** ${facts.signals.inactiveRepositoriesCount} inactive repos, ${facts.signals.stalePullRequestsCount} stale PRs (>7 days old).

*(Note: To enable live conversational reasoning, ensure GEMINI_API_KEY is configured in .env)*`;
  }
}

export const orchestratorService = new OrchestratorService();
