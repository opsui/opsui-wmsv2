/**
 * GLM API Client for AI-Powered Testing
 *
 * Provides intelligent test generation, bug detection, and exploratory testing
 * capabilities powered by GLM (General Language Model).
 */

import * as crypto from 'crypto';

interface GLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GLMResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface TestScenario {
  name: string;
  description: string;
  steps: Array<{
    action: string;
    selector?: string;
    value?: any;
    expected?: any;
  }>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
}

interface BugReport {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  steps: string[];
  expected: string;
  actual: string;
  category: string;
  suggestions?: string[];
}

export class GLMClient {
  private apiKey: string;
  private baseURL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  private model = 'glm-4.7'; // GLM-4.7 model

  // Retry configuration for rate limiting
  private maxRetries = 3;
  private initialRetryDelay = 2000; // 2 seconds
  private retryBackoffMultiplier = 2;

  // Rate limiting: prevent too many concurrent requests
  private activeRequests = 0;
  private maxConcurrentRequests = 1; // Max 1 concurrent API call (very conservative)
  private requestDelay = 3000; // 3 seconds delay between requests (GLM has very strict limits)
  private lastRequestTime = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Rate limiter: wait before making next request to avoid hitting concurrent limits
   */
  private async waitForRateLimit(): Promise<void> {
    // Wait if too many concurrent requests
    while (this.activeRequests >= this.maxConcurrentRequests) {
      await this.sleep(100);
    }

    // Add delay between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.requestDelay) {
      await this.sleep(this.requestDelay - timeSinceLastRequest);
    }

    this.activeRequests++;
    this.lastRequestTime = Date.now();
  }

  /**
   * Mark request as complete
   */
  private markRequestComplete(): void {
    this.activeRequests--;
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry logic with exponential backoff for rate limiting
   */
  private async retryWithBackoff<T>(fn: () => Promise<T>, context: string): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if error is rate limit related or network timeout (case-insensitive)
        const errorMessage = (error.message || '').toLowerCase();
        const isRateLimitError =
          errorMessage.includes('rate limit') ||
          errorMessage.includes('too many requests') ||
          errorMessage.includes('429') ||
          errorMessage.includes('1302') || // GLM specific rate limit code
          errorMessage.includes('concurrent') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('econnreset') ||
          errorMessage.includes('etimedout') ||
          error.cause?.code === 'ETIMEDOUT' ||
          error.cause?.code === 'ECONNRESET';

        if (!isRateLimitError || attempt >= this.maxRetries) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = this.initialRetryDelay * Math.pow(this.retryBackoffMultiplier, attempt - 1);

        console.log(
          `  ⏳ GLM API rate limited (${context}), retry ${attempt}/${this.maxRetries} after ${delay}ms...`
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Extract JSON from a mixed response (text + JSON)
   * Improved with better error messages and fallback patterns
   */
  private extractJSON(text: string): any {
    // Find complete JSON by counting brace/bracket levels
    const startIndex = text.indexOf('{');
    const arrayIndex = text.indexOf('[');

    if (startIndex === -1 && arrayIndex === -1) {
      // Try alternative patterns - look for code blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        try {
          return JSON.parse(codeBlockMatch[1].trim());
        } catch {}
      }
      throw new Error(`No JSON found in response. Text: ${text.substring(0, 200)}...`);
    }

    // Determine if object or array comes first
    const isArray = arrayIndex !== -1 && (startIndex === -1 || arrayIndex < startIndex);
    const openChar = isArray ? '[' : '{';
    const closeChar = isArray ? ']' : '}';

    let braceLevel = 0;
    let inString = false;
    let escapeNext = false;
    let endIndex = -1;

    const startIdx = text.indexOf(openChar);
    for (let i = startIdx; i < text.length; i++) {
      const char = text[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\' && !inString) {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === openChar) {
          braceLevel++;
        } else if (char === closeChar) {
          braceLevel--;
          if (braceLevel === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    if (endIndex === -1) {
      // Fallback: try to find the largest valid JSON object
      const truncated = text.substring(startIdx, Math.min(startIdx + 5000, text.length));
      throw new Error(`Could not find complete JSON in response. Preview: ${truncated}...`);
    }

    const jsonStr = text.substring(startIdx, endIndex + 1);

    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      // Try to fix common JSON issues
      try {
        const fixed = jsonStr
          .replace(/(\w+):/g, '"$1":') // Add quotes to keys
          .replace(/'/g, '"'); // Replace single quotes

        return JSON.parse(fixed);
      } catch {
        const preview = jsonStr.length > 500 ? jsonStr.substring(0, 500) + '...' : jsonStr;
        throw new Error(`Failed to parse JSON. Preview: ${preview}. Error: ${parseError}`);
      }
    }
  }

  /**
   * Generate JWT token for GLM API authentication
   * GLM API key format: id.secret
   */
  private generateToken(): string {
    const parts = this.apiKey.split('.');
    if (parts.length !== 2) {
      // If not in id.secret format, use as-is
      return this.apiKey;
    }

    const [id, secret] = parts;

    // Create JWT header
    const header = {
      alg: 'HS256',
      sign_type: 'SIGN',
    };

    // Create JWT payload with timestamp in seconds (GLM expects seconds, not ms)
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      api_key: id,
      exp: now + 3600, // 1 hour from now (in seconds)
      timestamp: now,
    };

    // Encode header and payload (base64url)
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));

    // Create HMAC-SHA256 signature
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(dataToSign)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Return JWT format
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Base64 URL encode (replace + and / with URL-safe characters)
   */
  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Call GLM API with a conversation (with retry logic for rate limiting)
   */
  public async callGLM(messages: GLMMessage[]): Promise<string> {
    return this.retryWithBackoff(async () => {
      // Rate limit: wait before making request
      await this.waitForRateLimit();

      try {
        const token = this.generateToken();

        const requestBody = {
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
        };

        // Debug: Log the request (without full token for security)
        console.log('GLM API Request:', {
          url: this.baseURL,
          model: this.model,
          tokenPreview: token.substring(0, 50) + '...',
          messagesCount: messages.length,
        });

        const response = await fetch(this.baseURL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('GLM API Error Details:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            requestModel: this.model,
          });
          throw new Error(
            `GLM API error: ${response.status} ${response.statusText} - ${errorText}`
          );
        }

        const data = (await response.json()) as GLMResponse;

        if (!data.choices || data.choices.length === 0) {
          throw new Error('No response from GLM');
        }

        return data.choices[0].message.content;
      } finally {
        // Always mark request as complete
        this.markRequestComplete();
      }
    }, 'GLM API call');
  }

  /**
   * Analyze the WMS codebase and generate test scenarios
   * Simplified prompt to generate smaller JSON responses
   */
  async generateTestScenarios(context: {
    routes: string[];
    features: string[];
    recentChanges?: string;
  }): Promise<TestScenario[]> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Generate test scenarios for a Warehouse Management System (WMS).
Return JSON: {"scenarios":[{"name":"test","description":"what","steps":[{"action":"navigate","selector":"/path"}],"priority":"high","category":"logic"}]}
Actions: navigate, click, fill, assert. Priority: critical, high, medium, low. Category: logic, security, ui, integration.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Generate 5 focused test scenarios for:
Routes: ${context.routes.slice(0, 5).join(', ')}
Features: ${context.features.slice(0, 3).join(', ')}

Focus on: input validation, permissions, negative values, XSS attempts.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);

    // Extract JSON from response
    const parsed = this.extractJSON(response);
    return parsed.scenarios || [];
  }

  /**
   * Analyze test results and suggest next actions
   */
  async analyzeResults(context: {
    passedTests: number;
    failedTests: number;
    errors: Array<{ test: string; error: string }>;
    coverage: number;
  }): Promise<{
    summary: string;
    nextActions: string[];
    riskAreas: string[];
    recommendations: string[];
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `You are a test strategist analyzing WMS test results.
Provide actionable insights and recommendations.

Return JSON:
{
  "summary": "brief summary of test health",
  "nextActions": ["action1", "action2"],
  "riskAreas": ["area1", "area2"],
  "recommendations": ["rec1", "rec2"]
}`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Analyze these test results:

Passed: ${context.passedTests}
Failed: ${context.failedTests}
Coverage: ${context.coverage}%

Errors:
${context.errors.map(e => `- ${e.test}: ${e.error}`).join('\n')}

What should we test next? Where are the risk areas?`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * Generate a bug report from test findings
   */
  async generateBugReport(context: {
    testName: string;
    expectedBehavior: string;
    actualBehavior: string;
    steps: string[];
    screenshot?: string;
    pageContent?: string;
  }): Promise<BugReport> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `You are a QA analyst generating bug reports.
Create clear, actionable bug reports that developers can fix quickly.

Return JSON:
{
  "severity": "critical|high|medium|low",
  "title": "concise bug title",
  "description": "detailed description",
  "steps": ["step1", "step2"],
  "expected": "what should happen",
  "actual": "what actually happens",
  "category": "security|performance|logic|ui|integration",
  "suggestions": ["fix1", "fix2"]
}

Severity guidelines:
- Critical: Data loss, security breach, complete feature failure
- High: Major feature broken, workarounds available
- Medium: Minor bugs, edge cases
- Low: UI issues, nice-to-have fixes`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Generate a bug report for:

Test: ${context.testName}
Expected: ${context.expectedBehavior}
Actual: ${context.actualBehavior}

Steps:
${context.steps.join('\n')}

${context.pageContent ? `Page content:\n${context.pageContent.substring(0, 1000)}` : ''}`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * Suggest exploratory testing paths based on current state
   */
  async suggestExploration(currentState: {
    currentPage: string;
    visibleElements: string[];
    userRole: string;
    previousTests?: string[];
  }): Promise<{
    paths: Array<{
      description: string;
      steps: Array<{ action: string; target: string; reason: string }>;
      expectedFindings: string;
    }>;
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `You are an exploratory tester finding bugs in a WMS.
Suggest intelligent exploration paths that would reveal bugs.

Return JSON:
{
  "paths": [
    {
      "description": "what we're exploring",
      "steps": [
        {"action": "click|navigate|fill|wait", "target": "element/selector", "reason": "why this matters"}
      ],
      "expectedFindings": "what bugs we might find"
    }
  ]
}

Think like a hacker trying to break the system.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Current state:
- Page: ${currentState.currentPage}
- Role: ${currentState.userRole}
- Visible elements: ${currentState.visibleElements.slice(0, 20).join(', ')}
${currentState.previousTests ? `- Previous tests: ${currentState.previousTests.join(', ')}` : ''}

Suggest 5 exploratory paths that would find bugs.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * Analyze code/page for security vulnerabilities
   */
  async analyzeSecurity(context: {
    pageContent: string;
    forms: Array<{ action: string; fields: string[] }>;
    apiEndpoints?: string[];
  }): Promise<{
    vulnerabilities: Array<{
      type: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      exploit: string;
      fix: string;
    }>;
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `You are a security expert auditing a WMS application.
Find security vulnerabilities that could be exploited.

Return JSON:
{
  "vulnerabilities": [
    {
      "type": "XSS|SQL Injection|CSRF|Authentication|Authorization|Other",
      "severity": "critical|high|medium|low",
      "description": "detailed description",
      "exploit": "how to exploit it",
      "fix": "how to fix it"
    }
  ]
}

Look for:
- XSS vectors in input fields
- SQL injection possibilities
- Authentication/authorization flaws
- CSRF vulnerabilities
- Sensitive data exposure
- Input validation bypasses`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Analyze for security vulnerabilities:

Forms:
${context.forms.map(f => `- Action: ${f.action}, Fields: ${f.fields.join(', ')}`).join('\n')}

${context.apiEndpoints ? `API Endpoints:\n${context.apiEndpoints.join('\n')}` : ''}

Page content (first 2000 chars):
${context.pageContent.substring(0, 2000)}`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * Generate test data for edge cases
   */
  async generateTestData(fieldType: {
    fieldName: string;
    fieldType: string;
    constraints?: string[];
    context?: string;
  }): Promise<{
    normal: any[];
    edge: any[];
    malicious: any[];
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `You are generating test data for WMS testing.
Generate comprehensive test data including normal, edge case, and malicious inputs.

Return JSON:
{
  "normal": [value1, value2],
  "edge": [edgeValue1, edgeValue2],
  "malicious": [maliciousValue1, maliciousValue2]
}

Field types: text, number, email, date, select, checkbox, textarea, url, tel`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Generate test data for:
- Field: ${fieldType.fieldName}
- Type: ${fieldType.fieldType}
${fieldType.constraints ? `- Constraints: ${fieldType.constraints.join(', ')}` : ''}
${fieldType.context ? `- Context: ${fieldType.context}` : ''}

Provide 5-10 values for each category.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * Analyze page content and prioritize high-value test targets
   * Returns which elements are most important to test based on business impact
   */
  async analyzePageAndPrioritize(pageInfo: {
    route: string;
    routeName: string;
    visibleElements: string[];
    forms: Array<{ fields: string[]; actions: string[] }>;
    pageType: string;
  }): Promise<{
    highPriorityTargets: Array<{
      element: string;
      selector: string;
      reason: string;
      riskLevel: 'critical' | 'high' | 'medium';
      suggestedTests: string[];
    }>;
    businessRules: Array<{
      rule: string;
      testStrategy: string;
    }>;
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Analyze WMS page and identify high-value test targets.
Return JSON: {"highPriorityTargets":[{"element":"button text","selector":"css selector","reason":"why important","riskLevel":"critical","suggestedTests":["test1"]}],"businessRules":[{"rule":"inferred rule","testStrategy":"how to test"}]}
Risk levels: critical (data loss, security), high (business logic), medium (validation).
Focus on: data modification, permissions, financial impact, state changes.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Analyze this WMS page:
Route: ${pageInfo.route} (${pageInfo.routeName})
Type: ${pageInfo.pageType}
Elements: ${pageInfo.visibleElements.slice(0, 15).join(', ')}
Forms: ${pageInfo.forms.map(f => `Fields: ${f.fields.join(', ')}`).join('; ')}

Identify 3-5 highest priority targets to test.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * Detect business rules from UI patterns and constraints
   * Helps generate tests for business logic validation
   */
  async detectBusinessRules(pageInfo: {
    routeName: string;
    inputFields: Array<{ name: string; type: string; attributes: string[] }>;
    buttons: string[];
    textContent: string;
  }): Promise<{
    rules: Array<{
      rule: string;
      field: string;
      constraint: string;
      testCases: Array<{ input: any; expected: string }>;
    }>;
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Detect business rules from WMS UI patterns.
Return JSON: {"rules":[{"rule":"description","field":"field name","constraint":"constraint type","testCases":[{"input":"test value","expected":"expected result"}]}]}
Rule types: quantity limits, permission boundaries, status transitions, validation rules.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Detect business rules on ${pageInfo.routeName}:
Inputs: ${pageInfo.inputFields.map(f => `${f.name} (${f.type})`).join(', ')}
Buttons: ${pageInfo.buttons.join(', ')}
Content: ${pageInfo.textContent.substring(0, 500)}

Identify 3-5 business rules to test.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * Generate adaptive follow-up tests based on previous failures
   * Learns from what went wrong and generates targeted tests
   */
  async generateAdaptiveTests(context: {
    failure: {
      type: string;
      message: string;
      element: string;
    };
    pageInfo: {
      route: string;
      routeName: string;
    };
  }): Promise<{
    followUpTests: Array<{
      description: string;
      steps: Array<{ action: string; target: string; value?: any }>;
      expectedToFind: string;
    }>;
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Generate follow-up tests based on test failures.
Return JSON: {"followUpTests":[{"description":"test description","steps":[{"action":"navigate|click|fill","target":"selector","value":"value"}],"expectedToFind":"what bug to find"}]}
Learn from failure and generate targeted tests.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Generate follow-up tests for:
Failure: ${context.failure.type} - ${context.failure.message}
Element: ${context.failure.element}
Page: ${context.pageInfo.route} (${context.pageInfo.routeName})

Generate 3 follow-up tests that would expose related bugs.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * Infer workflows from page structure and navigation
   * Discovers complete user workflows that span multiple pages
   */
  async inferWorkflows(pageInfo: {
    currentRoute: string;
    routeName: string;
    navigationLinks: string[];
    actionButtons: string[];
  }): Promise<{
    workflows: Array<{
      name: string;
      description: string;
      steps: Array<{ route: string; action: string; target: string }>;
      riskAreas: string[];
    }>;
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Infer WMS workflows from page structure.
Return JSON: {"workflows":[{"name":"workflow name","description":"what it does","steps":[{"route":"/path","action":"navigate/click/fill","target":"element"}],"riskAreas":["risk1","risk2"]}]}
Focus on: order processing, stock management, user workflows.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Infer workflows from:
Current: ${pageInfo.currentRoute} (${pageInfo.routeName})
Nav links: ${pageInfo.navigationLinks.join(', ')}
Actions: ${pageInfo.actionButtons.join(', ')}

Identify 2-3 complete workflows to test.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  // ============================================================================
  // ADVANCED AI TESTING FEATURES (10 Features)
  // ============================================================================

  /**
   * 1. SELF-HEALING: Heal broken selectors using AI
   */
  async healSelectorWithAI(context: {
    brokenSelector: string;
    context: string;
    availableElements: Array<{
      tag: string;
      text: string;
      id: string;
      className: string;
      role: string;
      dataTest: string;
      ariaLabel: string;
    }>;
    currentPage: string;
  }): Promise<{
    suggestedSelector: string;
    confidence: number;
    reasoning: string;
    alternatives: string[];
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `You are a selector healing expert. Find the best replacement for a broken selector.
Return JSON: {"suggestedSelector":"css selector","confidence":0.9,"reasoning":"why","alternatives":["alt1","alt2"]}
Strategies: data-testid, aria-label, text content, role+text, nearby elements.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Heal this broken selector:
Original: ${context.brokenSelector}
Context: ${context.context}
Page: ${context.currentPage}

Available elements:
${context.availableElements.map((e, i) => `${i}. ${e.tag} - text:"${e.text.slice(0, 20)}" id:${e.id} class:${e.className.slice(0, 20)} data-test:${e.dataTest} aria-label:${e.ariaLabel}`).join('\n')}

Suggest the best replacement selector.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * 2. CHANGE-BASED PRIORITIZATION: Analyze code changes and test impact
   */
  async analyzeChangeImpact(context: {
    changes: string[];
    languages: string[];
    features: string[];
    availableTests: Array<{ name: string; coverage: string[] }>;
  }): Promise<{
    riskScore: number;
    summary: string;
    impactedTests: Array<{
      testName: string;
      impactLevel: 'critical' | 'high' | 'medium' | 'low';
      affectedFeatures: string[];
      reason: string;
    }>;
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Analyze code changes and determine which tests need to run.
Return JSON: {"riskScore":85,"summary":"brief summary","impactedTests":[{"testName":"test name","impactLevel":"critical","affectedFeatures":["feat1"],"reason":"why"}]}
Risk: critical (data loss, security), high (business logic), medium (validation), low (UI).`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Analyze these code changes:
Changes: ${context.changes.join(', ')}
Languages: ${context.languages.join(', ')}
Features: ${context.features.join(', ')}

Available tests:
${context.availableTests.map(t => `- ${t.name} covers: ${t.coverage.join(', ')}`).join('\n')}

Prioritize affected tests.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * 3. AI-GENERATED TESTS FROM CODE: Read code and generate tests
   */
  async generateTestsFromCode(context: {
    filePath: string;
    codeContent: string;
    language: string;
    functionName?: string;
  }): Promise<{
    tests: Array<{
      name: string;
      description: string;
      testCode: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
    }>;
    coverage: string[];
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Generate comprehensive tests from source code.
Return JSON: {"tests":[{"name":"test name","description":"what it tests","testCode":"full test code","priority":"high"}],"coverage":["feature1","feature2"]}
Include: happy path, edge cases, error handling, input validation.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Generate tests for:
File: ${context.filePath}
Language: ${context.language}
${context.functionName ? `Function: ${context.functionName}` : ''}

Code:
${context.codeContent.substring(0, 3000)}

Generate 3-5 comprehensive tests.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * 4. ROOT CAUSE ANALYSIS: Analyze failures and suggest fixes
   */
  async analyzeRootCause(context: {
    testName: string;
    errorMessage: string;
    stackTrace?: string;
    codeSnippet?: string;
    testCode?: string;
    pageContent?: string;
  }): Promise<{
    rootCause: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    suggestedFix: string;
    fixedCode?: string;
    relatedTests: string[];
    prevention: string;
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Analyze test failures and provide root cause analysis.
Return JSON: {"rootCause":"description","severity":"high","suggestedFix":"what to do","fixedCode":"optional","relatedTests":["test1","test2"],"prevention":"how to prevent"}
Consider: timing issues, selector changes, async problems, data state, API changes.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Analyze this test failure:
Test: ${context.testName}
Error: ${context.errorMessage}
${context.stackTrace ? `Stack: ${context.stackTrace.substring(0, 500)}` : ''}
${context.codeSnippet ? `Code: ${context.codeSnippet.substring(0, 500)}` : ''}
${context.testCode ? `Test code: ${context.testCode.substring(0, 500)}` : ''}

Identify root cause and suggest fix.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * 5. PRODUCTION LOG ANALYSIS: Generate tests from real usage
   */
  async analyzeProductionLogs(context: {
    logEntries: Array<{
      timestamp: string;
      level: string;
      message: string;
      userId?: string;
      route?: string;
      error?: string;
    }>;
    timeframe: string;
  }): Promise<{
    criticalIssues: Array<{
      issue: string;
      frequency: number;
      affectedUsers: number;
      suggestedTests: Array<{
        name: string;
        steps: string[];
        expectedBehavior: string;
      }>;
    }>;
    edgeCases: Array<{
      scenario: string;
      testDescription: string;
    }>;
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Analyze production logs and generate tests for real-world scenarios.
Return JSON: {"criticalIssues":[{"issue":"description","frequency":10,"affectedUsers":5,"suggestedTests":[{"name":"test","steps":["step1"],"expectedBehavior":"should work"}]}],"edgeCases":[{"scenario":"edge case","testDescription":"test desc"}]}
Focus on: errors, failures, unusual patterns, edge cases.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Analyze production logs:
Timeframe: ${context.timeframe}
Entries: ${context.logEntries.length}
Errors: ${context.logEntries.filter(l => l.error).length}

Sample logs:
${context.logEntries
  .slice(0, 20)
  .map(l => `${l.timestamp} [${l.level}] ${l.message}${l.error ? ' Error: ' + l.error : ''}`)
  .join('\n')}

Generate tests for critical issues.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * 6. NATURAL LANGUAGE TO TESTS: Convert plain English to tests
   */
  async convertNaturalLanguageToTest(context: {
    description: string;
    applicationType: string;
    availableRoutes?: string[];
  }): Promise<{
    testCases: Array<{
      name: string;
      description: string;
      steps: Array<{
        action: 'navigate' | 'click' | 'fill' | 'select' | 'wait' | 'assert';
        selector?: string;
        value?: string;
        description: string;
      }>;
      expectedResult: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
    }>;
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Convert natural language test descriptions to executable test cases.
Return JSON: {"testCases":[{"name":"test name","description":"what it tests","steps":[{"action":"navigate|click|fill|select|wait|assert","selector":"css","value":"val","description":"what"}],"expectedResult":"what should happen","priority":"high"}]}
Actions: navigate (to route), click (element), fill (input with value), select (dropdown option), wait (for element), assert (verify something).`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Convert this to test cases:
Application: ${context.applicationType}
Description: ${context.description}
${context.availableRoutes ? `Available routes: ${context.availableRoutes.join(', ')}` : ''}

Generate detailed test steps.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * 7. VISUAL AI REGRESSION: Analyze visual differences
   */
  async compareVisuals(context: {
    baselineDescription: string;
    currentDescription: string;
    pageRoute: string;
    screenshotText?: string;
  }): Promise<{
    hasRegression: boolean;
    differences: Array<{
      type: 'layout' | 'content' | 'style' | 'missing' | 'unexpected';
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      baselineElement: string;
      currentElement: string;
    }>;
    confidence: number;
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Compare visual states and identify regressions.
Return JSON: {"hasRegression":true,"differences":[{"type":"layout|content|style|missing|unexpected","severity":"critical","description":"what changed","baselineElement":"was here","currentElement":"now here"}],"confidence":0.9}
Check: missing elements, layout shifts, style changes, content changes.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Compare visual states:
Route: ${context.pageRoute}

Baseline:
${context.baselineDescription}

Current:
${context.currentDescription}

${context.screenshotText ? `Screenshot text: ${context.screenshotText.substring(0, 500)}` : ''}

Identify visual regressions.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * 8. INTELLIGENT TEST ORCHESTRATION: Optimize test execution
   */
  async optimizeTestExecution(context: {
    tests: Array<{
      name: string;
      duration: number;
      dependencies?: string[];
      priority: 'critical' | 'high' | 'medium' | 'low';
      stability: number; // 0-1 pass rate
    }>;
    availableTime?: number;
    parallelCapacity?: number;
  }): Promise<{
    executionPlan: {
      sequential: Array<{ test: string; order: number }>;
      parallel: Array<{ tests: string[]; order: number }>;
      skipped: string[];
    };
    estimatedDuration: number;
    coverage: number;
    reasoning: string;
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Optimize test execution plan for fastest feedback.
Return JSON: {"executionPlan":{"sequential":[{"test":"name","order":1}],"parallel":[{"tests":["test1","test2"],"order":1}],"skipped":["test3"]},"estimatedDuration":300,"coverage":95,"reasoning":"why"}
Prioritize: critical tests, unstable tests first, independent tests in parallel.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Optimize test execution:
Tests: ${context.tests.length}
${context.availableTime ? `Time limit: ${context.availableTime}s` : 'No time limit'}
${context.parallelCapacity ? `Parallel capacity: ${context.parallelCapacity}` : 'Full parallelism'}

Tests:
${context.tests.map(t => `- ${t.name} (${t.duration}s, priority:${t.priority}, stability:${t.stability}, deps:${t.dependencies?.join(',') || 'none'})`).join('\n')}

Create optimal execution plan.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * 9. CONTINUOUS LEARNING: Build app-specific model
   */
  async generateApplicationModel(context: {
    route: string;
    routeName: string;
    elements: Array<{
      selector: string;
      type: string;
      text: string;
      behavior: string;
      dependencies: string[];
    }>;
    patterns: Array<{
      pattern: string;
      frequency: number;
      reliability: number;
    }>;
  }): Promise<{
    model: {
      routeSignatures: Map<string, string[]>;
      elementBehaviors: Map<string, string>;
      commonPatterns: string[];
      antiPatterns: string[];
    };
    recommendations: string[];
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Build application-specific testing model from observations.
Return JSON: {"model":{"routeSignatures":{},"elementBehaviors":{},"commonPatterns":[],"antiPatterns":[]},"recommendations":["rec1","rec2"]}
Learn: element patterns, route structures, common behaviors, anti-patterns to avoid.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Build model for ${context.routeName} (${context.route}):
Elements: ${context.elements.map(e => `${e.type}:${e.text.slice(0, 20)} -> ${e.behavior}`).join(', ')}
Patterns: ${context.patterns.map(p => `${p.pattern} (freq:${p.frequency}, rel:${p.reliability})`).join(', ')}

Extract learning for future tests.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }

  /**
   * 10. SMART TEST DATA FACTORIES: Generate realistic production data
   */
  async generateProductionTestData(context: {
    entityType: string;
    fieldSpecs: Array<{
      name: string;
      type: string;
      constraints?: string[];
      required: boolean;
    }>;
    relationships?: Array<{
      field: string;
      relatedEntity: string;
    }>;
    scenario?: 'happy' | 'edge' | 'stress' | 'security';
  }): Promise<{
    testData: any[];
    variations: string[];
    validationRules: Array<{
      field: string;
      rule: string;
      testValue: any;
    }>;
  }> {
    const systemPrompt: GLMMessage = {
      role: 'system',
      content: `Generate realistic test data matching production patterns.
Return JSON: {"testData":[{"field1":"value1","field2":"value2"}],"variations":["variation1","variation2"],"validationRules":[{"field":"field1","rule":"constraint","testValue":"value"}]}
Make data realistic, not obviously fake. Respect constraints and relationships.`,
    };

    const userPrompt: GLMMessage = {
      role: 'user',
      content: `Generate test data for ${context.entityType}:
Scenario: ${context.scenario || 'happy'}
Fields: ${context.fieldSpecs.map(f => `${f.name}:${f.type}${f.required ? '(required)' : ''} [${f.constraints?.join(',') || 'none'}]`).join(', ')}
${context.relationships ? `Relationships: ${context.relationships.map(r => `${r.field} -> ${r.relatedEntity}`).join(', ')}` : ''}

Generate 5-10 realistic records.`,
    };

    const response = await this.callGLM([systemPrompt, userPrompt]);
    return this.extractJSON(response);
  }
}

export default GLMClient;
