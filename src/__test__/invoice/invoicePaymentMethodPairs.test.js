import fs from "fs";
import path from "path";

/* Ruling OP-V2-08: a renamed stored method is checked together with its old name. The pair must be bracketed
   before && — `x === 'bank_in' || x === 'bank_transfer' && y` reads as `bank_in || (bank_transfer && y)`. */

const PAIR_BEFORE_AND = /(^|[^(])\b((?:[\w$]+(?:\?\.|\.))*payment_method)\s*===?\s*(['"])(bank_in|wechat_pay|alipay)\3 \|\| \2\s*===?\s*\3(bank_transfer|wechat_pay_hk|alipay_hk)\3\s*&&/;
const IF_PAIR_BEFORE_AND = /\bif \(((?:[\w$]+(?:\?\.|\.))*payment_method)\s*===?\s*(['"])(bank_in|wechat_pay|alipay)\2 \|\| \1\s*===?\s*\2(bank_transfer|wechat_pay_hk|alipay_hk)\2\s*&&/;

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : /\.jsx?$/.test(e.name) ? [path.join(dir, e.name)] : []);

test("every old-name / new-name payment-method pair is bracketed before &&", () => {
    const offenders = [];
    for (const file of walk(path.resolve(__dirname, "../../Views"))) {
        fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
            if (PAIR_BEFORE_AND.test(line) || IF_PAIR_BEFORE_AND.test(line)) offenders.push(`${path.basename(file)}:${i + 1}`);
        });
    }
    expect(offenders).toEqual([]);
});
