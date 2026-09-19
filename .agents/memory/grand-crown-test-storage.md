---
name: Grand Crown test storage
description: Why the current Grand Crown build uses local JSON storage and what must change before production.
---

The current Grand Crown build deliberately uses atomic JSON-file storage and in-memory sessions so the uploaded platform can run immediately without external service setup.

**Why:** The requested outcome was a working test link from an incomplete upload, and the existing source already modeled its records in JSON.

**How to apply:** Keep this storage strategy for local testing only. Before real-money production use, migrate records and sessions to persistent, backed-up storage and replace the default admin credentials.