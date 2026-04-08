/**
 * ============================================================
 * Task Manager Sub-Agent
 * ============================================================
 * A specialized agent that manages tasks using BigQuery-backed
 * MCP tools. It strictly focuses on task creation and retrieval.
 * ============================================================
 */
/** Result from the Task Agent's execution */
export interface TaskAgentResult {
    response: string;
    actions: Array<{
        tool: string;
        args: Record<string, unknown>;
        result: unknown;
    }>;
}
/**
 * Run the Task Manager Agent with a user prompt.
 * Handles the full function-calling loop: model generates calls → we execute
 * → feed results back → model produces final answer.
 *
 * @param userPrompt - The instruction to the task agent
 * @returns Agent result with response text and list of actions taken
 */
export declare function runTaskAgent(userPrompt: string): Promise<TaskAgentResult>;
//# sourceMappingURL=TaskAgent.d.ts.map