import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDirectory = path.join(root, "supabase", "migrations");
const testsDirectory = path.join(root, "supabase", "tests", "database");
const fixtureInclude = "\\ir auth-fixtures.psql";
const migrationPattern = /^(\d{14})_[a-z0-9][a-z0-9_]*\.sql$/;
const runtimeRolePattern = /\bset\s+(?:local\s+)?role\s+(authenticated|anon|service_role)\s*;/i;
const authFixturePattern = /pg_temp\.create_auth_(?:actor|session)\(\s*'([^']+)'\s*,\s*'([^']+)'/gi;
const directJwtClaimsPattern = /set\s+local\s+request\.jwt\.claims\s*=\s*'(\{.*\})'\s*;/i;
const invalidAuthClaimsMarker = "-- db:smoke: allow-invalid-auth-claims";

function fail(message) {
  process.stderr.write(`db:smoke: ${message}\n`);
  process.exitCode = 1;
}

async function checkMigrations() {
  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql"));
  const versions = new Set();
  let previous = "";

  for (const file of files.sort()) {
    const match = migrationPattern.exec(file);
    if (!match) {
      fail(`invalid migration filename: ${file}`);
      continue;
    }
    if (versions.has(match[1])) fail(`duplicate migration version: ${match[1]}`);
    if (previous && file <= previous) fail(`migration ordering is not strictly increasing: ${file}`);
    versions.add(match[1]);
    previous = file;
  }
}

function firstContentLine(source) {
  return source.split(/\r?\n/).find((line) => line.trim() && !line.trim().startsWith("--"))?.trim();
}

function authFixturePairs(source) {
  const pairs = new Set();
  for (const match of source.matchAll(authFixturePattern)) {
    pairs.add(`${match[1]}:${match[2]}`);
  }
  return pairs;
}

async function checkTestFiles() {
  const files = (await readdir(testsDirectory)).filter((file) => file.endsWith(".test.sql"));

  for (const file of files) {
    const source = await readFile(path.join(testsDirectory, file), "utf8");
    const roleSensitive = runtimeRolePattern.test(source);
    const fixturePairs = authFixturePairs(source);

    if (firstContentLine(source)?.toLowerCase() !== "begin;") {
      fail(`${file} must start with begin;`);
    }
    if (!/select\s+\*\s+from\s+finish\(\)\s*;\s*rollback\s*;\s*$/is.test(source)) {
      fail(`${file} must end with finish() followed by rollback;`);
    }
    if (roleSensitive && !source.includes(fixtureInclude)) {
      fail(`${file} must load ${fixtureInclude} before exercising runtime roles`);
    }
    if (roleSensitive && /insert\s+into\s+auth\.(?:users|sessions)\b/i.test(source)) {
      fail(`${file} must create Auth fixtures through pg_temp.create_auth_actor/create_auth_session`);
    }

    let activeRole = null;
    let allowInvalidAuthClaims = false;
    for (const [index, line] of source.split(/\r?\n/).entries()) {
      const trimmed = line.trim();
      if (trimmed === invalidAuthClaimsMarker) {
        allowInvalidAuthClaims = true;
        continue;
      }

      const roleMatch = line.match(runtimeRolePattern);
      if (roleMatch) activeRole = roleMatch[1].toLowerCase();
      if (/reset\s+role\s*;/i.test(line)) activeRole = null;

      if (activeRole && /app_private\./i.test(line)) {
        fail(`${file}:${index + 1} references app_private while running as ${activeRole}; reset role before private inspection`);
      }

      const claimsMatch = line.match(directJwtClaimsPattern);
      if (claimsMatch) {
        try {
          const claims = JSON.parse(claimsMatch[1]);
          if (claims.role === "authenticated") {
            const fixturePair = `${claims.sub}:${claims.session_id}`;
            if (!fixturePairs.has(fixturePair) && !allowInvalidAuthClaims) {
              fail(`${file}:${index + 1} has authenticated JWT claims without a matching Auth fixture; use pg_temp.set_authenticated_claims or mark an intentional negative case with ${invalidAuthClaimsMarker}`);
            }
          }
        } catch {
          fail(`${file}:${index + 1} has invalid JSON in request.jwt.claims`);
        }
        allowInvalidAuthClaims = false;
      } else if (trimmed && !trimmed.startsWith("--")) {
        allowInvalidAuthClaims = false;
      }
    }
  }
}

await Promise.all([checkMigrations(), checkTestFiles()]);

if (!process.exitCode) process.stdout.write("db:smoke passed\n");
