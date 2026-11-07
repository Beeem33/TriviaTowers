/**
 * Applies supabase/migrations/*.sql in order, each once, recording them in
 * supabase_migrations.schema_migrations (the same table the Supabase CLI uses).
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_... node supabase/scripts/migrate.mjs [--status]
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "./lib.mjs";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
const quote = (s) => `'${s.replace(/'/g, "''")}'`;

await sql(`create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`);
const applied = new Set((await sql("select version from supabase_migrations.schema_migrations")).map((r) => r.version));
const files = (await readdir(dir)).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();

for (const file of files) {
  const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
  const name = rest.join("_");
  if (applied.has(version)) {
    console.log(`✓ ${file} (already applied)`);
    continue;
  }
  if (process.argv.includes("--status")) {
    console.log(`… ${file} (pending)`);
    continue;
  }
  const body = await readFile(path.join(dir, file), "utf8");
  // One request = one transaction: the migration and its bookkeeping row succeed or fail together.
  await sql(`begin;
${body}
insert into supabase_migrations.schema_migrations (version, name, statements) values (${quote(version)}, ${quote(name)}, array[${quote(body)}]);
commit;`);
  console.log(`→ ${file} applied`);
}
