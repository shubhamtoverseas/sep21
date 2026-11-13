/* eslint-env jest */
// QA-27 (27 Oct release QA pass): the user-facing guards the plan names. These read the bundle and the creation screens' source.
// The product-name guard is __test__/productName.test.js.
import fs from "fs";
import path from "path";
import en from "../../../public/locales/en/translation.json";

const ROOT = path.resolve(__dirname, "../..");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.js$/.test(e.name) ? [p] : [];
});
const creation = walk(path.join(ROOT, "Views/Pages/Invoice/add-contract-invoice"));

describe("QA-27 labels", () => {
    test("#27: no English string says General Invoice", () => {
        const hits = Object.entries(en).filter(([, v]) => typeof v === "string" && /general invoice/i.test(v));
        expect(hits).toEqual([]);
    });

    test("#27: the creation screens name no General Invoice in their source", () => {
        const hits = creation.filter((f) => /General Invoice/.test(fs.readFileSync(f, "utf8")));
        expect(hits).toEqual([]);
    });
});
