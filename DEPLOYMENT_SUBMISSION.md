# 📋 Deployment & Submission Document

## Multi-Agent Productivity Assistant

> **A production-ready, containerized multi-agent AI system** built with TypeScript, Google Gemini, BigQuery, and Model Context Protocol (MCP).

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                         │
│                  (public/index.html)                         │
│              HTML + CSS + Vanilla JavaScript                 │
└─────────────────────┬───────────────────────────────────────┘
                      │ POST /api/assistant { prompt }
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express.js API Server                      │
│                    (src/server.ts)                            │
│                      Port 8080                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              🎯 Coordinator Agent                            │
│          (src/agents/CoordinatorAgent.ts)                     │
│                                                              │
│   Gemini 2.0 Flash — Function Calling                        │
│   Analyzes request → Delegates to sub-agents                 │
│   Synthesizes unified response                               │
└──────┬──────────────┬──────────────────┬────────────────────┘
       │              │                  │
       ▼              ▼                  ▼
┌──────────┐   ┌──────────────┐   ┌──────────────┐
│  ✅ Task  │   │  📚 Knowledge │   │  📅 Schedule  │
│   Agent   │   │    Agent      │   │    Agent      │
│           │   │               │   │               │
│ Gemini FC │   │  Gemini FC    │   │  Gemini FC    │
└─────┬─────┘   └──────┬───────┘   └──────┬───────┘
      │                │                   │
      ▼                ▼                   ▼
┌──────────┐   ┌──────────────┐   ┌──────────────┐
│ BigQuery │   │   BigQuery    │   │  In-Memory   │
│  Tasks   │   │    Notes      │   │  Mock Cal.   │
│  Table   │   │    Table      │   │              │
└──────────┘   └──────────────┘   └──────────────┘

MCP Tools:                MCP Tools:           MCP Tools:
• createTask              • createNote          • checkAvailability
• getTasks                • getNotes            • scheduleMeeting
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript / Node.js |
| API Framework | Express.js |
| AI Engine | Google Gemini 2.0 Flash (`@google/genai`) |
| Database | Google BigQuery (`@google-cloud/bigquery`) |
| Tool Protocol | Model Context Protocol (`@modelcontextprotocol/sdk`) |
| Frontend | HTML5, CSS3, Vanilla JS |
| Containerization | Docker (multi-stage, Alpine) |
| Deployment | Google Cloud Run |
| Testing / Demo | Playwright (automated video recording) |

### Multi-Agent Topology

1. **Coordinator Agent** — The primary orchestrator. Receives user requests, decomposes them into sub-tasks, delegates to specialized agents, and synthesizes a unified response.
2. **Task Manager Agent** — Creates and retrieves tasks via BigQuery. Uses `createTask` and `getTasks` MCP tools.
3. **Knowledge Agent** — Manages project notes and documentation via BigQuery. Uses `createNote` and `getNotes` MCP tools.
4. **Schedule Agent** — Handles calendar availability and meeting booking via mock calendar. Uses `checkAvailability` and `scheduleMeeting` MCP tools.

---

## 🔧 Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Google Cloud SDK** (`gcloud`) installed and configured
3. **Node.js 20+** and **npm** installed
4. **Docker** installed (for containerization)
5. **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/apikey)

---

## 📦 Local Setup

### 1. Clone the Repository

```bash
git clone [INSERT_GITHUB_REPO_LINK]
cd multi-agent-productivity-assistant
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
GEMINI_API_KEY=your_actual_gemini_api_key
GOOGLE_CLOUD_PROJECT=your_gcp_project_id
BIGQUERY_DATASET=productivity_assistant
PORT=8080
```

### 4. Set Up Google Cloud Authentication

For local development, use Application Default Credentials:

```bash
# Login to Google Cloud
gcloud auth login

# Set the active project
gcloud config set project your_gcp_project_id

# Set up Application Default Credentials (for BigQuery access)
gcloud auth application-default login
```

### 5. Set Up BigQuery

Create the dataset and tables:

```bash
# Option A: Use the bq command-line tool
bq query --use_legacy_sql=false < setup/bigquery_schema.sql

# Option B: Run each statement in the BigQuery Console
# Copy the contents of setup/bigquery_schema.sql into
# https://console.cloud.google.com/bigquery
```

### 6. Build and Run Locally

```bash
# Build TypeScript
npm run build

# Start the server
npm start

# OR run in development mode (with ts-node)
npm run dev
```

The server will start on `http://localhost:8080`.

### 7. Generate Demo Video (Optional)

First, install Playwright browsers:

```bash
npx playwright install chromium
```

Then, with the server running in another terminal:

```bash
npm run test:demo
```

The video will be saved to the `videos/` directory.

---

## ☁️ Cloud Run Deployment

### Step 1: Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  bigquery.googleapis.com \
  artifactregistry.googleapis.com
```

### Step 2: Build and Push Container Image

```bash
# Set your project ID
export PROJECT_ID=your_gcp_project_id
export REGION=us-central1

# Build using Cloud Build (recommended)
gcloud builds submit --tag gcr.io/$PROJECT_ID/productivity-assistant

# OR build locally and push
docker build -t gcr.io/$PROJECT_ID/productivity-assistant .
docker push gcr.io/$PROJECT_ID/productivity-assistant
```

### Step 3: Deploy to Cloud Run

```bash
gcloud run deploy productivity-assistant \
  --image gcr.io/$PROJECT_ID/productivity-assistant \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 120 \
  --set-env-vars "GEMINI_API_KEY=your_gemini_api_key,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,BIGQUERY_DATASET=productivity_assistant"
```

> **⚠️ Security Note**: For production, use **Secret Manager** instead of passing the API key as an environment variable:
>
> ```bash
> # Store the secret
> echo -n "your_gemini_api_key" | gcloud secrets create gemini-api-key --data-file=-
>
> # Deploy with secret reference
> gcloud run deploy productivity-assistant \
>   --image gcr.io/$PROJECT_ID/productivity-assistant \
>   --region $REGION \
>   --platform managed \
>   --allow-unauthenticated \
>   --set-secrets "GEMINI_API_KEY=gemini-api-key:latest"
> ```

### Step 4: Verify Deployment

```bash
# Get the service URL
gcloud run services describe productivity-assistant \
  --region $REGION \
  --format 'value(status.url)'

# Test the health endpoint
curl $(gcloud run services describe productivity-assistant \
  --region $REGION \
  --format 'value(status.url)')/api/health
```

---

## ✅ Verification Checklist

- [ ] BigQuery dataset `productivity_assistant` exists with `tasks` and `notes` tables
- [ ] `GET /api/health` returns `{ "status": "healthy" }`
- [ ] `POST /api/assistant` with a simple prompt returns a valid multi-agent response
- [ ] Frontend loads and displays the agent chips and input form
- [ ] Example prompts populate the textarea when clicked
- [ ] Multi-step prompts correctly delegate to multiple sub-agents
- [ ] Actions timeline shows which tools were invoked
- [ ] Video walkthrough generates successfully

---

## 📁 Project Structure

```
multi-agent-productivity-assistant/
├── public/
│   └── index.html              # Frontend UI
├── scripts/
│   └── generate_walkthrough.ts  # Playwright video demo
├── setup/
│   └── bigquery_schema.sql      # BigQuery DDL
├── src/
│   ├── agents/
│   │   ├── CoordinatorAgent.ts  # Primary orchestrator
│   │   ├── TaskAgent.ts         # Task management agent
│   │   ├── KnowledgeAgent.ts    # Knowledge/notes agent
│   │   └── ScheduleAgent.ts     # Calendar/scheduling agent
│   ├── mcp/
│   │   ├── bigquery_tasks.ts    # BigQuery tasks tool
│   │   ├── bigquery_notes.ts    # BigQuery notes tool
│   │   └── mock_calendar.ts     # Mock calendar tool
│   └── server.ts                # Express API server
├── videos/                      # Generated walkthrough videos
├── .dockerignore
├── .env.example
├── Dockerfile
├── DEPLOYMENT_SUBMISSION.md
├── package.json
└── tsconfig.json
```

---

## 🔗 Submission Links

| Item | Link |
|------|------|
| **Cloud Run URL** | [INSERT_CLOUD_RUN_URL_HERE] |
| **GitHub Repository** | [INSERT_GITHUB_REPO_LINK] |
| **Demo Video** | [INSERT_DEMO_VIDEO_LINK] |

---

## 📝 License

MIT License — see [LICENSE](./LICENSE) for details.
