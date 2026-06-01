import { rm, mkdir } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await rm("public/wasm", { recursive: true, force: true });
await mkdir("public/wasm", { recursive: true });
