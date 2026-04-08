/**
 * ============================================================
 * Mock Calendar MCP Tool
 * ============================================================
 * Provides checkAvailability and scheduleMeeting using simple
 * in-memory mocked responses. This ensures prototype stability
 * without complex OAuth flows for Google Calendar.
 * ============================================================
 */
/** Shape of a meeting object */
export interface Meeting {
    id: string;
    title: string;
    date: string;
    time: string;
    duration_minutes: number;
    attendees: string[];
    meeting_link: string;
    created_at: string;
}
/** Structure returned by the checkAvailability tool */
export interface AvailabilityResult {
    date: string;
    time_slot: string;
    available: boolean;
    suggested_alternatives?: string[];
}
/** Parameters for checkAvailability */
export interface CheckAvailabilityParams {
    date: string;
    time?: string;
}
/** Parameters for scheduleMeeting */
export interface ScheduleMeetingParams {
    title: string;
    date: string;
    time: string;
    duration_minutes?: number;
    attendees?: string[];
}
export declare const checkAvailabilitySchema: {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: {
            date: {
                type: string;
                description: string;
            };
            time: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
};
export declare const scheduleMeetingSchema: {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: {
            title: {
                type: string;
                description: string;
            };
            date: {
                type: string;
                description: string;
            };
            time: {
                type: string;
                description: string;
            };
            duration_minutes: {
                type: string;
                description: string;
            };
            attendees: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
        };
        required: string[];
    };
};
/**
 * Checks calendar availability for a given date/time.
 *
 * Mock logic:
 * - Weekends (Sat/Sun) → always unavailable
 * - If a meeting is already booked at the same date+time → unavailable
 * - Otherwise → available
 *
 * @param params - Date and optional time to check
 * @returns Availability result with suggestions
 */
export declare function checkAvailability(params: CheckAvailabilityParams): Promise<AvailabilityResult>;
/**
 * Schedules a new meeting and returns the meeting details.
 *
 * Mock logic: Generates a fake Google Meet-style link and stores
 * the meeting in memory.
 *
 * @param params - Meeting scheduling parameters
 * @returns The created meeting object
 */
export declare function scheduleMeeting(params: ScheduleMeetingParams): Promise<Meeting>;
//# sourceMappingURL=mock_calendar.d.ts.map