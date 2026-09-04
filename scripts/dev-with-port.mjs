import { spawn } from "node:child_process";

const port = process.env.PORT || "3100";
const next = spawn("npx", ["next", "dev", "-p", port], { stdio: "inherit", shell: true });
next.on("exit", (code) => process.exit(code ?? 0));
