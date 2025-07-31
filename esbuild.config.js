import { build } from "esbuild";
import { spawn } from "child_process";

async function start() {
  await build({
    entryPoints: ["index.ts"],
    outfile: "dist/index.js",
    bundle: true,
    platform: "node",
    target: "node18",
  });

  const proc = spawn("node", ["dist/index.js"], { stdio: "inherit" });
}

start();
