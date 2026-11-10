import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomBytes } from "node:crypto";
import type { CodeRunner, RunLimits, RunResult, VerifySnippet } from "@/lib/verify-execution";

// REQ-196: the sandbox for "verify by execution" (lib/verify-execution.ts).
//
// Model-written code runs ONLY here, and this module runs ONLY in GitHub
// Actions jobs (scripts/exec-checks.ts, scripts/factcheck-eval.ts), never in
// a Vercel function: lib/sandbox-boundary.test.ts fails if anything under
// app/ (or a module app/ imports) reaches it. Each program gets a fresh,
// throwaway Docker container:
//
//   --network none          no interfaces but loopback: no DNS, no egress
//   --env-file /dev/null    nothing from the job's environment (secrets, the
//                           database URL) -- docker passes no host env unless
//                           told to, and we tell it nothing
//   --read-only + tmpfs     the image is read-only; /scratch (the working
//                           directory) and /tmp are small RAM disks that die
//                           with the container; no host path is mounted
//   --user 65534            nobody; --cap-drop ALL; no-new-privileges; the
//                           default seccomp profile
//   --memory / --pids-limit / --cpus / ulimits
//                           memory, process count (a fork bomb stops at the
//                           limit), CPU share, open files, file size
//   timeoutMs (host side)   the container is killed when it runs past it
//   maxOutputBytes          the container is killed once stdout passes it
//
// The program is passed on stdin, so it is never written to the job's disk.
// Docker missing, the daemon down or an image missing is "unavailable": the
// caller records nothing as passed (fail closed) and the item stays
// exec_unverified.

export interface SandboxConfig {
  docker: string;
  pythonImage: string;
  nodeImage: string;
  memoryMb: number;
  cpus: number;
  pids: number;
  scratchMb: number;
}

export const DEFAULT_SANDBOX: SandboxConfig = {
  docker: "docker",
  // Built by the workflow from backend/sandbox/python.Dockerfile (standard
  // library + SymPy, pinned). Falls back to the plain image name locally.
  pythonImage: process.env.SANDBOX_PYTHON_IMAGE || "ascendra-sandbox-python:1",
  nodeImage: process.env.SANDBOX_NODE_IMAGE || "node:22-slim",
  memoryMb: 256,
  cpus: 1,
  pids: 64,
  scratchMb: 16,
};

// The docker argv for one run. Pure, so the restrictions are unit-tested
// (lib/sandbox-runner.test.ts) without a daemon.
export function dockerArgs(snippet: Pick<VerifySnippet, "language">, name: string, cfg: SandboxConfig = DEFAULT_SANDBOX): string[] {
  const image = snippet.language === "python" ? cfg.pythonImage : cfg.nodeImage;
  const cmd =
    snippet.language === "python"
      ? ["python3", "-I", "-"]
      : ["node", `--max-old-space-size=${Math.max(32, Math.floor(cfg.memoryMb / 2))}`, "-"];
  return [
    "run",
    "--rm",
    "-i",
    "--name", name,
    "--network", "none",
    "--env-file", "/dev/null",
    "--read-only",
    "--tmpfs", `/scratch:rw,nosuid,nodev,size=${cfg.scratchMb}m,uid=65534,gid=65534,mode=0700`,
    "--tmpfs", `/tmp:rw,nosuid,nodev,size=${cfg.scratchMb}m,uid=65534,gid=65534,mode=0700`,
    "--workdir", "/scratch",
    "--env", "HOME=/scratch",
    "--user", "65534:65534",
    "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges",
    "--memory", `${cfg.memoryMb}m`,
    "--memory-swap", `${cfg.memoryMb}m`,
    "--cpus", String(cfg.cpus),
    "--pids-limit", String(cfg.pids),
    "--ulimit", "nofile=64:64",
    "--ulimit", `fsize=${cfg.scratchMb * 1024 * 1024}`,
    "--ipc", "none",
    "--log-driver", "none",
    "--pull", "never",
    image,
    ...cmd,
  ];
}

// Docker's own failures (exit 125, or the CLI cannot reach the daemon) are
// infrastructure, not the program: "unavailable".
export function isDockerInfraFailure(code: number | null, stderr: string): boolean {
  if (code === 125) return true;
  return /Cannot connect to the Docker daemon|failed to connect to the docker API|No such image|Unable to find image/i.test(stderr);
}

export function dockerRunner(cfg: SandboxConfig = DEFAULT_SANDBOX): CodeRunner {
  return (snippet: VerifySnippet, limits: RunLimits): Promise<RunResult> =>
    new Promise<RunResult>((resolve) => {
      if (limits.network !== false) {
        resolve({ status: "unavailable" }); // this runner never grants network
        return;
      }
      const name = `asc-sbx-${randomBytes(8).toString("hex")}`;
      // env: only what the docker CLI needs to find its daemon.
      const env = { PATH: process.env.PATH ?? "/usr/bin:/bin", ...(process.env.DOCKER_HOST ? { DOCKER_HOST: process.env.DOCKER_HOST } : {}) } as unknown as NodeJS.ProcessEnv;
      let child: ChildProcessWithoutNullStreams;
      try {
        child = spawn(cfg.docker, dockerArgs(snippet, name, cfg), { stdio: ["pipe", "pipe", "pipe"], env });
      } catch {
        resolve({ status: "unavailable" });
        return;
      }
      let out = "";
      let err = "";
      let settled = false;
      let killedFor: "timeout" | "output" | null = null;
      const kill = (why: "timeout" | "output") => {
        if (killedFor) return;
        killedFor = why;
        spawn(cfg.docker, ["kill", name], { stdio: "ignore", env }).on("error", () => {});
        child.kill("SIGKILL");
      };
      const finish = (r: RunResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(r);
      };
      const timer = setTimeout(() => kill("timeout"), limits.timeoutMs);
      child.stdout.on("data", (b: Buffer) => {
        out += b.toString("utf8");
        if (Buffer.byteLength(out) > limits.maxOutputBytes) kill("output");
      });
      child.stderr.on("data", (b: Buffer) => {
        if (err.length < 2000) err += b.toString("utf8");
      });
      child.on("error", () => finish({ status: "unavailable" }));
      child.on("close", (code: number | null) => {
        if (killedFor === "timeout") return finish({ status: "error", message: `timed out after ${limits.timeoutMs} ms` });
        if (killedFor === "output") return finish({ status: "error", message: "printed too much" });
        if (isDockerInfraFailure(code, err)) return finish({ status: "unavailable" });
        if (code === 0) return finish({ status: "ok", stdout: out });
        const tail = err.trim().split(/\r?\n/).pop() ?? "";
        const why = code === 137 ? "killed (memory or process limit)" : `exit ${code}`;
        finish({ status: "error", message: `${why}${tail ? `: ${tail}` : ""}`.slice(0, 300) });
      });
      child.stdin.on("error", () => {});
      child.stdin.end(snippet.code);
    });
}

// ---------------------------------------------------------------------------
// Escape self-test
// ---------------------------------------------------------------------------
//
// Run before every batch (scripts/exec-checks.ts, scripts/factcheck-eval.ts)
// and by lib/sandbox-runner.sandboxtest.ts. If any probe gets out, the batch
// runs nothing (fail closed). `canary` is a value the caller puts in its own
// environment; the env probe fails if the program can see it.

export interface Probe {
  name: string;
  snippet: VerifySnippet;
  // ok: the run's result shows the sandbox held
  held: (r: RunResult) => boolean;
}

const printed = (r: RunResult, s: string) => r.status === "ok" && r.stdout.trim().split(/\r?\n/).pop() === s;
const stopped = (r: RunResult) => r.status === "error";

export function escapeProbes(canary: string): Probe[] {
  return [
    {
      name: "network: TCP to a public address",
      snippet: {
        language: "python",
        expected: "BLOCKED",
        code: `import socket\ntry:\n    socket.create_connection(("1.1.1.1", 443), timeout=2)\n    print("OPEN")\nexcept OSError:\n    print("BLOCKED")\n`,
      },
      held: (r) => printed(r, "BLOCKED"),
    },
    {
      name: "network: DNS lookup",
      snippet: {
        language: "python",
        expected: "BLOCKED",
        code: `import socket\ntry:\n    socket.getaddrinfo("api.anthropic.com", 443)\n    print("OPEN")\nexcept OSError:\n    print("BLOCKED")\n`,
      },
      held: (r) => printed(r, "BLOCKED"),
    },
    {
      name: "network: JavaScript fetch",
      snippet: {
        language: "javascript",
        expected: "BLOCKED",
        code: `fetch("https://example.com", { signal: AbortSignal.timeout(2000) }).then(() => console.log("OPEN"), () => console.log("BLOCKED"));`,
      },
      held: (r) => printed(r, "BLOCKED"),
    },
    {
      name: "env: no secret, no database URL",
      snippet: {
        language: "python",
        expected: "CLEAN",
        code: `import os\nbad = [k for k, v in os.environ.items() if ${JSON.stringify(canary)} in v or k in ("DATABASE_URL", "RECHECK_DATABASE_URL", "ANTHROPIC_API_KEY", "GITHUB_TOKEN", "ACTIONS_RUNTIME_TOKEN")]\nprint("LEAK " + ",".join(bad) if bad else "CLEAN")\n`,
      },
      held: (r) => printed(r, "CLEAN"),
    },
    {
      name: "env: JavaScript process.env",
      snippet: {
        language: "javascript",
        expected: "CLEAN",
        code: `const bad = Object.entries(process.env).filter(([k, v]) => String(v).includes(${JSON.stringify(canary)}) || /DATABASE_URL|ANTHROPIC|GITHUB_TOKEN/.test(k));\nconsole.log(bad.length ? "LEAK" : "CLEAN");`,
      },
      held: (r) => printed(r, "CLEAN"),
    },
    {
      name: "filesystem: nothing writable outside the scratch area, no host files",
      snippet: {
        language: "python",
        expected: "CONTAINED",
        code: [
          "import os",
          "escaped = []",
          "for p in ['/etc/pwned', '/usr/pwned', '/pwned', '/home/pwned', '/var/pwned', '/proc/sys/kernel/pwned']:",
          "    try:",
          "        open(p, 'w').write('x')",
          "        escaped.append(p)",
          "    except OSError:",
          "        pass",
          "for p in ['/home/runner', '/github', '/home/claude', '/root/.ssh', '/var/run/docker.sock']:",
          "    if os.path.exists(p):",
          "        escaped.append(p)",
          "open('/scratch/ok.txt', 'w').write('fine')",
          "print('ESCAPED ' + ','.join(escaped) if escaped else 'CONTAINED')",
        ].join("\n"),
      },
      held: (r) => printed(r, "CONTAINED"),
    },
    {
      name: "privilege: runs as nobody and cannot become root",
      snippet: {
        language: "python",
        expected: "NOBODY",
        code: `import os\ntry:\n    os.setuid(0)\n    print("ROOT")\nexcept PermissionError:\n    print("NOBODY" if os.getuid() == 65534 else "UID %d" % os.getuid())\n`,
      },
      held: (r) => printed(r, "NOBODY"),
    },
    {
      name: "fork bomb: stopped by the process limit or the timeout",
      snippet: {
        language: "python",
        expected: "never",
        code: `import os\nwhile True:\n    try:\n        os.fork()\n    except OSError:\n        pass\n`,
      },
      held: stopped,
    },
    {
      name: "timeout: an endless loop is killed",
      snippet: { language: "javascript", expected: "never", code: `for (;;) {}` },
      held: stopped,
    },
    {
      name: "memory: allocating 1 GB is refused",
      snippet: { language: "python", expected: "never", code: `x = bytearray(1024 * 1024 * 1024)\nprint(len(x))\n` },
      held: stopped,
    },
    {
      name: "output: a flood is cut off",
      snippet: { language: "python", expected: "never", code: `while True:\n    print("A" * 1000)\n` },
      held: stopped,
    },
  ];
}

export interface SelfTestResult {
  ok: boolean;
  available: boolean;
  probes: { name: string; held: boolean; result: string }[];
}

export async function sandboxSelfTest(runner: CodeRunner, limits: RunLimits, canary: string): Promise<SelfTestResult> {
  const probes: SelfTestResult["probes"] = [];
  let available = true;
  for (const p of escapeProbes(canary)) {
    const r = await runner(p.snippet, limits).catch((e): RunResult => ({ status: "error", message: String(e) }));
    if (r.status === "unavailable") available = false;
    const result = r.status === "ok" ? `printed ${JSON.stringify(r.stdout.trim().slice(-60))}` : r.status === "error" ? r.message : "unavailable";
    probes.push({ name: p.name, held: r.status !== "unavailable" && p.held(r), result });
  }
  return { ok: available && probes.every((p) => p.held), available, probes };
}
