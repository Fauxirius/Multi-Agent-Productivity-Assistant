/**
 * ============================================================
 * Automated Video Walkthrough — Playwright
 * ============================================================
 * Generates a demo video of the Multi-Agent Productivity
 * Assistant by:
 *   1. Launching a headed Chromium browser with video recording.
 *   2. Navigating to the local server.
 *   3. Filling the prompt with a complex multi-step request.
 *   4. Submitting and waiting for the response.
 *   5. Pausing so the final state is visible on camera.
 *   6. Closing the browser and saving the .webm video.
 *
 * Run: npx ts-node scripts/generate_walkthrough.ts
 * Prerequisite: Server must be running on http://localhost:8080
 * ============================================================
 */

import { chromium, Browser, BrowserContext, Page } from "playwright";
import * as path from "path";
import * as fs from "fs";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const VIDEOS_DIR = path.resolve(__dirname, "..", "videos");

// The complex multi-step prompt used in the demo
const DEMO_PROMPT = [
  "Set up a new project kickoff for the 'Atlas Platform' project:",
  "",
  "1. Create an initial task list with these 3 tasks:",
  "   - Design the system architecture diagram (due in 2 weeks)",
  "   - Set up the CI/CD pipeline with GitHub Actions",
  "   - Write API specification document for the core endpoints",
  "",
  "2. Schedule a kickoff meeting for next Tuesday at 10:00 AM",
  "   with the engineering team.",
  "",
  "3. Draft a project overview note documenting the objectives,",
  "   tech stack, and initial milestones for the Atlas Platform.",
].join("\n");

// ---------------------------------------------------------------------------
// Main walkthrough script
// ---------------------------------------------------------------------------
async function generateWalkthrough(): Promise<void> {
  console.log("🎬 Starting automated walkthrough recording...\n");

  // Ensure the videos directory exists
  if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    console.log(`📁 Created videos directory: ${VIDEOS_DIR}`);
  }

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  try {
    // -----------------------------------------------------------------------
    // Step 1: Launch browser with video recording
    // -----------------------------------------------------------------------
    console.log("1️⃣  Launching Chromium browser...");
    browser = await chromium.launch({
      headless: true, // Set to false for visual debugging
    });

    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: {
        dir: VIDEOS_DIR,
        size: { width: 1440, height: 900 },
      },
    });

    const page: Page = await context.newPage();

    // -----------------------------------------------------------------------
    // Step 2: Navigate to the application
    // -----------------------------------------------------------------------
    console.log(`2️⃣  Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500); // Let animations settle

    console.log("   ✅ Page loaded successfully");

    // -----------------------------------------------------------------------
    // Step 3: Fill the prompt textarea
    // -----------------------------------------------------------------------
    console.log("3️⃣  Typing the demo prompt...");
    const textarea = page.locator("#prompt-input");
    await textarea.click();
    await page.waitForTimeout(500);

    // Type character by character for a realistic demo effect
    // (but not too slowly — we batch it)
    await textarea.fill(DEMO_PROMPT);
    await page.waitForTimeout(1000);
    console.log("   ✅ Prompt entered");

    // -----------------------------------------------------------------------
    // Step 4: Click Submit
    // -----------------------------------------------------------------------
    console.log("4️⃣  Clicking Submit button...");
    const submitBtn = page.locator("#submit-btn");
    await submitBtn.click();
    console.log("   ⏳ Waiting for AI response (this may take 30-90 seconds)...");

    // -----------------------------------------------------------------------
    // Step 5: Wait for the response to appear
    // -----------------------------------------------------------------------
    // The output area becomes visible when results arrive
    await page.locator("#output-area.visible").waitFor({
      state: "visible",
      timeout: 120_000, // 2-minute timeout for AI processing
    });

    console.log("   ✅ Response received!");

    // -----------------------------------------------------------------------
    // Step 6: Pause to capture the final state
    // -----------------------------------------------------------------------
    console.log("5️⃣  Holding final frame for 3 seconds...");
    await page.waitForTimeout(3000);

    // Scroll down to show the actions timeline if it's below the fold
    await page.evaluate(() => {
      const actions = document.getElementById("actions-timeline");
      if (actions) {
        actions.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
    await page.waitForTimeout(2000);

    // -----------------------------------------------------------------------
    // Step 7: Close and save
    // -----------------------------------------------------------------------
    console.log("6️⃣  Closing browser and saving video...\n");

    // Close the page first to ensure video is finalized
    await page.close();
    await context.close();
    await browser.close();

    // Find the generated video file
    const videoFiles = fs
      .readdirSync(VIDEOS_DIR)
      .filter((f) => f.endsWith(".webm"))
      .sort((a, b) => {
        const aTime = fs.statSync(path.join(VIDEOS_DIR, a)).mtimeMs;
        const bTime = fs.statSync(path.join(VIDEOS_DIR, b)).mtimeMs;
        return bTime - aTime; // Most recent first
      });

    if (videoFiles.length > 0) {
      const latestVideo = path.join(VIDEOS_DIR, videoFiles[0]);
      console.log("═".repeat(60));
      console.log("🎬 WALKTHROUGH VIDEO GENERATED SUCCESSFULLY!");
      console.log(`📁 Location: ${latestVideo}`);
      console.log(`📊 File size: ${(fs.statSync(latestVideo).size / 1024).toFixed(1)} KB`);
      console.log("═".repeat(60));
    } else {
      console.log("⚠️  Video file not found in the expected directory.");
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Walkthrough failed: ${message}\n`);

    // Cleanup on error
    if (context) {
      try { await context.close(); } catch { /* ignore */ }
    }
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }

    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Execute
// ---------------------------------------------------------------------------
generateWalkthrough();
