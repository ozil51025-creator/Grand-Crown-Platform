import { integer, jsonb, pgTable, timestamp } from "drizzle-orm/pg-core";

/**
 * Grand Crown keeps its existing domain model as one JSON document so the
 * migration does not reshape or discard historical ledger records.
 */
export const grandCrownStateTable = pgTable("grand_crown_state", {
  id: integer("id").primaryKey(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});