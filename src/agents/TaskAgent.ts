/**
 * ============================================================
 * Task Manager Sub-Agent
 * ============================================================
 * A specialized agent that manages tasks using BigQuery-backed
 * MCP tools. It strictly focuses on task creation and retrieval.
 * ============================================================
 */

import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import {
  createTask,
  getTasks,
  CreateTaskParams,
  GetTasksParams,
} from "../mcp/bigquery_tasks";

// ---------------------------------------------------------------------------
// Gemini client initialisation
// ---------------------------------------------------------------------------
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// ---------------------------------------------------------------------------
// System prompt — instructs the model to behave as a strict task manager
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are the **Task Manager Agent**, a sub-agent within the Multi-Agent Productivity Assistant system.

Your ONLY responsibility is managing tasks. You can:
1. **Create tasks** — When asked to add, create, or set up tasks, use the \`createTask\` function.
2. **Retrieve tasks** — When asked to list, check, or review tasks, use the \`getTasks\` function.

Rules:
- Always set clear, actionable task descriptions.
- If a due date is mentioned, parse it into ISO-8601 format (YYYY-MM-DDTHH:MM:SSZ).
- Default task status is "PENDING" unless explicitly told otherwise.
- When creating multiple tasks from a single prompt, call createTask once per task.
- After performing actions, provide a concise summary of what you did.
- Do NOT attempt to handle notes, scheduling, or any non-task functionality.
- Be professional, brief, and precise.`;

// ---------------------------------------------------------------------------
// Tool declarations for Gemini function calling
// ---------------------------------------------------------------------------
const createTaskDecl: FunctionDeclaration = {
  name: "createTask",
  description:
    "Create a new task in the productivity system. Returns the created task with an assigned ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: "A clear, actionable description of the task.",
      },
      status: {
        type: Type.STRING,
        description:
          'Task status: "PENDING", "IN_PROGRESS", or "DONE". Defaults to "PENDING".',
      },
      due_date: {
        type: Type.STRING,
        description:
          "Optional due date in ISO-8601 format (e.g. 2026-04-10T09:00:00Z).",
      },
    },
    required: ["description"],
  },
};

const getTasksDecl: FunctionDeclaration = {
  name: "getTasks",
  description:
    "Retrieve tasks from the productivity system. Optionally filter by status.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: {
        type: Type.STRING,
        description:
          'Optional filter: "PENDING", "IN_PROGRESS", or "DONE".',
      },
      limit: {
        type: Type.NUMBER,
        description:
          "Maximum number of tasks to return. Defaults to 20.",
      },
    },
  },
};

const tools = [
  {
    functionDeclarations: [createTaskDecl, getTasksDecl],
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
    case "createTask":
      return await createTask(args as unknown as CreateTaskParams);
    case "getTasks":
      return await getTasks(args as unknown as GetTasksParams);
    default:
      throw new Error(`Unknown tool: ${functionName}`);
  }
}

// ---------------------------------------------------------------------------
// Public interface for the Coordinator to call
// ---------------------------------------------------------------------------

/** Result from the Task Agent's execution */
export interface TaskAgentResult {
  response: string;
  actions: Array<{ tool: string; args: Record<string, unknown>; result: unknown }>;
}

/**
 * Run the Task Manager Agent with a user prompt.
 * Handles the full function-calling loop: model generates calls → we execute
 * → feed results back → model produces final answer.
 *
 * @param userPrompt - The instruction to the task agent
 * @returns Agent result with response text and list of actions taken
 */
export async function runTaskAgent(
  userPrompt: string
): Promise<TaskAgentResult> {
  const actions: TaskAgentResult["actions"] = [];

  console.log(`[TaskAgent] Received prompt: "${userPrompt}"`);

  try {
    // Start a chat session with the model
    const chat = genai.chats.create({
      model: "gemini-2.0-flash",
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools,
      },
      history: [],
    });

    // Send the initial user message
    let response = await chat.sendMessage({ message: userPrompt });

    // -----------------------------------------------------------------------
    // Function-calling loop: keep processing until the model stops calling
    // tools and provides a final text answer.
    // -----------------------------------------------------------------------
    while (
      response.functionCalls &&
      response.functionCalls.length > 0
    ) {
      const functionResponses = [];

      for (const call of response.functionCalls) {
        console.log(
          `[TaskAgent] Calling tool: ${call.name} with args: ${JSON.stringify(call.args)}`
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
          console.error(`[TaskAgent] Tool error in ${call.name}: ${errMsg}`);
          functionResponses.push({
            name: call.name!,
            response: { error: errMsg },
          });
        }
      }

      // Send tool results back to the model
      response = await chat.sendMessage({
        message: functionResponses.map((fr) => ({
          functionResponse: fr,
        })),
      });
    }

    // Extract final text response
    const finalText =
      response.text || "Tasks processed successfully.";

    console.log(`[TaskAgent] Complete. Actions taken: ${actions.length}`);
    return { response: finalText, actions };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[TaskAgent] Fatal error: ${message}`);
    return {
      response: `Task Agent encountered an error: ${message}`,
      actions,
    };
  }
}
