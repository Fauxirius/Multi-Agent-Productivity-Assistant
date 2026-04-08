"use strict";
/**
 * ============================================================
 * BigQuery Tasks MCP Tool
 * ============================================================
 * Provides createTask and getTasks functions backed by BigQuery.
 * These tools are wired into the Task Manager Sub-Agent.
 * ============================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTasksSchema = exports.createTaskSchema = void 0;
exports.createTask = createTask;
exports.getTasks = getTasks;
const bigquery_1 = require("@google-cloud/bigquery");
const uuid_1 = require("uuid");
// ---------------------------------------------------------------------------
// BigQuery client — uses Application Default Credentials (ADC) when running
// on GCP, or the GOOGLE_APPLICATION_CREDENTIALS env var locally.
// ---------------------------------------------------------------------------
const bigquery = new bigquery_1.BigQuery({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
});
const DATASET = process.env.BIGQUERY_DATASET || "productivity_assistant";
const TABLE = "tasks";
// ---------------------------------------------------------------------------
// MCP Tool Schema definitions — these describe the tools to the LLM so it
// knows how to call them via function calling.
// ---------------------------------------------------------------------------
exports.createTaskSchema = {
    name: "createTask",
    description: "Create a new task in the productivity system. Returns the newly created task object with its generated ID.",
    parameters: {
        type: "object",
        properties: {
            description: {
                type: "string",
                description: "A clear, actionable description of the task.",
            },
            status: {
                type: "string",
                description: 'Task status. One of: "PENDING", "IN_PROGRESS", "DONE". Defaults to "PENDING".',
                enum: ["PENDING", "IN_PROGRESS", "DONE"],
            },
            due_date: {
                type: "string",
                description: "Optional due date in ISO-8601 format (e.g. 2026-04-10T09:00:00Z).",
            },
        },
        required: ["description"],
    },
};
exports.getTasksSchema = {
    name: "getTasks",
    description: "Retrieve tasks from the productivity system. Optionally filter by status.",
    parameters: {
        type: "object",
        properties: {
            status: {
                type: "string",
                description: 'Optional filter: "PENDING", "IN_PROGRESS", or "DONE".',
                enum: ["PENDING", "IN_PROGRESS", "DONE"],
            },
            limit: {
                type: "number",
                description: "Maximum number of tasks to return. Defaults to 20.",
            },
        },
        required: [],
    },
};
// ---------------------------------------------------------------------------
// Tool Implementation Functions
// ---------------------------------------------------------------------------
/**
 * Creates a new task in BigQuery and returns the created task object.
 *
 * @param params - Task creation parameters
 * @returns The newly created task
 */
async function createTask(params) {
    const id = (0, uuid_1.v4)();
    const status = params.status || "PENDING";
    const dueDate = params.due_date || null;
    const query = `
    INSERT INTO \`${DATASET}.${TABLE}\` (id, description, status, due_date)
    VALUES (@id, @description, @status, @dueDate)
  `;
    const options = {
        query,
        params: {
            id,
            description: params.description,
            status,
            dueDate,
        },
    };
    try {
        await bigquery.query(options);
        console.log(`[BigQuery Tasks] Created task ${id}: "${params.description}"`);
        const task = {
            id,
            description: params.description,
            status,
            due_date: dueDate,
            created_at: new Date().toISOString(),
        };
        return task;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[BigQuery Tasks] Error creating task: ${message}`);
        throw new Error(`Failed to create task: ${message}`);
    }
}
/**
 * Retrieves tasks from BigQuery, optionally filtered by status.
 *
 * @param params - Query parameters (optional status filter, limit)
 * @returns Array of matching tasks
 */
async function getTasks(params) {
    const limit = params.limit || 20;
    let query = `SELECT id, description, status, 
    FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', due_date) AS due_date,
    FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', created_at) AS created_at
    FROM \`${DATASET}.${TABLE}\``;
    const queryParams = { limit };
    // Apply optional status filter
    if (params.status) {
        query += ` WHERE status = @status`;
        queryParams.status = params.status;
    }
    query += ` ORDER BY created_at DESC LIMIT @limit`;
    try {
        const [rows] = await bigquery.query({ query, params: queryParams });
        console.log(`[BigQuery Tasks] Retrieved ${rows.length} task(s)`);
        return rows;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[BigQuery Tasks] Error retrieving tasks: ${message}`);
        throw new Error(`Failed to retrieve tasks: ${message}`);
    }
}
//# sourceMappingURL=bigquery_tasks.js.map