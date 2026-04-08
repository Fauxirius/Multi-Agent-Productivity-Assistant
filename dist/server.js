"use strict";
/**
 * ============================================================
 * Express API Server
 * ============================================================
 * Main entry point for the Multi-Agent Productivity Assistant.
 * Serves the frontend UI and exposes the /api/assistant endpoint
 * which invokes the Coordinator Agent.
 * ============================================================
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Load .env before anything else
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const CoordinatorAgent_1 = require("./agents/CoordinatorAgent");
// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || "8080", 10);
const app = (0, express_1.default)();
// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
// Parse JSON request bodies (up to 1MB for larger prompts)
app.use(express_1.default.json({ limit: "1mb" }));
// Serve static frontend files from /public
app.use(express_1.default.static(path_1.default.join(__dirname, "..", "public")));
// Request logging middleware
app.use((req, _res, next) => {
    if (req.method !== "GET" || !req.url.startsWith("/api")) {
        // Don't log static file requests
        if (req.url.startsWith("/api")) {
            console.log(`[Server] ${req.method} ${req.url} — ${new Date().toISOString()}`);
        }
    }
    next();
});
// ---------------------------------------------------------------------------
// Health check endpoint
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
    res.json({
        status: "healthy",
        service: "Multi-Agent Productivity Assistant",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        agents: ["CoordinatorAgent", "TaskAgent", "KnowledgeAgent", "ScheduleAgent"],
    });
});
// ---------------------------------------------------------------------------
// Main assistant endpoint
// ---------------------------------------------------------------------------
app.post("/api/assistant", async (req, res) => {
    const startTime = Date.now();
    try {
        // Validate request body
        const { prompt } = req.body;
        if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
            res.status(400).json({
                status: "error",
                final_response: "Please provide a non-empty 'prompt' field.",
                actions_taken: [],
                agents_used: [],
            });
            return;
        }
        // Validate API key is configured
        if (!process.env.GEMINI_API_KEY) {
            res.status(500).json({
                status: "error",
                final_response: "Server misconfiguration: GEMINI_API_KEY is not set. Please configure the environment.",
                actions_taken: [],
                agents_used: [],
            });
            return;
        }
        console.log(`[Server] Processing request — prompt: "${prompt.substring(0, 100)}..."`);
        // Invoke the Coordinator Agent
        const result = await (0, CoordinatorAgent_1.runCoordinator)(prompt.trim());
        const elapsed = Date.now() - startTime;
        console.log(`[Server] Request completed in ${elapsed}ms`);
        // Return the structured response
        res.json({
            ...result,
            processing_time_ms: elapsed,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Server] Unhandled error: ${message}`);
        const elapsed = Date.now() - startTime;
        res.status(500).json({
            status: "error",
            final_response: `An unexpected error occurred: ${message}`,
            actions_taken: [],
            agents_used: [],
            processing_time_ms: elapsed,
        });
    }
});
// ---------------------------------------------------------------------------
// Catch-all: serve index.html for SPA-style routing
// ---------------------------------------------------------------------------
app.get("*", (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, "..", "public", "index.html"));
});
// ---------------------------------------------------------------------------
// Start the server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║       Multi-Agent Productivity Assistant                    ║
║       Server running on http://localhost:${PORT}               ║
╠══════════════════════════════════════════════════════════════╣
║  Agents:  Coordinator → Task | Knowledge | Schedule         ║
║  API:     POST /api/assistant                               ║
║  Health:  GET  /api/health                                  ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
exports.default = app;
//# sourceMappingURL=server.js.map