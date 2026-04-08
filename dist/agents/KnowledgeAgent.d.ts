/**
 * ============================================================
 * Knowledge Sub-Agent
 * ============================================================
 * A specialized agent that manages project notes and knowledge
 * base entries using BigQuery-backed MCP tools.
 * ============================================================
 */
export interface KnowledgeAgentResult {
    response: string;
    actions: Array<{
        tool: string;
        args: Record<string, unknown>;
        result: unknown;
    }>;
}
/**
 * Run the Knowledge Agent with a user prompt.
 *
 * @param userPrompt - The instruction for the knowledge agent
 * @returns Agent result with response text and actions taken
 */
export declare function runKnowledgeAgent(userPrompt: string): Promise<KnowledgeAgentResult>;
//# sourceMappingURL=KnowledgeAgent.d.ts.map