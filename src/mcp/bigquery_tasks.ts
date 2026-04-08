/**
 * ============================================================
 * BigQuery Tasks MCP Tool
 * ============================================================
 * Provides createTask and getTasks functions backed by BigQuery.
 * These tools are wired into the Task Manager Sub-Agent.
 * ============================================================
 */

import { BigQuery } from "@google-cloud/bigquery";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// BigQuery client — uses Application Default Credentials (ADC) when running
// on GCP, or the GOOGLE_APPLICATION_CREDENTIALS env var locally.
// ---------------------------------------------------------------------------
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const DATASET = process.env.BIGQUERY_DATASET || "productivity_assistant";
const TABLE = "tasks";

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

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
  due_date?: string; // ISO-8601 timestamp string
}

/** Parameters accepted by the getTasks tool */
export interface GetTasksParams {
  status?: string; // Optional filter by status
  limit?: number;  // Max rows to return (default 20)
}

// ---------------------------------------------------------------------------
// MCP Tool Schema definitions — these describe the tools to the LLM so it
// knows how to call them via function calling.
// ---------------------------------------------------------------------------

export const createTaskSchema = {
  name: "createTask",
  description:
    "Create a new task in the productivity system. Returns the newly created task object with its generated ID.",
  parameters: {
    type: "object" as const,
    properties: {
      description: {
        type: "string",
        description: "A clear, actionable description of the task.",
      },
      status: {
        type: "string",
        description:
          'Task status. One of: "PENDING", "IN_PROGRESS", "DONE". Defaults to "PENDING".',
        enum: ["PENDING", "IN_PROGRESS", "DONE"],
      },
      due_date: {
        type: "string",
        description:
          "Optional due date in ISO-8601 format (e.g. 2026-04-10T09:00:00Z).",
      },
    },
    required: ["description"],
  },
};

export const getTasksSchema = {
  name: "getTasks",
  description:
    "Retrieve tasks from the productivity system. Optionally filter by status.",
  parameters: {
    type: "object" as const,
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
export async function createTask(params: CreateTaskParams): Promise<Task> {
  const id = uuidv4();
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

    const task: Task = {
      id,
      description: params.description,
      status,
      due_date: dueDate,
      created_at: new Date().toISOString(),
    };

    return task;
  } catch (error: unknown) {
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
export async function getTasks(params: GetTasksParams): Promise<Task[]> {
  const limit = params.limit || 20;
  let query = `SELECT id, description, status, 
    FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', due_date) AS due_date,
    FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', created_at) AS created_at
    FROM \`${DATASET}.${TABLE}\``;

  const queryParams: Record<string, string | number> = { limit };

  // Apply optional status filter
  if (params.status) {
    query += ` WHERE status = @status`;
    queryParams.status = params.status;
  }

  query += ` ORDER BY created_at DESC LIMIT @limit`;

  try {
    const [rows] = await bigquery.query({ query, params: queryParams });
    console.log(`[BigQuery Tasks] Retrieved ${rows.length} task(s)`);
    return rows as Task[];
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[BigQuery Tasks] Error retrieving tasks: ${message}`);
    throw new Error(`Failed to retrieve tasks: ${message}`);
  }
}
