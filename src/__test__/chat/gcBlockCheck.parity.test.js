/* eslint-env jest */
import { gcBlockCheck } from "../../Views/Pages/Conversaction/newui/gcHelpers";

/*
 * GC-016 / CH-1: the composer's client-side check must refuse and allow exactly what the chat service refuses and
 * allows. These are the same cases maidmatch-chat runs against its server rule (tests/contact.guard.util.test.js) —
 * change both together.
 */
const BLOCKED = [
    ["Call me on 9123 4567", "phone", "9123 4567"],
    ["+852 9123-4567 is my number", "phone", "+852 9123-4567"],
    ["my number is 91234567", "phone", "91234567"],
    ["wa.me/85291234567", "phone", "85291234567"],
    ["email me: helper.test@gmail.com", "email", "helper.test@gmail.com"],
    ["add me on WhatsApp", "contact", "WhatsApp"],
    ["my LINE ID is helper88", "contact", "LINE ID"],
    ["WeChat me", "contact", "WeChat"],
    ["find me on telegram", "contact", "telegram"],
    ["我們私下聯絡", "contact", "私下"],
    ["加我", "contact", "加我"],
    ["let's meet outside the agency", "meeting", "meet outside"],
    ["can we meet offline?", "meeting", "meet offline"],
];

const ALLOWED = [
    "Please check JO-2024-08311 before Friday",
    "Worker E-HK-1234567 is ready",
    "Profile ABC123456 updated",
    "Interview on 2026-10-26 at 10:30 AM",
    "Start date 26/10/2026",
    "Arrives 26 Oct 2026",
    "What is that?",
    "Please send the message later",
    "She is online now",
    "Fix the tax next week",
    "Salary is 4990 per month",
];

describe("gcBlockCheck matches the chat service's group contact rule", () => {
    it.each(BLOCKED)("refuses %p (%s)", (text, reason, snippet) => {
        expect(gcBlockCheck(text)).toEqual({ reasonKey: `key_group_blocked_${ reason }`, snippet });
    });

    it.each(ALLOWED)("allows %p", (text) => {
        expect(gcBlockCheck(text)).toBeNull();
    });
});
