import { spawn } from "node:child_process";

const attempts = 3;
const excludedServices = "edge-runtime,imgproxy,logflare,studio,vector";
const transientStartupFailure = /toomanyrequests|rate exceeded|unexpected eof|\beof\b|i\/o timeout|tls handshake timeout|connection reset|temporary failure/i;

function runStart() {
  return new Promise((resolve) => {
    const child = spawn("npx", ["supabase", "start", "--yes", "--exclude", excludedServices], {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", (error) => resolve({ code: 1, output: error.message }));
    child.on("exit", (code) => resolve({ code: code ?? 1, output }));
  });
}

function safeFailureSummary(output) {
  const safeLines = output
    .split(/\r?\n/)
    .filter((line) => /applying migration|error response|toomanyrequests|rate exceeded|health check|starting database|initialising schema|error:/i.test(line))
    .slice(-20);
  return safeLines.length > 0 ? safeLines.join("\n") : "Supabase startup failed before a safe diagnostic could be collected.";
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const result = await runStart();
  if (result.code === 0) {
    process.stdout.write("Local Supabase stack started successfully.\n");
    process.exit(0);
  }

  const retry = attempt < attempts && transientStartupFailure.test(result.output);
  process.stderr.write(`Supabase startup attempt ${attempt}/${attempts} failed.\n${safeFailureSummary(result.output)}\n`);
  if (!retry) process.exit(result.code);
  await new Promise((resolve) => setTimeout(resolve, attempt * 4_000));
}
