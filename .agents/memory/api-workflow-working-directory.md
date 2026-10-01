---
name: API workflow working directory
description: The API workflow runs from the API artifact directory, which affects relative local-storage paths.
---

The API workflow’s process working directory is the API artifact directory rather than the monorepo root.

**Why:** A path built as `process.cwd()/artifacts/api-server/...` can point to a nested duplicate data file and cause runtime settings to differ from the repository copy.

**How to apply:** When changing local API storage paths or settings, verify the resolved runtime file from the workflow and keep repository and runtime data sources consistent.