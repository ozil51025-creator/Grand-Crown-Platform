---
name: Grand Crown test storage
description: Runtime persistence uses PostgreSQL JSONB and hashed sessions; local JSON storage is test-only.
---

Grand Crown runtime state preserves its existing JSON document shape in PostgreSQL JSONB, and sessions persist as hashed tokens. The `GRAND_CROWN_DATA_FILE` option is for isolated tests only and must never be enabled in production.

**Why:** The migration preserves the existing ledger structure while making state and sessions durable across API restarts.

**How to apply:** Keep the JSON file adapter isolated to tests. Runtime startup must fail if the PostgreSQL state row is missing; preserve the JSON document shape and ensure production backups and owner credentials are ready before publishing.