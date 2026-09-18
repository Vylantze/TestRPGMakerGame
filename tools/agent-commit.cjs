// The repository-local git agent-commit alias calls this wrapper.
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { update } = require("./update-conversation-log.cjs");
const root = path.resolve(__dirname, "..");
function git(args) {
    const result = spawnSync("git", args, { cwd: root, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status || 1);
}
try {
    console.log("Refreshing conversation log before committing (" + update() + " visible messages).");
    git(["add", "--", "docs/conversation-log.txt"]);
    git(["-c", "user.name=Codex Agent", "-c", "user.email=mira.dev.agent@gmail.com", "commit", ...process.argv.slice(2)]);
} catch (error) { console.error(error.message); process.exitCode = 1; }
