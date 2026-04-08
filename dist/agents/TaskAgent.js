"use strict";
/**
 * ============================================================
 * Task Manager Sub-Agent
 * ============================================================
 * A specialized agent that manages tasks using BigQuery-backed
 * MCP tools. It strictly focuses on task creation and retrieval.
 * ============================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTaskAgent = runTaskAgent;
const genai_1 = require("@google/genai");
const bigquery_tasks_1 = require("../mcp/bigquery_tasks");
// ---------------------------------------------------------------------------
// Gemini client initialisation
// ---------------------------------------------------------------------------
const genai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
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
const createTaskDecl = {
    name: "createTask",
    description: "Create a new task in the productivity system. Returns the created task with an assigned ID.",
    parameters: {
        type: genai_1.Type.OBJECT,
        properties: {
            description: {
                type: genai_1.Type.STRING,
                description: "A clear, actionable description of the task.",
            },
            status: {
                type: genai_1.Type.STRING,
                description: 'Task status: "PENDING", "IN_PROGRESS", or "DONE". Defaults to "PENDING".',
            },
            due_date: {
                type: genai_1.Type.STRING,
                description: "Optional due date in ISO-8601 format (e.g. 2026-04-10T09:00:00Z).",
            },
        },
        required: ["description"],
    },
};
const getTasksDecl = {
    name: "getTasks",
    description: "Retrieve tasks from the productivity system. Optionally filter by status.",
    parameters: {
        type: genai_1.Type.OBJECT,
        properties: {
            status: {
                type: genai_1.Type.STRING,
                description: 'Optional filter: "PENDING", "IN_PROGRESS", or "DONE".',
            },
            limit: {
                type: genai_1.Type.NUMBER,
                description: "Maximum number of tasks to return. Defaults to 20.",
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
async function executeTool(functionName, args) {
    switch (functionName) {
        case "createTask":
            return await (0, bigquery_tasks_1.createTask)(args);
        case "getTasks":
            return await (0, bigquery_tasks_1.getTasks)(args);
        default:
            throw new Error(`Unknown tool: ${functionName}`);
    }
}
/**
 * Run the Task Manager Agent with a user prompt.
 * Handles the full function-calling loop: model generates calls → we execute
 * → feed results back → model produces final answer.
 *
 * @param userPrompt - The instruction to the task agent
 * @returns Agent result with response text and list of actions taken
 */
async function runTaskAgent(userPrompt) {
    const actions = [];
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
        while (response.functionCalls &&
            response.functionCalls.length > 0) {
            const functionResponses = [];
            for (const call of response.functionCalls) {
                console.log(`[TaskAgent] Calling tool: ${call.name} with args: ${JSON.stringify(call.args)}`);
                try {
                    const result = await executeTool(call.name, call.args || {});
                    actions.push({
                        tool: call.name,
                        args: call.args || {},
                        result,
                    });
                    functionResponses.push({
                        name: call.name,
                        response: { result: JSON.stringify(result) },
                    });
                }
                catch (toolError) {
                    const errMsg = toolError instanceof Error ? toolError.message : String(toolError);
                    console.error(`[TaskAgent] Tool error in ${call.name}: ${errMsg}`);
                    functionResponses.push({
                        name: call.name,
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
        const finalText = response.text || "Tasks processed successfully.";
        console.log(`[TaskAgent] Complete. Actions taken: ${actions.length}`);
        return { response: finalText, actions };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[TaskAgent] Fatal error: ${message}`);
        return {
            response: `Task Agent encountered an error: ${message}`,
            actions,
        };
    }
}
//# sourceMappingURL=TaskAgent.js.map