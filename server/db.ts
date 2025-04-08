import { drizzle } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "../shared/schema";

// Check for DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Configure Neon client
neonConfig.fetchConnectionCache = true;

// Create a Neon connection
const sql = neon(process.env.DATABASE_URL);

// Create a Drizzle client
export const db = drizzle(sql, { schema });
