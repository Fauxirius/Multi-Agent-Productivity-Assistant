# Multi‑Agent Productivity Assistant

A production‑ready, containerized, TypeScript‑based assistant that orchestrates multiple AI agents (Task, Knowledge, Schedule) using Google Gemini, BigQuery, and a modern Express API.

---

## ✨ Features
- **Coordinator Agent** that routes requests to specialized sub‑agents.
- **Express API** with TypeScript typings.
- **Dockerized** – ready for any container platform.
- **Deployable to Google Cloud Run** (see `DEPLOYMENT_SUBMISSION.md`).
- **Playwright tests** for end‑to‑end verification (future work).

---

## 🚀 Quick Start (local development)
```bash
# Clone the repo (once you have pushed it)
git clone https://github.com/Fauxirius/Multi-Agent-Productivity-Assistant.git
cd Multi-Agent-Productivity-Assistant

# Install dependencies
npm install

# Run the development server
npm run dev
```
The server will start on `http://localhost:3000` (or the port defined in `.env`).

---

## 🐳 Running with Docker
```bash
# Build the image
docker build -t multi-agent-assistant .

# Run the container (exposes port 8080 by default)
docker run -p 8080:8080 multi-agent-assistant
```

---

## ☁️ Deploy to Google Cloud Run
1. **Create a Google Cloud project** and enable Cloud Build, Cloud Run, and Artifact Registry.
2. **Build & push the image**:
   ```bash
   export PROJECT_ID=YOUR_PROJECT_ID
   export REGION=us-central1
   export REPO_NAME=multi-agent-repo
   export IMAGE_NAME=multi-agent-productivity-assistant

   gcloud artifacts repositories create $REPO_NAME \
     --repository-format=docker \
     --location=$REGION

   gcloud builds submit . \
     --tag "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME"
   ```
3. **Deploy**:
   ```bash
   gcloud run deploy $IMAGE_NAME \
     --image "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME" \
     --platform managed \
     --region $REGION \
     --allow-unauthenticated \
     --port 8080
   ```
4. Retrieve the service URL:
   ```bash
   gcloud run services describe $IMAGE_NAME \
     --platform managed \
     --region $REGION \
     --format 'value(status.url)'
   ```

---

## 📦 Project Structure
```
.
├── src/                 # TypeScript source code
│   ├── agents/          # Agent implementations (TaskAgent, KnowledgeAgent, …)
│   └── server.ts        # Express server entry point
├── Dockerfile           # Container definition
├── .dockerignore        # Files excluded from the image
├── package.json         # npm scripts and dependencies
├── tsconfig.json        # TypeScript configuration
└── README.md            # You are reading it! 🎉
```

---

## 🛠️ Development Tools
- **Node.js** (>=18)
- **npm** (or yarn/pnpm)
- **Docker** (for container builds)
- **Google Cloud SDK** (`gcloud`) – required for Cloud Run deployment

---

## 📜 License
MIT – feel free to fork, modify, and deploy.

---

## 🙋‍♂️ Contributing
Open an issue or submit a PR. Please keep the code style consistent (prettier + eslint) and update documentation when adding new features.
