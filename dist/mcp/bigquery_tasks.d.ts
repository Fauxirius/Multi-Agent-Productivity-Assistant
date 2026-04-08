/**
 * ============================================================
 * BigQuery Tasks MCP Tool
 * ============================================================
 * Provides createTask and getTasks functions backed by BigQuery.
 * These tools are wired into the Task Manager Sub-Agent.
 * ============================================================
 */
/** Shape of a task row returned from BigQuery */
export interface Task {
    id: string;
    description: string;
    status: string;
    due_date: string | null;
    created_at: string;
}
/** Parameters accepted by the createTask tool */
export interface CreateTaskParams {
    description: string;
    status?: string;
    due_date?: string;
}
/** Parameters accepted by the getTasks tool */
export interface GetTasksParams {
    status?: string;
    limit?: number;
}
export declare const createTaskSchema: {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: {
            description: {
                type: string;
                description: string;
            };
            status: {
                type: string;
                description: string;
                enum: string[];
            };
            due_date: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare const getTasksSchema: {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: {
            status: {
                type: string;
                description: string;
                enum: string[];
            };
            limit: {
                type: string;
                description: string;
            };
        };
        required: never[];
    };
};
/**
 * Creates a new task in BigQuery and returns the created task object.
 *
 * @param params - Task creation parameters
 * @returns The newly created task
 */
export declare function createTask(params: CreateTaskParams): Promise<Task>;
/**
 * Retrieves tasks from BigQuery, optionally filtered by status.
 *
 * @param params - Query parameters (optional status filter, limit)
 * @returns Array of matching tasks
 */
export declare function getTasks(params: GetTasksParams): Promise<Task[]>;
//# sourceMappingURL=bigquery_tasks.d.ts.map