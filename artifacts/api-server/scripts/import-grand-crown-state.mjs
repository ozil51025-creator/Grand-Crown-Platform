import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, grandCrownStateTable, pool } from "@workspace/db";

async function main() {
  const args = process.argv.slice(2).filter((argument) => argument !== "--");
  const sourceArgument = args[0];
  if (!sourceArgument) {
    throw new Error("Usage: pnpm --filter @workspace/api-server run state:import -- <source-json-path>");
  }

  const sourcePath = path.resolve(sourceArgument);
  const parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
      !parsed.settings || typeof parsed.settings !== "object" ||
      !Array.isArray(parsed.products)) {
    throw new Error("The source file is not a Grand Crown state document.");
  }

  try {
    const [existing] = await db
      .select({ id: grandCrownStateTable.id })
      .from(grandCrownStateTable)
      .where(eq(grandCrownStateTable.id, 1))
      .limit(1);
if (existing) {
  await db
    .update(grandCrownStateTable)
    .set({ payload: parsed })
    .where(eq(grandCrownStateTable.id, 1));
} else {
  await db.insert(grandCrownStateTable).values({
    id: 1,
    payload: parsed,
  });
}
    const collectionCounts = Object.fromEntries(
      ["users", "purchases", "transactions", "payments", "withdrawals", "giftCodes"]
        .map((key) => [key, Array.isArray(parsed[key]) ? parsed[key].length : 0]),
    );
    console.log(JSON.stringify({ imported: true, collectionCounts }));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "State import failed.");
  process.exitCode = 1;
});
