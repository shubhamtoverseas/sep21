/* eslint-env jest */
import { validateHKID, validateHKIDStripped } from "../../utils/utils";

/* U-0399 (Priyanka 28 Oct): the standard HKID check digit — eight positions weighted 9..2, a single-letter prefix padded
   with a leading space worth 36. A123456(3) is a real id and was refused by the old weights; A123456(A) was accepted. */
describe("validateHKID — check digit", () => {
    test("single-letter prefix: the space-padded algorithm accepts A123456(3) and refuses A123456(A)", () => {
        expect(validateHKID("A123456(3)")).toMatchObject({ valid: true, formatted: "A123456(3)", hkid: "A1234563" });
        expect(validateHKID("a1234563").valid).toBe(true);
        expect(validateHKID("A123456(A)").valid).toBe(false);
        expect(validateHKID("A123456A").error).toMatch(/Check digit mismatch: expected '3'/);
    });
    test("two-letter prefix (X only, as the server's regex): eight weighted positions, no padding", () => {
        /* AX123456: A=10×9, X=33×8, 1×7, 2×6, 3×5, 4×4, 5×3, 6×2 = 90+264+7+12+15+16+15+12 = 431 → 431 mod 11 = 2 → 11−2 = 9 */
        expect(validateHKID("AX123456(9)").valid).toBe(true);
        expect(validateHKID("AX1234569").formatted).toBe("AX123456(9)");
        expect(validateHKID("AB1234569").valid).toBe(false);
    });
    test("check digit A (remainder 1) and 0 (remainder 0)", () => {
        /* C668668: space 36×9 + C 12×8 + 6×7 + 6×6 + 8×5 + 6×4 + 6×3 + 8×2 = 324+96+42+36+40+24+18+16 = 596 → 596 mod 11 = 2 → 9 */
        expect(validateHKID("C668668(9)").valid).toBe(true);
        /* find ids by construction: remainder 1 → 'A'; remainder 0 → '0' */
        const digitFor = (prefix) => { const vals = [36, ...prefix.split("").map((c) => (/\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55))]; const w = [9, 8, 7, 6, 5, 4, 3, 2]; const r = vals.reduce((a, v, i) => a + v * w[i], 0) % 11; return r === 0 ? "0" : (r === 1 ? "A" : String(11 - r)); };
        for (const p of ["B000001", "B000002", "B000003", "B000004", "B000005", "B000006", "B000007", "B000008", "B000009", "B000010", "B000011"]) {
            expect(validateHKID(`${ p }(${ digitFor(p) })`).valid).toBe(true);
        }
    });
    test("shape errors are unchanged", () => {
        expect(validateHKID("").valid).toBe(false);
        expect(validateHKID("1234567").valid).toBe(false);
        expect(validateHKIDStripped("A123456(3)").valid).toBe(true);
    });
});
