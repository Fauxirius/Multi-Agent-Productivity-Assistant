/**
 * ============================================================
 * Knowledge Sub-Agent
 * ============================================================
 * A specialized agent that manages project notes and knowledge
 * base entries using BigQuery-backed MCP tools.
 * ============================================================
 */

import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import {
  createNote,
  getNotes,
  CreateNoteParams,
  GetNotesParams,
} from "../mcp/bigquery_notes";

// ---------------------------------------------------------------------------
// Gemini client initialisation
// ---------------------------------------------------------------------------
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are the **Knowledge Agent**, a sub-agent within the Multi-Agent Productivity Assistant system.

Your ONLY responsibility is managing project notes and knowledge base entries. You can:
1. **Create notes** — When asked to draft, write, or create documentation/notes, use the \`createNote\` function.
2. **Retrieve notes** — When asked to find, search, or review existing notes, use the \`getNotes\` function.

Rules:
- Write clear, well-structured note content. Use markdown formatting when appropriate.
- Give notes descriptive, concise titles.
- When creating project documentation, be thorough but organized.
- After performing actions, provide a concise summary of what you did.
- Do NOT attempt to handle tasks, scheduling, or any non-knowledge functionality.
- Be professional, articulate, and detail-oriented.`;

// ---------------------------------------------------------------------------
// Tool declarations for Gemini function calling
// ---------------------------------------------------------------------------
const createNoteDecl: FunctionDeclaration = {
  name: "createNote",
  description:
    "Create a new project note or knowledge-base entry. Returns the created note with an assigned ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "A descriptive title for the note.",
      },
      content: {
        type: Type.STRING,
        description:
          "The full body of the note. Supports plaintext or markdown-formatted content.",
      },
    },
    required: ["title", "content"],
  },
};

const getNotesDecl: FunctionDeclaration = {
  name: "getNotes",
  description:
    "Retrieve project notes from the knowledge base. Optionally search by keyword.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      search: {
        type: Type.STRING,
        description:
          "Optional keyword to search within note titles and content.",
      },
      limit: {
        type: Type.NUMBER,
        description:
          "Maximum number of notes to return. Defaults to 20.",
      },
    },
  },
};

const tools = [
  {
    functionDeclarations: [createNoteDecl, getNotesDecl],
  },
];

// ---------------------------------------------------------------------------
// Tool execution dispatcher
// ---------------------------------------------------------------------------
async function executeTool(
  functionName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (functionName) {
    case "createNote":
      return await createNote(args as unknown as CreateNoteParams);
    case "getNotes":
      return await getNotes(args as unknown as GetNotesParams);
    default:
      throw new Error(`Unknown tool: ${functionName}`);
  }
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface KnowledgeAgentResult {
  response: string;
  actions: Array<{ tool: string; args: Record<string, unknown>; result: unknown }>;
}

/**
 * Run the Knowledge Agent with a user prompt.
 *
 * @param userPrompt - The instruction for the knowledge agent
 * @returns Agent result with response text and actions taken
 */
export async function runKnowledgeAgent(
  userPrompt: string
): Promise<KnowledgeAgentResult> {
  const actions: KnowledgeAgentResult["actions"] = [];

  console.log(`[KnowledgeAgent] Received prompt: "${userPrompt}"`);

  try {
    const chat = genai.chats.create({
      model: "gemini-2.0-flash",
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools,
      },
      history: [],
    });

    let response = await chat.sendMessage({ message: userPrompt });

    // Function-calling loop
    while (
      response.functionCalls &&
      response.functionCalls.length > 0
    ) {
      const functionResponses = [];

      for (const call of response.functionCalls) {
        console.log(
          `[KnowledgeAgent] Calling tool: ${call.name} with args: ${JSON.stringify(call.args)}`
        );

        try {
          const result = await executeTool(
            call.name!,
            (call.args as Record<string, unknown>) || {}
          );
          actions.push({
            tool: call.name!,
            args: (call.args as Record<string, unknown>) || {},
            result,
          });
          functionResponses.push({
            name: call.name!,
            response: { result: JSON.stringify(result) },
          });
        } catch (toolError: unknown) {
          const errMsg =
            toolError instanceof Error ? toolError.message : String(toolError);
          console.error(
            `[KnowledgeAgent] Tool error in ${call.name}: ${errMsg}`
          );
          functionResponses.push({
            name: call.name!,
            response: { error: errMsg },
          });
        }
      }

      response = await chat.sendMessage({
        message: functionResponses.map((fr) => ({
          functionResponse: fr,
        })),
      });
    }

    const finalText =
      response.text || "Notes processed successfully.";

    console.log(
      `[KnowledgeAgent] Complete. Actions taken: ${actions.length}`
    );
    return { response: finalText, actions };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[KnowledgeAgent] Fatal error: ${message}`);
    return {
      response: `Knowledge Agent encountered an error: ${message}`,
      actions,
    };
  }
}
