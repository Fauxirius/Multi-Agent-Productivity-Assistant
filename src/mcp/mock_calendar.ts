/**
 * ============================================================
 * Mock Calendar MCP Tool
 * ============================================================
 * Provides checkAvailability and scheduleMeeting using simple
 * in-memory mocked responses. This ensures prototype stability
 * without complex OAuth flows for Google Calendar.
 * ============================================================
 */

import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// In-memory store for scheduled meetings (resets on server restart)
// ---------------------------------------------------------------------------
const meetingsStore: Meeting[] = [];

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

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
  date: string;   // e.g. "2026-04-10"
  time?: string;  // e.g. "10:00 AM" — optional, checks full-day if omitted
}

/** Parameters for scheduleMeeting */
export interface ScheduleMeetingParams {
  title: string;
  date: string;          // e.g. "2026-04-10"
  time: string;          // e.g. "10:00 AM"
  duration_minutes?: number;  // defaults to 60
  attendees?: string[];       // list of email addresses
}

// ---------------------------------------------------------------------------
// MCP Tool Schema definitions
// ---------------------------------------------------------------------------

export const checkAvailabilitySchema = {
  name: "checkAvailability",
  description:
    "Check calendar availability for a given date and optional time slot. Returns whether the slot is free and suggests alternatives if busy.",
  parameters: {
    type: "object" as const,
    properties: {
      date: {
        type: "string",
        description:
          'The date to check in YYYY-MM-DD format (e.g. "2026-04-10").',
      },
      time: {
        type: "string",
        description:
          'Optional specific time slot to check (e.g. "10:00 AM"). If omitted, checks the whole day.',
      },
    },
    required: ["date"],
  },
};

export const scheduleMeetingSchema = {
  name: "scheduleMeeting",
  description:
    "Schedule a new meeting on the calendar. Returns the meeting details with a generated video-conference link.",
  parameters: {
    type: "object" as const,
    properties: {
      title: {
        type: "string",
        description: "The title or subject of the meeting.",
      },
      date: {
        type: "string",
        description: 'Meeting date in YYYY-MM-DD format (e.g. "2026-04-10").',
      },
      time: {
        type: "string",
        description: 'Meeting start time (e.g. "10:00 AM").',
      },
      duration_minutes: {
        type: "number",
        description: "Duration of the meeting in minutes. Defaults to 60.",
      },
      attendees: {
        type: "array",
        items: { type: "string" },
        description: "Optional list of attendee email addresses.",
      },
    },
    required: ["title", "date", "time"],
  },
};

// ---------------------------------------------------------------------------
// Tool Implementation Functions
// ---------------------------------------------------------------------------

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
export async function checkAvailability(
  params: CheckAvailabilityParams
): Promise<AvailabilityResult> {
  console.log(
    `[Mock Calendar] Checking availability for ${params.date}${params.time ? " at " + params.time : " (full day)"}`
  );

  const dateObj = new Date(params.date + "T00:00:00Z");
  const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 6 = Saturday

  // Rule 1: Weekends are unavailable
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      date: params.date,
      time_slot: params.time || "Full day",
      available: false,
      suggested_alternatives: [
        formatNextWeekday(dateObj, 1) + " at 10:00 AM",
        formatNextWeekday(dateObj, 1) + " at 2:00 PM",
      ],
    };
  }

  // Rule 2: Check for existing bookings at the same slot
  if (params.time) {
    const conflict = meetingsStore.find(
      (m) => m.date === params.date && m.time === params.time
    );
    if (conflict) {
      return {
        date: params.date,
        time_slot: params.time,
        available: false,
        suggested_alternatives: [
          `${params.date} at 11:00 AM`,
          `${params.date} at 3:00 PM`,
        ],
      };
    }
  }

  // Default: available
  return {
    date: params.date,
    time_slot: params.time || "Full day",
    available: true,
  };
}

/**
 * Schedules a new meeting and returns the meeting details.
 *
 * Mock logic: Generates a fake Google Meet-style link and stores
 * the meeting in memory.
 *
 * @param params - Meeting scheduling parameters
 * @returns The created meeting object
 */
export async function scheduleMeeting(
  params: ScheduleMeetingParams
): Promise<Meeting> {
  const id = uuidv4();
  const durationMinutes = params.duration_minutes || 60;
  const attendees = params.attendees || [];

  // Generate a realistic-looking meet link
  const meetCode = uuidv4().slice(0, 12).replace(/(.{4})/g, "$1-").slice(0, -1);
  const meetingLink = `https://meet.google.com/${meetCode}`;

  const meeting: Meeting = {
    id,
    title: params.title,
    date: params.date,
    time: params.time,
    duration_minutes: durationMinutes,
    attendees,
    meeting_link: meetingLink,
    created_at: new Date().toISOString(),
  };

  // Persist in our in-memory store
  meetingsStore.push(meeting);

  console.log(
    `[Mock Calendar] Scheduled meeting "${params.title}" on ${params.date} at ${params.time} (${durationMinutes}min)`
  );

  return meeting;
}

// ---------------------------------------------------------------------------
// Helper: calculate next weekday from a given date
// ---------------------------------------------------------------------------
function formatNextWeekday(fromDate: Date, daysToAdd: number): string {
  const next = new Date(fromDate);
  next.setUTCDate(next.getUTCDate() + daysToAdd);

  // Skip to Monday if we land on a weekend
  while (next.getUTCDay() === 0 || next.getUTCDay() === 6) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.toISOString().split("T")[0];
}
