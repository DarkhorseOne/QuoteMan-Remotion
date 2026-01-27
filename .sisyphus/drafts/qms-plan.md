# Draft: Local Quote Management System

## Requirements (Confirmed)

- **Database**: SQLite3 (Local)
- **Ingestion**:
  - Source: `quotes/bank/*.json` + `quotes/tags.md`
  - Logic: Import, deduplicate, manage status
- **Web Interface**:
  - Next.js (Admin Dashboard)
  - Features: Filter/View, Trigger Scripts (TTS, Render), Sync to Drive, Schedule
- **Google Drive Sync**:
  - Upload MP4s
  - Store Drive IDs
- **Architecture**: Local tool, needs to bridge web -> shell scripts

## Open Questions

- [ ] **Project Structure**: Subfolder (`/admin`) with own package.json vs Root integration?
- [ ] **Drive Auth**: Service Account (easier for backend) vs OAuth (user context)?
- [ ] **Scheduling**: Is this just metadata storage? Or do we need a background worker to actually _post_?
- [ ] **Deduplication**: Hash of (text + author)?
- [ ] **Execution**: Confirm `child_process.exec` is acceptable for local script triggering.
