import { spawnSync } from "node:child_process";

const cliVersion = spawnSync("npx", ["supabase", "--version"], { encoding: "utf8" });
const containers = spawnSync("docker", ["ps", "--all", "--format", "{{.Names}}\t{{.Status}}"], { encoding: "utf8" });

process.stdout.write(`Supabase CLI: ${(cliVersion.stdout || cliVersion.stderr || "unavailable").trim()}\n`);
process.stdout.write("Container status (names and statuses only):\n");
process.stdout.write(containers.stdout || containers.stderr || "Docker status unavailable\n");
