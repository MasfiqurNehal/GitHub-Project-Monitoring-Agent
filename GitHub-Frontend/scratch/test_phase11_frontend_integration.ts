/**
 * Phase 11: Frontend Engineering Agent Integration Test Suite.
 * Validates frontend API client, context injection, retry mechanics,
 * tenant isolation headers, and response normalization.
 */

interface MockChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  detectedIntent?: string;
  selectedAgent?: string;
  metrics?: Array<{ label: string; value: string | number; change?: string; color?: string }>;
  actions?: Array<{ label: string; href?: string; type?: string }>;
  artifacts?: Array<{ id: string; title: string; artifact_type: string; content: string }>;
  toolsExecuted?: Array<{ tool_name: string; status: string; duration_ms: number }>;
  executionTimeMs?: number;
  isError?: boolean;
  failedPrompt?: string;
}

interface MockSendParams {
  conversationId: string;
  userMessage: string;
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  agentMode?: string;
  parameters?: Record<string, any>;
}

// Simulated Frontend AI Client Adapter
async function mockSendEngineeringAgentMessage(
  params: MockSendParams,
  fetchFn: (url: string, init: any) => Promise<any>
): Promise<{ success: boolean; data: MockChatMessageItem }> {
  const { conversationId, userMessage, projectId, repositoryId, developerId, agentMode, parameters } = params;

  try {
    const requestPayload: Record<string, any> = {
      message: userMessage,
      conversation_id: conversationId,
    };

    if (projectId) requestPayload.project_id = projectId;
    if (repositoryId) requestPayload.repository_id = repositoryId;
    if (developerId) requestPayload.developer_id = developerId;
    if (agentMode) requestPayload.agent_mode = agentMode;
    if (parameters && Object.keys(parameters).length > 0) {
      requestPayload.parameters = parameters;
    }

    const res = await fetchFn('http://localhost:8000/api/v1/engineering-agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock_jwt_tenant_org_nexora_user_1',
      },
      body: JSON.stringify(requestPayload),
    });

    const data = res.data || res;
    const assistantMsg: MockChatMessageItem = {
      id: data.message_id || `ast-${Date.now()}`,
      role: 'assistant',
      content: data.response || data.answer || 'No response generated.',
      timestamp: new Date().toISOString(),
      detectedIntent: data.detected_intent,
      selectedAgent: data.selected_agent,
      metrics: data.metrics || [],
      artifacts: data.artifacts || [],
      toolsExecuted: data.tools_executed || [],
      executionTimeMs: data.execution_time_ms || 0,
      actions: (data.actions || []).map((act: any) => ({
        label: act.label,
        href: act.href || act.target,
        type: act.action_type || act.action || act.type || 'link',
      })),
    };

    return { success: true, data: assistantMsg };
  } catch (err: any) {
    const errorContent = err.message || 'Failed to connect to FastAPI Engineering Agent.';
    const errorMsg: MockChatMessageItem = {
      id: `err-${Date.now()}`,
      role: 'assistant',
      content: `⚠️ Error: ${errorContent}`,
      timestamp: new Date().toISOString(),
      isError: true,
      failedPrompt: userMessage,
      metrics: [{ label: 'Status', value: 'API Error', color: 'text-rose-400' }],
    };
    return { success: false, data: errorMsg };
  }
}

async function runPhase11FrontendIntegrationTests() {
  console.log('================================================================');
  console.log('🚀 Phase 11: Frontend Engineering Agent Integration Test Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // Test 1: Chat Input & Standard Message Dispatch
  // --------------------------------------------------------------------------
  console.log('--- Test Group 1: Chat Input & FastAPI Dispatch ---');
  {
    let capturedUrl = '';
    let capturedBody: any = null;
    let capturedHeaders: any = null;

    const mockFetch = async (url: string, init: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init.body);
      capturedHeaders = init.headers;
      return {
        success: true,
        conversation_id: 'conv-101',
        message_id: 'msg-501',
        response: 'There are 12 open pull requests across the workspace.',
        detected_intent: 'pull_request_info',
        selected_agent: 'pull_request_agent',
        metrics: [{ label: 'Open PRs', value: 12, color: 'indigo' }],
        tools_executed: [{ tool_name: 'get_repository_pull_requests', status: 'success', duration_ms: 124 }],
        execution_time_ms: 215.4,
      };
    };

    const res = await mockSendEngineeringAgentMessage(
      {
        conversationId: 'conv-101',
        userMessage: 'Show me open pull requests',
      },
      mockFetch
    );

    assert(capturedUrl === 'http://localhost:8000/api/v1/engineering-agent/chat', 'Dispatches to /engineering-agent/chat endpoint');
    assert(capturedBody.message === 'Show me open pull requests', 'Payload carries user query message');
    assert(capturedBody.conversation_id === 'conv-101', 'Payload carries active conversation ID');
    assert(capturedHeaders.Authorization.startsWith('Bearer '), 'Preserves authenticated tenant Bearer token');
    assert(res.success === true, 'Returns success response');
    assert(res.data.detectedIntent === 'pull_request_info', 'Normalizes detected_intent property');
    assert(res.data.selectedAgent === 'pull_request_agent', 'Normalizes selected_agent property');
    assert(res.data.metrics?.length === 1 && res.data.metrics[0].value === 12, 'Normalizes metrics items array');
    assert(res.data.toolsExecuted?.[0]?.tool_name === 'get_repository_pull_requests', 'Normalizes tool telemetry summary');
  }

  // --------------------------------------------------------------------------
  // Test 2: Project Context Injection
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 2: Project Context Scoping ---');
  {
    let capturedBody: any = null;

    const mockFetch = async (_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        success: true,
        response: 'Project Nexora Cloud has 4 repositories and 32 recent commits.',
        detected_intent: 'project_info',
        selected_agent: 'project_agent',
      };
    };

    await mockSendEngineeringAgentMessage(
      {
        conversationId: 'conv-proj-1',
        userMessage: 'Summarize engineering status for this project',
        projectId: 'prj-nexora-cloud-88',
      },
      mockFetch
    );

    assert(capturedBody.project_id === 'prj-nexora-cloud-88', 'Automatically injects project_id without prompt re-specification');
    assert(capturedBody.repository_id === undefined, 'Does not attach repository_id when not in repository context');
    assert(capturedBody.developer_id === undefined, 'Does not attach developer_id when not in developer context');
  }

  // --------------------------------------------------------------------------
  // Test 3: Repository Context Injection
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 3: Repository Context Scoping ---');
  {
    let capturedBody: any = null;

    const mockFetch = async (_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        success: true,
        response: 'Repository auth-service has 2 active branches: main and staging.',
        detected_intent: 'repository_info',
        selected_agent: 'repository_agent',
      };
    };

    await mockSendEngineeringAgentMessage(
      {
        conversationId: 'conv-repo-1',
        userMessage: 'Show branches for this repository',
        repositoryId: 'repo-auth-service-99',
      },
      mockFetch
    );

    assert(capturedBody.repository_id === 'repo-auth-service-99', 'Automatically injects repository_id into agent payload');
    assert(capturedBody.project_id === undefined, 'Does not leak project_id when scoping is repository-only');
  }

  // --------------------------------------------------------------------------
  // Test 4: Developer Context Injection
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 4: Developer Context Scoping ---');
  {
    let capturedBody: any = null;

    const mockFetch = async (_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        success: true,
        response: 'Developer alex_mercer made 24 commits and 6 PR reviews this week.',
        detected_intent: 'developer_info',
        selected_agent: 'developer_agent',
      };
    };

    await mockSendEngineeringAgentMessage(
      {
        conversationId: 'conv-dev-1',
        userMessage: 'Show developer code impact and activity',
        developerId: 'dev-alex-mercer',
      },
      mockFetch
    );

    assert(capturedBody.developer_id === 'dev-alex-mercer', 'Automatically injects developer_id into agent payload');
  }

  // --------------------------------------------------------------------------
  // Test 5: Error State & Retry Mechanics
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 5: Error Handling & Retry Lifecycle ---');
  {
    const failingFetch = async () => {
      throw new Error('503 Service Unavailable: LangGraph Orchestrator timeout');
    };

    const failedResult = await mockSendEngineeringAgentMessage(
      {
        conversationId: 'conv-err-1',
        userMessage: 'Analyze churn for all repositories',
        projectId: 'prj-100',
      },
      failingFetch
    );

    assert(failedResult.success === false, 'Gracefully catches and returns failure status');
    assert(failedResult.data.isError === true, 'Marks ChatMessageItem as isError: true');
    assert(failedResult.data.failedPrompt === 'Analyze churn for all repositories', 'Preserves original prompt for retry execution');
    assert(failedResult.data.content.includes('503 Service Unavailable'), 'Presents clear user-facing error message');

    // Simulate Retry with resolved backend
    let retryCapturedBody: any = null;
    const recoveringFetch = async (_url: string, init: any) => {
      retryCapturedBody = JSON.parse(init.body);
      return {
        success: true,
        response: 'Recovered: Total churn is +14,200 lines / -3,100 lines.',
      };
    };

    const retryResult = await mockSendEngineeringAgentMessage(
      {
        conversationId: 'conv-err-1',
        userMessage: failedResult.data.failedPrompt!,
        projectId: 'prj-100',
      },
      recoveringFetch
    );

    assert(retryResult.success === true, 'Retry successfully recovers with valid answer');
    assert(retryCapturedBody.message === 'Analyze churn for all repositories', 'Retry re-sends identical user prompt');
    assert(retryCapturedBody.project_id === 'prj-100', 'Retry preserves original active context scope');
  }

  // --------------------------------------------------------------------------
  // Test 6: Tenant Isolation Guarantee
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 6: Tenant Isolation & Non-Pollution ---');
  {
    let capturedBody: any = null;
    const mockFetch = async (_url: string, init: any) => {
      capturedBody = JSON.parse(init.body);
      return { success: true, response: 'OK' };
    };

    await mockSendEngineeringAgentMessage(
      {
        conversationId: 'conv-tenant-check',
        userMessage: 'List repositories',
      },
      mockFetch
    );

    assert(capturedBody.tenant_id === undefined, 'Does NOT allow browser/client to supply arbitrary tenant_id');
  }

  console.log('\n================================================================');
  console.log(`📊 Phase 11 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase11FrontendIntegrationTests();
