const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const { redact, visibleMessages, update } = require("./update-conversation-log.cjs");
const message = (role, text, phase = "final_answer") => ({ type: "response_item", timestamp: "2026-09-19T00:00:00Z", payload: { type: "message", role, phase, content: [{ type: "input_text", text }] } });
let passed = 0;
function test(name, run) { run(); console.log("PASS " + name); passed++; }

test("Plain and Markdown-escaped credentials are redacted", () => {
    const token = ["github", "pat", "exampleOnly123"].join("_");
    assert.ok(!redact(token).includes(token));
    assert.ok(!redact(token.replaceAll("_", "\\_")).includes("exampleOnly123"));
    assert.equal(redact("password: exampleOnly"), "password: [REDACTED]");
});
test("Password suggestions are removed but later conversation remains", () => {
    const messages = visibleMessages([message("user", "Suggest a suitable password"), message("assistant", "exampleOnlyPassword"), message("user", "Continue the game"), message("assistant", "Continuing")]);
    assert.ok(messages[1].text.includes("REDACTED"));
    assert.ok(!messages[1].text.includes("exampleOnlyPassword"));
    assert.equal(messages[3].text, "Continuing");
});
test("Only visible dialogue and clarification questions are exported", () => {
    const messages = visibleMessages([
        message("system", "internal"), message("assistant", "private reasoning", "analysis"),
        message("user", "<environment_context>metadata</environment_context>"),
        { type: "response_item", payload: { type: "function_call_output", output: "tool data" } },
        message("user", "Fantasy adventure"),
        { type: "response_item", timestamp: "2026-09-19T00:00:01Z", payload: { type: "function_call", name: "request_user_input_async", arguments: JSON.stringify({ questions: [{ title: "Which role?", options: ["Priestess", "Fighter"] }] }) } }
    ]);
    assert.equal(messages.length, 2);
    assert.ok(messages[1].text.includes("Priestess; Fighter"));
});

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "journey-log-test-"));
const session = path.join(temp, "session.jsonl"), output = path.join(temp, "log.txt");
try {
    const write = (id, texts) => fs.writeFileSync(session, [{ type: "session_meta", payload: { id } }, ...texts.map(t => message("user", t))].map(r => JSON.stringify(r)).join("\n") + "\n");
    test("Refresh replaces its own section and preserves other task sections", () => {
        write("task-one", ["First request"]); update(session, output);
        write("task-two", ["Second request"]); update(session, output);
        write("task-one", ["First request", "Follow-up"]); update(session, output);
        const text = fs.readFileSync(output, "utf8");
        assert.equal(text.split("First request").length - 1, 1);
        assert.ok(text.includes("Second request") && text.includes("Follow-up"));
    });
    test("An incomplete final record is tolerated, malformed earlier data fails", () => {
        write("task-one", ["Complete message"]); fs.appendFileSync(session, '{"partial":');
        assert.equal(update(session, output), 1);
        const before = fs.readFileSync(output, "utf8");
        fs.writeFileSync(session, "invalid\n{}\n");
        assert.throws(() => update(session, output));
        assert.equal(fs.readFileSync(output, "utf8"), before);
    });
    test("Commit wrapper refuses to commit without a current transcript", () => {
        const env = { ...process.env }; delete env.CODEX_THREAD_ID;
        const result = spawnSync(process.execPath, [path.join(__dirname, "agent-commit.cjs"), "-m", "Must not commit"], { env, encoding: "utf8" });
        assert.equal(result.status, 1);
        assert.ok(result.stderr.includes("no commit was made"));
    });
} finally {
    for (const file of [session, output]) if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(temp);
}
console.log(passed + " conversation-log checks passed.");
