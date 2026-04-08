/**
 * ============================================================
 * Coordinator Agent — The Primary Orchestrator
 * ============================================================
 * This is the central routing agent. It receives user requests,
 * decomposes them into a multi-step plan, and delegates tasks
 * to the appropriate sub-agents (Task, Knowledge, Schedule).
 *
 * It uses Gemini function calling to decide which sub-agents to
 * invoke and in what order, then assembles a unified response.
 * ============================================================
 */

import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { runTaskAgent, TaskAgentResult } from "./TaskAgent";
import { runKnowledgeAgent, KnowledgeAgentResult } from "./KnowledgeAgent";
import { runScheduleAgent, ScheduleAgentResult } from "./ScheduleAgent";

// ---------------------------------------------------------------------------
// Gemini client initialisation
// ---------------------------------------------------------------------------
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// ---------------------------------------------------------------------------
// System prompt — makes the Coordinator a Project Management Co-Pilot
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are the **Project Management Co-Pilot**, the primary coordinator in a multi-agent productivity system.

You orchestrate three specialized sub-agents:
1. **delegateToTaskAgent** — Manages tasks (create, list, update). Use for anything related to to-do items, task lists, action items.
2. **delegateToKnowledgeAgent** — Manages project notes and documentation. Use for creating meeting notes, project docs, knowledge base entries.
3. **delegateToScheduleAgent** — Manages calendar and scheduling. Use for checking availability, booking meetings, scheduling events.

Your workflow:
1. Analyze the user's request carefully.
2. Break it down into discrete steps that map to your sub-agents.
3. Call each relevant sub-agent function with a CLEAR, SPECIFIC instruction.
4. After all delegations are complete, synthesize the results into a comprehensive response.

Rules:
- You MUST delegate to sub-agents using the provided functions. Do NOT try to perform tasks yourself.
- For complex requests, call multiple sub-agents in sequence.
- Each delegation should include a complete, self-contained instruction — the sub-agent has no context of the overall request.
- Be specific in your delegations. For example, instead of "create tasks", say "Create the following 3 tasks: 1) Design wireframes (due 2026-04-15), 2) Set up CI/CD pipeline, 3) Write unit tests".
- Today's date is ${new Date().toISOString().split("T")[0]}. Use this for relative date calculations.
- Always provide a unified summary at the end combining all sub-agent results.
- Be professional and act as a senior project manager.`;

// ---------------------------------------------------------------------------
// Tool declarations — these represent the sub-agent delegation functions
// ---------------------------------------------------------------------------
const delegateToTaskAgentDecl: FunctionDeclaration = {
  name: "delegateToTaskAgent",
  description:
    "Delegate a task-management instruction to the Task Manager Agent. Use this for creating tasks, listing tasks, or any to-do/action-item operations. Provide a complete, specific instruction.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      instruction: {
        type: Type.STRING,
        description:
          "A complete, self-contained instruction for the Task Agent. Be specific about what tasks to create/retrieve, including descriptions, statuses, and due dates.",
      },
    },
    required: ["instruction"],
  },
};

const delegateToKnowledgeAgentDecl: FunctionDeclaration = {
  name: "delegateToKnowledgeAgent",
  description:
    "Delegate a knowledge/documentation instruction to the Knowledge Agent. Use this for creating project notes, documentation, or searching the knowledge base. Provide a complete, specific instruction.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      instruction: {
        type: Type.STRING,
        description:
          "A complete, self-contained instruction for the Knowledge Agent. Be specific about note titles, content to produce, or search queries.",
      },
    },
    required: ["instruction"],
  },
};

const delegateToScheduleAgentDecl: FunctionDeclaration = {
  name: "delegateToScheduleAgent",
  description:
    "Delegate a scheduling instruction to the Schedule Agent. Use this for checking calendar availability, booking meetings, or managing schedules. Provide a complete, specific instruction.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      instruction: {
        type: Type.STRING,
        description:
          "A complete, self-contained instruction for the Schedule Agent. Be specific about dates, times, meeting titles, and attendees.",
      },
    },
    required: ["instruction"],
  },
};

const tools = [
  {
    functionDeclarations: [
      delegateToTaskAgentDecl,
      delegateToKnowledgeAgentDecl,
      delegateToScheduleAgentDecl,
    ],
  },
];

// ---------------------------------------------------------------------------
// Sub-agent dispatcher
// ---------------------------------------------------------------------------
async function executeSubAgent(
  functionName: string,
  args: Record<string, unknown>
): Promise<{
  agent: string;
  result: TaskAgentResult | KnowledgeAgentResult | ScheduleAgentResult;
}> {
  const instruction = (args.instruction as string) || "";

  switch (functionName) {
    case "delegateToTaskAgent": {
      console.log(`[Coordinator] → Delegating to TaskAgent: "${instruction}"`);
      const result = await runTaskAgent(instruction);
      return { agent: "TaskAgent", result };
    }
    case "delegateToKnowledgeAgent": {
      console.log(
        `[Coordinator] → Delegating to KnowledgeAgent: "${instruction}"`
      );
      const result = await runKnowledgeAgent(instruction);
      return { agent: "KnowledgeAgent", result };
    }
    case "delegateToScheduleAgent": {
      console.log(
        `[Coordinator] → Delegating to ScheduleAgent: "${instruction}"`
      );
      const result = await runScheduleAgent(instruction);
      return { agent: "ScheduleAgent", result };
    }
    default:
      throw new Error(`Unknown sub-agent function: ${functionName}`);
  }
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/** Combined action record from any sub-agent */
export interface ActionRecord {
  agent: string;
  tool: string;
  args: Record<string, unknown>;
  result: unknown;
}

/** Full result from the Coordinator Agent */
export interface CoordinatorResult {
  status: "success" | "error";
  final_response: string;
  actions_taken: ActionRecord[];
  agents_used: string[];
}

/**
 * Run the Coordinator Agent — the main entry point for the
 * multi-agent system. It takes a raw user prompt, plans the
 * execution across sub-agents, and returns a unified result.
 *
 * @param userPrompt - The user's natural language request
 * @returns Coordinator result with final response and action log
 */
export async function runCoordinator(
  userPrompt: string
): Promise<CoordinatorResult> {
  const allActions: ActionRecord[] = [];
  const agentsUsed = new Set<string>();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[Coordinator] New request: "${userPrompt}"`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    // Start a chat session with the coordinator model
    const chat = genai.chats.create({
      model: "gemini-2.0-flash",
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools,
      },
      history: [],
    });

    // Send the user's prompt
    let response = await chat.sendMessage({ message: userPrompt });

    // -----------------------------------------------------------------------
    // Multi-step function-calling loop
    // The coordinator may make multiple rounds of delegations before
    // producing its final synthesised response.
    // -----------------------------------------------------------------------
    let iterationCount = 0;
    const MAX_ITERATIONS = 10; // Safety guard against infinite loops

    while (
      response.functionCalls &&
      response.functionCalls.length > 0 &&
      iterationCount < MAX_ITERATIONS
    ) {
      iterationCount++;
      console.log(
        `[Coordinator] Iteration ${iterationCount}: ${response.functionCalls.length} delegation(s)`
      );

      const functionResponses = [];

      // Process each delegation call
      for (const call of response.functionCalls) {
        try {
          const { agent, result } = await executeSubAgent(
            call.name!,
            (call.args as Record<string, unknown>) || {}
          );

          agentsUsed.add(agent);

          // Flatten the sub-agent's actions into our master action log
          for (const action of result.actions) {
            allActions.push({
              agent,
              tool: action.tool,
              args: action.args,
              result: action.result,
            });
          }

          functionResponses.push({
            name: call.name!,
            response: {
              result: JSON.stringify({
                agent,
                response: result.response,
                actions_count: result.actions.length,
              }),
            },
          });
        } catch (subAgentError: unknown) {
          const errMsg =
            subAgentError instanceof Error
              ? subAgentError.message
              : String(subAgentError);
          console.error(
            `[Coordinator] Sub-agent error in ${call.name}: ${errMsg}`
          );
          functionResponses.push({
            name: call.name!,
            response: { error: errMsg },
          });
        }
      }

      // Feed sub-agent results back to the coordinator for synthesis
      response = await chat.sendMessage({
        message: functionResponses.map((fr) => ({
          functionResponse: fr,
        })),
      });
    }

    if (iterationCount >= MAX_ITERATIONS) {
      console.warn(
        "[Coordinator] Reached max iterations — forcing completion"
      );
    }

    // Extract the coordinator's final synthesised response
    const finalResponse =
      response.text ||
      "All requested actions have been completed successfully.";

    console.log(`\n[Coordinator] ✅ Complete`);
    console.log(`  Agents used: ${Array.from(agentsUsed).join(", ")}`);
    console.log(`  Total actions: ${allActions.length}`);
    console.log(`${"=".repeat(60)}\n`);

    return {
      status: "success",
      final_response: finalResponse,
      actions_taken: allActions,
      agents_used: Array.from(agentsUsed),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Coordinator] Fatal error: ${message}`);

    return {
      status: "error",
      final_response: `The assistant encountered an error: ${message}`,
      actions_taken: allActions,
      agents_used: Array.from(agentsUsed),
    };
  }
}
