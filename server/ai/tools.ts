// Define standardized tools for LLM function calling

export const tools = {
  fetch_rule: {
    name: "fetch_rule",
    description: "Get constitution rule/section by path or keyword",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Rule keyword or path to search for" }
      },
      required: ["query"]
    }
  },
  fetch_setting: {
    name: "fetch_setting",
    description: "Get current league setting (from Sleeper sync)",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "Setting key to retrieve" }
      },
      required: ["key"]
    }
  },
  summarize_thread: {
    name: "summarize_thread",
    description: "Summarize latest N messages in a channel",
    parameters: {
      type: "object",
      properties: {
        channelId: { type: "string", description: "Discord channel ID" },
        limit: { type: "integer", description: "Number of messages to summarize", default: 50 }
      },
      required: ["channelId"]
    }
  },
  generate_recap: {
    name: "generate_recap",
    description: "Create a league weekly recap using standings/sleeper data + top highlights",
    parameters: {
      type: "object",
      properties: {
        week: { type: "integer", description: "Week number for recap" }
      },
      required: ["week"]
    }
  }
};

export type ToolName = keyof typeof tools;

export function getToolDefinitions() {
  return Object.values(tools);
}
