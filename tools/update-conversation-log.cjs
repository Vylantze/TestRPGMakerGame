// Export visible conversation text, never tool output, hidden reasoning or credentials.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const root = path.resolve(__dirname, "..");
const logPath = path.join(root, "docs", "conversation-log.txt");

function redact(text) {
    return text
        .replace(/github(?:\\)?_pat(?:\\)?_[A-Za-z0-9_\\]+/g, "[REDACTED GITHUB ACCESS TOKEN]")
        .replace(/\bgh[pousr]_[A-Za-z0-9_]+/g, "[REDACTED GITHUB ACCESS TOKEN]")
        .replace(/\bsk-[A-Za-z0-9_-]{20,}/g, "[REDACTED API KEY]")
        .replace(/(\b(?:password|passwd|secret|access[_ -]?token|api[_ -]?key)\s*[:=]\s*)[^\s`]+/gi, "$1[REDACTED]");
}

function visibleMessages(rows) {
    const messages = [];
    let passwordTurn = false;
    for (const row of rows) {
        const item = row.payload;
        if (row.type !== "response_item" || !item) continue;
        if (item.type === "function_call" && /request_user_input(?:_async)?$/.test(item.name)) {
            const args = JSON.parse(item.arguments);
            const text = args.questions.map(q => (q.title || q.question) + (q.options ? "\nOptions: " + q.options.map(o => typeof o === "string" ? o : o.label + " — " + o.description).join("; ") : "")).join("\n\n");
            messages.push({ time: row.timestamp, role: "ASSISTANT QUESTIONS", text: redact(text) });
            continue;
        }
        if (item.type !== "message" || !["user", "assistant"].includes(item.role)) continue;
        if (item.role === "assistant" && !["commentary", "final_answer", "final"].includes(item.phase || item.channel)) continue;
        let text = (item.content || []).map(part => part.text || (part.type?.includes("image") ? "[Image attachment; binary data omitted.]" : "")).join("\n").trim();
        if (!text || /^(?:<recommended_plugins>|<environment_context>|# AGENTS\.md instructions)/.test(text)) continue;
        if (item.role === "user") passwordTurn = /(?:suggest|generate|create).*\bpassword\b/i.test(text);
        if (item.role === "assistant" && passwordTurn) text = "[REDACTED: password-suggestion response. Credential material is not stored in the repository.]";
        messages.push({ time: row.timestamp, role: item.role.toUpperCase(), text: redact(text) });
    }
    return messages;
}

function findSession(threadId, directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) { const found = findSession(threadId, full); if (found) return found; }
        else if (entry.name.endsWith(threadId + ".jsonl")) return full;
    }
    return null;
}

function update(sessionPath, outputPath = logPath) {
    if (!sessionPath) {
        const id = process.env.CODEX_THREAD_ID;
        if (!id) throw new Error("CODEX_THREAD_ID is unavailable. Run with --session <local rollout.jsonl>; no commit was made.");
        sessionPath = findSession(id, path.join(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"), "sessions"));
        if (!sessionPath) throw new Error("Current conversation transcript was not found; no commit was made.");
    }
    const lines = fs.readFileSync(sessionPath, "utf8").split("\n");
    const rows = lines.flatMap((line, i) => {
        if (!line.trim()) return [];
        try { return [JSON.parse(line)]; } catch (error) {
            // The live transcript can be in the middle of writing its last record.
            if (i === lines.length - 1) return [];
            throw error;
        }
    });
    const meta = rows.find(r => r.type === "session_meta")?.payload;
    const id = meta?.id || path.basename(sessionPath, ".jsonl");
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("Invalid transcript identifier.");
    const messages = visibleMessages(rows);
    if (!messages.length) throw new Error("No visible conversation messages found; no commit was made.");
    let text = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "FIRST JOURNEY — CONVERSATION LOG\n\nChronological user and visible assistant messages, with UTC timestamps.\nIncludes user-facing clarification questions. Credentials are redacted.\nTool traces, system/developer instructions, hidden reasoning, and binary images\nare omitted. Earlier decisions remain historical; later instructions supersede them.\nEach agent commit refreshes this file through its pre-commit cutoff. Replies\nwritten after a commit appear in the next refresh. Multiple task transcripts\nare retained as separate sections. This is a text export, not a raw session dump.\n";
    const start = "===== BEGIN THREAD " + id + " =====";
    const end = "===== END THREAD " + id + " =====";
    const section = start + "\nExport refreshed UTC: " + new Date().toISOString() + "\nLast included message UTC: " + messages.at(-1).time + "\n\n" + messages.map(m => "[" + m.time + "] " + m.role + "\n" + m.text).join("\n\n----------------------------------------\n\n") + "\n\n" + end;
    const from = text.indexOf(start), to = text.indexOf(end, from);
    if (from >= 0 && to < 0) throw new Error("Existing conversation section is incomplete; refusing to overwrite it.");
    text = from >= 0 ? text.slice(0, from) + section + text.slice(to + end.length) : text.trimEnd() + "\n\n" + section + "\n";
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, text);
    return messages.length;
}

if (require.main === module) {
    try {
        const args = process.argv.slice(2);
        if (args.length && (args.length !== 2 || args[0] !== "--session")) throw new Error("Usage: node tools/update-conversation-log.cjs [--session <rollout.jsonl>]");
        console.log("Conversation log refreshed: " + update(args[1]) + " visible messages; credentials redacted.");
    } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { redact, visibleMessages, update };
