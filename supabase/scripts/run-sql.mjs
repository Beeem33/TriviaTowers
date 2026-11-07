/** Runs a SQL file against the project. Usage: node supabase/scripts/run-sql.mjs path/to/file.sql */
import { readFile } from "node:fs/promises";
import { sql } from "./lib.mjs";

const file = process.argv[2];
if (!file) throw new Error("Usage: node supabase/scripts/run-sql.mjs <file.sql>");
const result = await sql(await readFile(file, "utf8"));
console.log(Array.isArray(result) && result.length ? result : "ok");
