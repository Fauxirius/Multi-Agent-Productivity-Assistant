/**
 * ============================================================
 * BigQuery Notes MCP Tool
 * ============================================================
 * Provides createNote and getNotes functions backed by BigQuery.
 * These tools are wired into the Knowledge Sub-Agent.
 * ============================================================
 */
/** Shape of a note row returned from BigQuery */
export interface Note {
    id: string;
    title: string;
    content: string;
    created_at: string;
}
/** Parameters accepted by the createNote tool */
export interface CreateNoteParams {
    title: string;
    content: string;
}
/** Parameters accepted by the getNotes tool */
export interface GetNotesParams {
    search?: string;
    limit?: number;
}
export declare const createNoteSchema: {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: {
            title: {
                type: string;
                description: string;
            };
            content: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare const getNotesSchema: {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: {
            search: {
                type: string;
                description: string;
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
 * Creates a new note in BigQuery and returns the created note object.
 *
 * @param params - Note creation parameters
 * @returns The newly created note
 */
export declare function createNote(params: CreateNoteParams): Promise<Note>;
/**
 * Retrieves notes from BigQuery, optionally filtered by keyword search.
 *
 * @param params - Query parameters (optional keyword search, limit)
 * @returns Array of matching notes
 */
export declare function getNotes(params: GetNotesParams): Promise<Note[]>;
//# sourceMappingURL=bigquery_notes.d.ts.map