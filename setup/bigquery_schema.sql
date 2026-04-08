-- ============================================================
-- BigQuery Schema for Multi-Agent Productivity Assistant
-- ============================================================
-- Run this with: bq query --use_legacy_sql=false < setup/bigquery_schema.sql
-- Or execute each statement in the BigQuery Console.
-- ============================================================

-- Step 1: Create the dataset (if it doesn't exist)
CREATE SCHEMA IF NOT EXISTS `productivity_assistant`
OPTIONS (
  description = 'Dataset for the Multi-Agent Productivity Assistant',
  location = 'US'
);

-- Step 2: Create the tasks table
CREATE TABLE IF NOT EXISTS `productivity_assistant.tasks` (
  id          STRING      NOT NULL  OPTIONS (description = 'Unique task identifier (UUID)'),
  description STRING      NOT NULL  OPTIONS (description = 'Human-readable task description'),
  status      STRING      NOT NULL  OPTIONS (description = 'Task status: PENDING | IN_PROGRESS | DONE'),
  due_date    TIMESTAMP             OPTIONS (description = 'Optional deadline for the task'),
  created_at  TIMESTAMP   NOT NULL  DEFAULT CURRENT_TIMESTAMP() OPTIONS (description = 'Row creation timestamp')
)
OPTIONS (
  description = 'Stores tasks managed by the Task Manager Agent'
);

-- Step 3: Create the notes table
CREATE TABLE IF NOT EXISTS `productivity_assistant.notes` (
  id          STRING      NOT NULL  OPTIONS (description = 'Unique note identifier (UUID)'),
  title       STRING      NOT NULL  OPTIONS (description = 'Title / heading of the note'),
  content     STRING      NOT NULL  OPTIONS (description = 'Full content body of the note'),
  created_at  TIMESTAMP   NOT NULL  DEFAULT CURRENT_TIMESTAMP() OPTIONS (description = 'Row creation timestamp')
)
OPTIONS (
  description = 'Stores project notes managed by the Knowledge Agent'
);
