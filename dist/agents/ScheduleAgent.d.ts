/**
 * ============================================================
 * Schedule Sub-Agent
 * ============================================================
 * A specialized agent that manages calendar operations using
 * mock calendar MCP tools. Handles availability checks and
 * meeting scheduling.
 * ============================================================
 */
export interface ScheduleAgentResult {
    response: string;
    actions: Array<{
        tool: string;
        args: Record<string, unknown>;
        result: unknown;
    }>;
}
/**
 * Run the Schedule Agent with a user prompt.
 *
 * @param userPrompt - The instruction for the schedule agent
 * @returns Agent result with response text and actions taken
 */
export declare function runScheduleAgent(userPrompt: string): Promise<ScheduleAgentResult>;
//# sourceMappingURL=ScheduleAgent.d.ts.map