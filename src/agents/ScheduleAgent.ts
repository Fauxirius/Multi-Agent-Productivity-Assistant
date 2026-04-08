/**
 * ============================================================
 * Schedule Sub-Agent
 * ============================================================
 * A specialized agent that manages calendar operations using
 * mock calendar MCP tools. Handles availability checks and
 * meeting scheduling.
 * ============================================================
 */

import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import {
  checkAvailability,
  scheduleMeeting,
  CheckAvailabilityParams,
  ScheduleMeetingParams,
} from "../mcp/mock_calendar";

// ---------------------------------------------------------------------------
// Gemini client initialisation
// ---------------------------------------------------------------------------
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are the **Schedule Agent**, a sub-agent within the Multi-Agent Productivity Assistant system.

Your ONLY responsibility is managing calendar and scheduling. You can:
1. **Check availability** — Use \`checkAvailability\` to check if a date/time is free.
2. **Schedule meetings** — Use \`scheduleMeeting\` to book a meeting with title, date, time, and attendees.

Rules:
- Always check availability before scheduling if the user hasn't confirmed the slot.
- Parse natural language dates (e.g., "next Tuesday", "tomorrow") into YYYY-MM-DD format. Today's date is ${new Date().toISOString().split("T")[0]}.
- Default meeting duration is 60 minutes unless specified otherwise.
- Provide the meeting link in your response after scheduling.
- After performing actions, provide a concise summary of what you did.
- Do NOT attempt to handle tasks, notes, or any non-scheduling functionality.
- Be professional and act like an executive assistant.`;

// ---------------------------------------------------------------------------
// Tool declarations for Gemini function calling
// ---------------------------------------------------------------------------
const checkAvailabilityDecl: FunctionDeclaration = {
  name: "checkAvailability",
  description:
    "Check calendar availability for a given date and optional time slot.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: {
        type: Type.STRING,
        description:
          'The date to check in YYYY-MM-DD format (e.g. "2026-04-10").',
      },
      time: {
        type: Type.STRING,
        description:
          'Optional specific time slot (e.g. "10:00 AM").',
      },
    },
    required: ["date"],
  },
};

const scheduleMeetingDecl: FunctionDeclaration = {
  name: "scheduleMeeting",
  description:
    "Schedule a new meeting on the calendar. Returns meeting details with a video-conference link.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "The title or subject of the meeting.",
      },
      date: {
        type: Type.STRING,
        description:
          'Meeting date in YYYY-MM-DD format (e.g. "2026-04-10").',
      },
      time: {
        type: Type.STRING,
        description: 'Meeting start time (e.g. "10:00 AM").',
      },
      duration_minutes: {
        type: Type.NUMBER,
        description:
          "Duration of the meeting in minutes. Defaults to 60.",
      },
      attendees: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Optional list of attendee email addresses.",
      },
    },
    required: ["title", "date", "time"],
  },
};

const tools = [
  {
    functionDeclarations: [checkAvailabilityDecl, scheduleMeetingDecl],
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
    case "checkAvailability":
      return await checkAvailability(
        args as unknown as CheckAvailabilityParams
      );
    case "scheduleMeeting":
      return await scheduleMeeting(args as unknown as ScheduleMeetingParams);
    default:
      throw new Error(`Unknown tool: ${functionName}`);
  }
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface ScheduleAgentResult {
  response: string;
  actions: Array<{ tool: string; args: Record<string, unknown>; result: unknown }>;
}

/**
 * Run the Schedule Agent with a user prompt.
 *
 * @param userPrompt - The instruction for the schedule agent
 * @returns Agent result with response text and actions taken
 */
export async function runScheduleAgent(
  userPrompt: string
): Promise<ScheduleAgentResult> {
  const actions: ScheduleAgentResult["actions"] = [];

  console.log(`[ScheduleAgent] Received prompt: "${userPrompt}"`);

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
          `[ScheduleAgent] Calling tool: ${call.name} with args: ${JSON.stringify(call.args)}`
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
            `[ScheduleAgent] Tool error in ${call.name}: ${errMsg}`
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
      response.text || "Scheduling processed successfully.";

    console.log(
      `[ScheduleAgent] Complete. Actions taken: ${actions.length}`
    );
    return { response: finalText, actions };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ScheduleAgent] Fatal error: ${message}`);
    return {
      response: `Schedule Agent encountered an error: ${message}`,
      actions,
    };
  }
}
