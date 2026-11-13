/* eslint-env jest */
import ChatSlice, { CHAT_HISTORY_PAGE_LIMIT, fetchConversactionsHistory } from "../../redux/Slices/chat/ChatSlice";

const fulfilled = (payload) => ({ type: fetchConversactionsHistory.fulfilled.type, payload });
const initial = () => ChatSlice(undefined, { type: "@@init" });

/* CH-7: the record rails keep the rows array and read the API total for the count */
describe("chat history (get-conversactions-history) in the chat slice", () => {
    it("stores the rows as an array and the API total separately", () => {
        const rows = [{ id: 1 }, { id: 2 }];
        const state = ChatSlice(initial(), fulfilled({ data: rows, total: 37 }));
        expect(state.conversactionsListHistory).toEqual(rows);
        expect(state.conversactionsHistoryTotal).toBe(37);
    });

    it("keeps the total unknown when the API sends none (app-style response)", () => {
        const state = ChatSlice(initial(), fulfilled({ data: [{ id: 1 }] }));
        expect(state.conversactionsHistoryTotal).toBeNull();
    });

    it("keeps a total of 0 as a real count", () => {
        const state = ChatSlice(initial(), fulfilled({ data: [], total: 0 }));
        expect(state.conversactionsHistoryTotal).toBe(0);
    });

    it("starts with no total", () => {
        expect(initial().conversactionsHistoryTotal).toBeNull();
    });

    it("asks for the 50-row page the rails always received", () => {
        expect(CHAT_HISTORY_PAGE_LIMIT).toBe(50);
    });
});
