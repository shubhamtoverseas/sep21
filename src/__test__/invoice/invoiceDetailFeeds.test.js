import reducer, { fetchInvoiceActivityLogList, fetchInvoicePaymentLogList } from "../../redux/Slices/invoices/InvoicesSlice";

/* Invoice detail feeds (28 Sep sheet row 1): Activity Timeline and Payment Records each carry their own first-page
   state, so a tab shows loading, error (with retry) or empty on its own; "load more" does not reset a loaded list. */

const initial = () => reducer(undefined, { type: "@@init" });
const act = (thunk, phase, arg, payload) => ({ type: thunk[phase].type, meta: { arg, requestId: "t" }, payload });

describe.each([
    ["Activity Timeline", fetchInvoiceActivityLogList, "invoiceActivityLogStatus", "invoiceActivityLogList"],
    ["Payment Records", fetchInvoicePaymentLogList, "invoicePaymentLogStatus", "invoicePaymentLogList"],
])("%s feed state", (_, thunk, statusKey, listKey) => {
    const first = { invoice_id: 1, limit: 5, page: 1 };
    const more = { invoice_id: 1, limit: 5, page: 2 };

    test("first page: loading → ready", () => {
        let s = reducer(initial(), act(thunk, "pending", first));
        expect(s[statusKey]).toBe("loading");
        s = reducer(s, act(thunk, "fulfilled", first, { data: [{ id: 1 }], page: 1, limit: 5 }));
        expect(s[statusKey]).toBe("ready");
        expect(s[listKey]).toEqual([{ id: 1 }]);
    });

    test("first page failure is an error state, separate from empty", () => {
        const s = reducer(reducer(initial(), act(thunk, "pending", first)), act(thunk, "rejected", first, { status: 500 }));
        expect(s[statusKey]).toBe("error");
    });

    test("a page without page/limit (refund review screens) counts as the first page", () => {
        expect(reducer(initial(), act(thunk, "pending", { invoice_id: 1 }))[statusKey]).toBe("loading");
    });

    test("load more neither hides nor fails the loaded list", () => {
        let s = reducer(initial(), act(thunk, "fulfilled", first, { data: [{ id: 1 }], page: 1, limit: 5 }));
        s = reducer(s, act(thunk, "pending", more));
        expect(s[statusKey]).toBe("ready");
        s = reducer(s, act(thunk, "rejected", more, { status: 500 }));
        expect(s[statusKey]).toBe("ready");
        expect(s[listKey]).toEqual([{ id: 1 }]);
    });
});
