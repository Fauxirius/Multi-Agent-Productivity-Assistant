"use strict";
/**
 * ============================================================
 * Knowledge Sub-Agent
 * ============================================================
 * A specialized agent that manages project notes and knowledge
 * base entries using BigQuery-backed MCP tools.
 * ============================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runKnowledgeAgent = runKnowledgeAgent;
const genai_1 = require("@google/genai");
const bigquery_notes_1 = require("../mcp/bigquery_notes");
// ---------------------------------------------------------------------------
// Gemini client initialisation
// ---------------------------------------------------------------------------
const genai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
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
const createNoteDecl = {
    name: "createNote",
    description: "Create a new project note or knowledge-base entry. Returns the created note with an assigned ID.",
    parameters: {
        type: genai_1.Type.OBJECT,
        properties: {
            title: {
                type: genai_1.Type.STRING,
                description: "A descriptive title for the note.",
            },
            content: {
                type: genai_1.Type.STRING,
                description: "The full body of the note. Supports plaintext or markdown-formatted content.",
            },
        },
        required: ["title", "content"],
    },
};
const getNotesDecl = {
    name: "getNotes",
    description: "Retrieve project notes from the knowledge base. Optionally search by keyword.",
    parameters: {
        type: genai_1.Type.OBJECT,
        properties: {
            search: {
                type: genai_1.Type.STRING,
                description: "Optional keyword to search within note titles and content.",
            },
            limit: {
                type: genai_1.Type.NUMBER,
                description: "Maximum number of notes to return. Defaults to 20.",
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
async function executeTool(functionName, args) {
    switch (functionName) {
        case "createNote":
            return await (0, bigquery_notes_1.createNote)(args);
        case "getNotes":
            return await (0, bigquery_notes_1.getNotes)(args);
        default:
            throw new Error(`Unknown tool: ${functionName}`);
    }
}
/**
 * Run the Knowledge Agent with a user prompt.
 *
 * @param userPrompt - The instruction for the knowledge agent
 * @returns Agent result with response text and actions taken
 */
async function runKnowledgeAgent(userPrompt) {
    const actions = [];
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
        while (response.functionCalls &&
            response.functionCalls.length > 0) {
            const functionResponses = [];
            for (const call of response.functionCalls) {
                console.log(`[KnowledgeAgent] Calling tool: ${call.name} with args: ${JSON.stringify(call.args)}`);
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
                    console.error(`[KnowledgeAgent] Tool error in ${call.name}: ${errMsg}`);
                    functionResponses.push({
                        name: call.name,
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
        const finalText = response.text || "Notes processed successfully.";
        console.log(`[KnowledgeAgent] Complete. Actions taken: ${actions.length}`);
        return { response: finalText, actions };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[KnowledgeAgent] Fatal error: ${message}`);
        return {
            response: `Knowledge Agent encountered an error: ${message}`,
            actions,
        };
    }
}
//# sourceMappingURL=KnowledgeAgent.js.map