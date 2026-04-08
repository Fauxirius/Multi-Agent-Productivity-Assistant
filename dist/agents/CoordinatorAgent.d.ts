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
export declare function runCoordinator(userPrompt: string): Promise<CoordinatorResult>;
//# sourceMappingURL=CoordinatorAgent.d.ts.map