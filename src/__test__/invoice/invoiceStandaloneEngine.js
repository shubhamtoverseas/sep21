/* eslint-env jest */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

/* The pricing endpoint for the Standalone Invoice walks (INV-G3, INV-G4): the contract repo's own engine
   (src/domain/invoicePricing/engine.ts, transpiled as it is: it imports nothing) on the appendix A Price List snapshot its
   tests build, as in invoiceItemsFlows.test.js, answering POST /invoices/price route "standalone" the way the contract
   caller does (invoice.pricing.services priceStandaloneInvoice: the party's facts read on the server, the record key on a
   creatable answer). Needs the maidmatch-contract checkout next to this repo (or CONTRACT_API_DIR); DATA is null without
   it and the walks are skipped. */

const contractDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
export const hasContract = fs.existsSync(path.join(contractDir, "src/domain/invoicePricing/engine.ts"));

const PROVIDER = `
for (const [k, v] of Object.entries({ PHILIPPINES_NATIONALITY_ID: "71", INDONESIAN_NATIONALITY_ID: "95", THAI_NATIONALITY_ID: "198",
    BANGLADESHI_NATIONALITY_ID: "18", PHILIPPINES_COUNTRY_ID: "141", INDONESIAN_COUNTRY_ID: "77", THAI_COUNTRY_ID: "170",
    BANGLADESHI_COUNTRY_ID: "14", CONTRACT_CATEGORY_LOCAL_FINISHED: "2", CONTRACT_CATEGORY_LOCAL_TERMINATED: "3",
    CONTRACT_CATEGORY_LOCAL_TERMINATED_TR: "4" })) process.env[k] ||= v;
process.env.IS_REDIS_ENABLED = "false";
const fs = require("fs");
const ts = require("typescript");
const local = require("./src/services/v1/price.list.services");
const snapshot = require("./src/services/v1/price.list.snapshot.services");
const { modelsStore } = require("./src/models/models");
const { appendixDb } = require("./tests/price.list.appendix");
const F = JSON.parse(fs.readFileSync("tests/fixtures/invoice.pricing.appendix.bc.json", "utf8"));
const COUNTRY = Object.fromEntries(local.localNationalityIds().map((id, i) => [id, [141, 77, 170, 14][i]]));
const env = appendixDb({ nationalityIds: local.localNationalityIds(), categoryIds: local.localCategoryIds(), countryOf: (id) => COUNTRY[id] });
modelsStore.run(env.db, () => snapshot.buildPriceListSnapshot()).then((pl) => {
    const engine = ts.transpileModule(fs.readFileSync("src/domain/invoicePricing/engine.ts", "utf8"),
        { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
    process.stdout.write("@@DATA@@" + JSON.stringify({ pl, engine, F }));
    process.exit(0);
});`;

export const DATA = hasContract
    ? JSON.parse(execFileSync(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", PROVIDER], { cwd: contractDir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("@@DATA@@")[1])
    : null;
const ENGINE = {};
// eslint-disable-next-line no-new-func
if (DATA) new Function("exports", "require", DATA.engine)(ENGINE, () => { throw new Error("the engine imports nothing"); });

const named = (list, name) => list.find((x) => x.name === name).id;

/** the invoice date and branch of the appendix fixtures (23 Oct 2026, Tsim Sha Tsui) */
export const DAY = DATA && { date: DATA.F.context.date, branch: named(DATA.pl.branches, DATA.F.context.branch), branchName: DATA.F.context.branch };

/** the two parties: what setup carries (the record staff selected) and what the server reads for a worker party */
export const PARTIES = DATA && {
    employer: { party: { type: "employer", id: 40 }, record: { employer_id: 40, id: 40, name: "Chan Tai Man", reference_id: "E-1001" } },
    worker: {
        party: { type: "worker", id: 502 }, record: { id: 502, name: "Marites Villanueva", reference_id: "BGS000417-A" },
        // an Overseas worker of BGS (the INV-G1 fixtures' OVERSEAS_WORKER): its type and code match promotions (OP-27-67)
        facts: { workerType: "overseas", nationality: named(DATA.pl.nationalities, "Filipino"), category: null, agency: "BGS" },
    },
};

/* a stand-in for the record key (the server's is a sha256 of the record's text): the same answer, the same key */
const recordKey = (r) => {
    const text = JSON.stringify([r.lines, r.summary, r.credits]);
    let h = 5381;
    for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
    return `rk-${ h.toString(16) }-${ text.length }`;
};

/** POST /invoices/price, route "standalone", as the contract caller answers it (no saved credit in these walks) */
export const priceStandalone = (body) => {
    const { party, adding, employer_id: _employer, worker_id: _worker, origin_contract_id: _origin, credits: _credits, ...rest } = body;
    const resolved = party ? { ...party, ...(party.type === "worker" ? PARTIES.worker.facts : {}) } : null;
    const r = ENGINE.priceInvoice({ ...rest, party: resolved, credits: [] }, DATA.pl, DATA.F.now, { adding: adding === true });
    return { party: party ? { type: party.type, id: party.id } : null, ...r, record_key: r.ok ? recordKey(r) : null };
};

/** the engine's lines in the table's notation: "Item Type · Description · Amount − [step; …] → Total" */
export const engineRows = (lines, hk) => lines.map((l) => {
    const steps = l.steps.map((s) => `${ s.label } ${ hk(s.amount) }${ s.locked ? " (locked)" : "" }`);
    return `${ l.itemType } · ${ l.label } · ${ hk(l.original) }${ steps.length ? ` − [${ steps.join("; ") }]` : "" } → ${ hk(l.net) }`;
});
