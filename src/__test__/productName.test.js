/* eslint-env jest */
import fs from "fs";
import path from "path";

/* The product is MaidMatch (CLAUDE.md §4.7). Some source documents say "MatchCare"; it must never reach code, copy or
   config (Step 8 F10: the last one was the Worker WhatsApp template note). */

const ROOT = path.resolve(__dirname, "../..");
const WRONG = new RegExp(["match", "care"].join(""), "i");
const SELF = path.resolve(__filename);

const filesUnder = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full);
    return /\.(js|jsx|ts|tsx|json|css|html)$/.test(entry.name) ? [full] : [];
});

test("no file in src or public says the wrong product name", () => {
    const offenders = [...filesUnder(path.join(ROOT, "src")), ...filesUnder(path.join(ROOT, "public"))]
        .filter((file) => path.resolve(file) !== SELF)
        .filter((file) => WRONG.test(fs.readFileSync(file, "utf8")) || WRONG.test(file))
        .map((file) => path.relative(ROOT, file));
    expect(offenders).toEqual([]);
});
