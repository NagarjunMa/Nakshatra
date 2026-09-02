import { spawn } from "node:child_process";

const excludedServices = "edge-runtime,imgproxy,logflare,studio,vector";

function run(command, args, { quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit",
      shell: process.platform === "win32",
    });
    let output = "";
    if (quiet) {
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.stderr.on("data", (chunk) => { output += chunk; });
    }
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve(output) : reject(new Error(`${command} ${args.join(" ")} exited ${code ?? "unknown"}`))));
  });
}

try {
  await run("npx", ["supabase", "status", "--output", "json"], { quiet: true });
  throw new Error("a local Supabase stack is already running; use test:db:reset and test:db, or stop it before db:verify");
} catch (error) {
  if (error.message.startsWith("a local Supabase stack")) throw error;
}

let startAttempted = false;
try {
  startAttempted = true;
  await run("npx", ["supabase", "start", "--yes", "--exclude", excludedServices]);
  await run("npx", ["supabase", "db", "reset", "--local"]);
  await run("npx", ["supabase", "test", "db", "supabase/tests/database", "--local"]);
} finally {
  if (startAttempted) {
    try {
      await run("npx", ["supabase", "stop"], { quiet: false });
    } catch (error) {
      process.stderr.write(`Unable to stop the local Supabase stack: ${error.message}\n`);
    }
  }
}
