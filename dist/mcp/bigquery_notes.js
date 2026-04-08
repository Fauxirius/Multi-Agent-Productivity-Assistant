"use strict";
/**
 * ============================================================
 * BigQuery Notes MCP Tool
 * ============================================================
 * Provides createNote and getNotes functions backed by BigQuery.
 * These tools are wired into the Knowledge Sub-Agent.
 * ============================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotesSchema = exports.createNoteSchema = void 0;
exports.createNote = createNote;
exports.getNotes = getNotes;
const bigquery_1 = require("@google-cloud/bigquery");
const uuid_1 = require("uuid");
// ---------------------------------------------------------------------------
// BigQuery client
// ---------------------------------------------------------------------------
const bigquery = new bigquery_1.BigQuery({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
});
const DATASET = process.env.BIGQUERY_DATASET || "productivity_assistant";
const TABLE = "notes";
// ---------------------------------------------------------------------------
// MCP Tool Schema definitions
// ---------------------------------------------------------------------------
exports.createNoteSchema = {
    name: "createNote",
    description: "Create a new project note or knowledge-base entry. Returns the newly created note with its generated ID.",
    parameters: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "A descriptive title for the note.",
            },
            content: {
                type: "string",
                description: "The full body of the note. Supports plaintext or markdown-formatted content.",
            },
        },
        required: ["title", "content"],
    },
};
exports.getNotesSchema = {
    name: "getNotes",
    description: "Retrieve project notes from the knowledge base. Optionally search by keyword.",
    parameters: {
        type: "object",
        properties: {
            search: {
                type: "string",
                description: "Optional keyword to search within note titles and content.",
            },
            limit: {
                type: "number",
                description: "Maximum number of notes to return. Defaults to 20.",
            },
        },
        required: [],
    },
};
// ---------------------------------------------------------------------------
// Tool Implementation Functions
// ---------------------------------------------------------------------------
/**
 * Creates a new note in BigQuery and returns the created note object.
 *
 * @param params - Note creation parameters
 * @returns The newly created note
 */
async function createNote(params) {
    const id = (0, uuid_1.v4)();
    const query = `
    INSERT INTO \`${DATASET}.${TABLE}\` (id, title, content)
    VALUES (@id, @title, @content)
  `;
    const options = {
        query,
        params: {
            id,
            title: params.title,
            content: params.content,
        },
    };
    try {
        await bigquery.query(options);
        console.log(`[BigQuery Notes] Created note ${id}: "${params.title}"`);
        const note = {
            id,
            title: params.title,
            content: params.content,
            created_at: new Date().toISOString(),
        };
        return note;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[BigQuery Notes] Error creating note: ${message}`);
        throw new Error(`Failed to create note: ${message}`);
    }
}
/**
 * Retrieves notes from BigQuery, optionally filtered by keyword search.
 *
 * @param params - Query parameters (optional keyword search, limit)
 * @returns Array of matching notes
 */
async function getNotes(params) {
    const limit = params.limit || 20;
    let query = `SELECT id, title, content,
    FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', created_at) AS created_at
    FROM \`${DATASET}.${TABLE}\``;
    const queryParams = { limit };
    // Apply optional keyword search across title and content
    if (params.search) {
        query += ` WHERE LOWER(title) LIKE CONCAT('%', LOWER(@search), '%')
               OR LOWER(content) LIKE CONCAT('%', LOWER(@search), '%')`;
        queryParams.search = params.search;
    }
    query += ` ORDER BY created_at DESC LIMIT @limit`;
    try {
        const [rows] = await bigquery.query({ query, params: queryParams });
        console.log(`[BigQuery Notes] Retrieved ${rows.length} note(s)`);
        return rows;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[BigQuery Notes] Error retrieving notes: ${message}`);
        throw new Error(`Failed to retrieve notes: ${message}`);
    }
}
//# sourceMappingURL=bigquery_notes.js.map