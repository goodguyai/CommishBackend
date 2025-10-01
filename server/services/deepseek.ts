import OpenAI from "openai";

export interface DeepSeekFunction {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant" | "function";
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      function_call?: {
        name: string;
        arguments: string;
      };
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class DeepSeekService {
  private client: OpenAI;
  private readonly model = "deepseek-chat";
  private readonly maxTokens: number;
  private readonly timeout: number;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || "default_key",
      baseURL: "https://api.deepseek.com",
    });
    this.maxTokens = parseInt(process.env.DEEPSEEK_MAX_TOKENS || "1000");
    this.timeout = parseInt(process.env.DEEPSEEK_TIMEOUT_MS || "30000");
  }

  private getToneInstruction(tone?: string): string {
    const toneMap: Record<string, string> = {
      professional: "- Use a helpful, authoritative tone. Be formal and professional.",
      casual: "- Use a friendly, conversational tone. Keep it light and approachable.",
      funny: "- Use humor and personality. Be entertaining while staying informative. Include sports jokes and playful banter.",
      savage: "- Use sharp wit and playful trash talk. Be bold and entertaining, but keep answers accurate.",
      neutral: "- Use a balanced, informative tone. Be clear and straightforward."
    };

    return toneMap[tone || 'professional'] || toneMap.professional;
  }

  async chatCompletion(
    messages: DeepSeekMessage[],
    functions?: DeepSeekFunction[],
    maxTokens?: number
  ): Promise<DeepSeekResponse> {
    const requestStart = Date.now();

    try {
      const requestConfig: any = {
        model: this.model,
        messages,
        max_tokens: maxTokens || this.maxTokens,
        temperature: 0.7,
        top_p: 0.9,
      };

      if (functions && functions.length > 0) {
        requestConfig.functions = functions;
        requestConfig.function_call = "auto";
      }

      const response = await Promise.race([
        this.client.chat.completions.create(requestConfig),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("DeepSeek request timeout")), this.timeout)
        ),
      ]) as any;

      const latency = Date.now() - requestStart;
      
      console.log(`DeepSeek request completed in ${latency}ms, tokens: ${response.usage?.total_tokens || 0}`);

      return response;
    } catch (error) {
      const latency = Date.now() - requestStart;
      console.error(`DeepSeek request failed after ${latency}ms:`, error);
      throw error;
    }
  }

  async answerRulesQuery(
    query: string,
    relevantRules: Array<{ text: string; citations: any[]; ruleKey: string }>,
    leagueContext?: any,
    tone?: string
  ): Promise<{ answer: string; citations: any[]; tokensUsed: number }> {
    // Build tone instruction based on league setting
    const toneInstruction = this.getToneInstruction(tone);
    
    const systemPrompt = `You are THE COMMISH, an AI assistant for fantasy sports league management. 
You have access to the league's constitution and rules. Your role is to provide accurate, helpful answers 
to questions about league rules and policies.

IMPORTANT GUIDELINES:
- Always base your answers on the provided rule texts
- Include specific citations for every claim you make
- If you cannot find a relevant rule, clearly state that
- Never guess or make up information
- Be concise but thorough
${toneInstruction}

Context about this league:
${leagueContext ? JSON.stringify(leagueContext, null, 2) : "No additional context provided"}

Relevant rules for this query:
${relevantRules.map((rule, i) => `
Rule ${i + 1} (${rule.ruleKey}):
${rule.text}
Citations: ${JSON.stringify(rule.citations)}
`).join('\n')}`;

    const userPrompt = `Question: ${query}

Please provide a comprehensive answer based on the relevant rules provided. Include specific citations for each point you make.`;

    const messages: DeepSeekMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const functions: DeepSeekFunction[] = [
      {
        name: "format_rules_response",
        description: "Format a response to a rules query with answer and citations",
        parameters: {
          type: "object",
          properties: {
            answer: {
              type: "string",
              description: "The comprehensive answer to the rules question",
            },
            citations: {
              type: "array",
              description: "Array of rule keys and specific citations used",
              items: {
                type: "object",
                properties: {
                  ruleKey: { type: "string" },
                  text: { type: "string" },
                  section: { type: "string" },
                },
              },
            },
            confidence: {
              type: "number",
              description: "Confidence level from 0.0 to 1.0",
            },
          },
          required: ["answer", "citations"],
        },
      },
    ];

    const response = await this.chatCompletion(messages, functions);
    const choice = response.choices[0];

    if (choice.message.function_call?.name === "format_rules_response") {
      const result = JSON.parse(choice.message.function_call.arguments);
      return {
        answer: result.answer,
        citations: result.citations,
        tokensUsed: response.usage.total_tokens,
      };
    }

    // Fallback if no function call
    return {
      answer: choice.message.content,
      citations: relevantRules.map(rule => ({
        ruleKey: rule.ruleKey,
        text: rule.text.substring(0, 100) + "...",
        section: "Unknown",
      })),
      tokensUsed: response.usage.total_tokens,
    };
  }

  async generateWeeklyDigest(
    leagueData: any,
    upcomingDeadlines: any[],
    recentActivity: any[]
  ): Promise<{ content: string; tokensUsed: number }> {
    const systemPrompt = `You are THE COMMISH, creating a weekly digest for a fantasy sports league. 
Create an engaging, informative summary that covers:

1. Current league standings and notable performances
2. Upcoming deadlines and important dates
3. Recent activity highlights
4. Any rule reminders or announcements

Keep it conversational but informative. Use emojis sparingly and appropriately.`;

    const userPrompt = `Create a weekly digest for this league:

League Data:
${JSON.stringify(leagueData, null, 2)}

Upcoming Deadlines:
${JSON.stringify(upcomingDeadlines, null, 2)}

Recent Activity:
${JSON.stringify(recentActivity, null, 2)}`;

    const messages: DeepSeekMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const response = await this.chatCompletion(messages);
    
    return {
      content: response.choices[0].message.content,
      tokensUsed: response.usage.total_tokens,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.chatCompletion([
        { role: "user", content: "Reply with just 'OK' if you're working properly." }
      ], undefined, 10);

      return response.choices[0]?.message?.content?.trim().toLowerCase() === "ok";
    } catch (error) {
      console.error("DeepSeek health check failed:", error);
      return false;
    }
  }
}

export const deepSeekService = new DeepSeekService();
