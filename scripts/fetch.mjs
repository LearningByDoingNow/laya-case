import { fetchBlogs } from "./fetch-blogs.mjs";
import { fetchGithub } from "./fetch-github.mjs";
import { fetchHf } from "./fetch-hf.mjs";
import { fetchReddit } from "./fetch-reddit.mjs";

const SOURCES = {
  github: fetchGithub,
  hf: fetchHf,
  reddit: fetchReddit,
  blogs: fetchBlogs,
};

const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
const only = (onlyArg?.split("=")[1] ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

const started = Date.now();

for (const [name, run] of Object.entries(SOURCES)) {
  if (only.length && !only.includes(name)) continue;
  try {
    const count = await run();
    console.log(`✔ ${name}: ${count} cases -> src/data/auto/${name}.json`);
  } catch (error) {
    console.error(`✘ ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

console.log(`fetch finished in ${((Date.now() - started) / 1000).toFixed(1)}s`);
