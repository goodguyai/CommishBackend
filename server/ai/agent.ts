import { deepSeekService } from "../services/deepseek";
import { RAGService } from "../services/rag";
import { storage } from "../storage";
import { tools, type ToolName } from "./tools";

interface AgentContext {
  leagueId: string;
  question?: string;
  week?: number;
}

export async function aiAsk(context: AgentContext & { question: string }): Promise<{ content: string; sources?: string[] }> {
  const { leagueId, question } = context;
  
  // Use RAG to retrieve relevant rules
  const ragService = new RAGService(storage);
  const ragResults = await ragService.searchSimilar(leagueId, question, { topK: 5, threshold: 0.6 });
  
  const contextDocs = ragResults.map((r: any) => `[${r.rule.ruleKey}]: ${r.rule.text}`).join("\n\n");
  
  const systemPrompt = `You are THE COMMISH, a fantasy football league assistant. 
Answer questions about league rules and settings based on the following context.
If you need specific rule details, the context is provided below.

Context:
${contextDocs}`;

  const response = await deepSeekService.chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: question }
  ], undefined, 500);

  const sources = ragResults.map((r: any) => r.rule.ruleKey);
  
  return {
    content: response.choices[0]?.message?.content || "I couldn't find an answer to that question.",
    sources
  };
}

export async function aiRecap(context: AgentContext & { week: number }): Promise<{ markdown: string }> {
  const { leagueId, week } = context;
  
  // Fetch league matchups and standings for the week
  const matchups = await storage.getSleeperMatchups(leagueId, week);
  const league = await storage.getLeague(leagueId);
  
  if (!league) {
    throw new Error("League not found");
  }

  const matchupSummary = matchups.slice(0, 5).map((m: any) => 
    `Match ${m.matchupId}: Score ${m.scoreHome} - ${m.scoreAway}`
  ).join("\n");

  const prompt = `Generate a brief weekly recap for Week ${week} of our fantasy football league.

Matchups:
${matchupSummary || "No matchup data available"}

Write a concise, engaging 2-3 paragraph recap highlighting key performances and close games.`;

  const response = await deepSeekService.chatCompletion([
    { role: "system", content: "You are THE COMMISH, a fantasy football recap writer. Be concise and engaging." },
    { role: "user", content: prompt }
  ], undefined, 400);

  return {
    markdown: response.choices[0]?.message?.content || `# Week ${week} Recap\n\nNo data available for this week.`
  };
}

// Tool execution handlers
export async function executeTool(toolName: ToolName, args: any, leagueId: string): Promise<any> {
  switch (toolName) {
    case "fetch_rule":
      const ragService = new RAGService(storage);
      const results = await ragService.searchSimilar(leagueId, args.query, { topK: 3 });
      return results.map((r: any) => ({ key: r.rule.ruleKey, text: r.rule.text }));
      
    case "fetch_setting":
      const settings = await storage.getLeagueSettings(leagueId);
      return settings?.[args.key] || null;
      
    case "summarize_thread":
      // Placeholder - would need Discord message history access
      return { summary: "Thread summary not yet implemented" };
      
    case "generate_recap":
      return await aiRecap({ leagueId, week: args.week });
      
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
