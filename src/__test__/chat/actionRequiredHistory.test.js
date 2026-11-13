/* eslint-env jest */
/*
 * UP02-a (10 Nov 2026 package; prototype Worker_Details.html actionHistoryPanelHTML, item 7): the record's Action Required
 * History is read-only. Opening it never creates a conversation (chat answers the existing one or none, with the worker's
 * reply window); it shows who may write — open while a section is in Action Required, closed otherwise — and nothing is
 * sent or deleted from it. Chat refuses replies to a closed conversation (maidmatch-chat ad056f3).
 */
import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, waitFor } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../utils/dispatchHandler", () => ({ dispatchWithHandling: (dispatch, action) => dispatch(action) }));
jest.mock("../../services/commonService", () => ({ getAccessToken: () => "tok" }));
jest.mock("../../redux/Slices/chat/ChatSlice", () => ({
    setConversation: (args) => ({ t: "conversation", args }),
    fetchMessageListAction: (args) => ({ t: "messages", args }),
    clearMessageList: () => ({ t: "clear" }),
}));
const mockEmit = jest.fn();
jest.mock("../../socket/socket", () => ({ getSocket: () => ({ emit: mockEmit, on: jest.fn(), off: jest.fn() }) }));
jest.mock("../../Views/Pages/Conversaction/ActionRequiredTab", () => ({ __esModule: true, default: () => <div data-testid="ar-thread" /> }));
const actions = [];
let conversation = null;
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch }));

import ActionChat, { arWindowNote } from "../../components/chat-history-collapse-view/ActionChat";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");
const worker = { name: "Siti Aminah", user_id: 1108, worker_id: 688 };

beforeEach(() => {
    actions.length = 0;
    mockEmit.mockReset();
    mockDispatch.mockReset();
    mockDispatch.mockImplementation((action) => { actions.push(action); return Promise.resolve({ payload: action.t === "conversation" ? conversation : {} }); });
});

describe("Action Required History is read-only and never creates a conversation (UP02)", () => {
    test("no conversation yet: asks chat to find it, shows the closed window and the empty history, joins nothing", async () => {
        conversation = { success: true, data: null, ar_window: { open: false, sections: [] } };
        render(<ActionChat entityDetails={ worker } user_type="worker" />);
        await waitFor(() => expect(document.querySelector("[data-mc-ar-empty]")).toBeInTheDocument());
        expect(actions.find((a) => a.t === "conversation").args).toEqual({ friend_type: "worker", platform: "action_required", friend_id: 1108 });
        expect(document.querySelector("[data-mc-ar-window]")).toHaveAttribute("data-mc-ar-window", "closed");
        expect(document.querySelector("[data-mc-ar-window]")).toHaveTextContent("key_wkr_ar_window_closed_title");
        expect(document.querySelector("[data-mc-ar-readonly]")).toHaveTextContent("key_wkr_ar_history_readonly_title");
        expect(screen.queryByTestId("ar-thread")).toBeNull();
        expect(mockEmit).not.toHaveBeenCalled();
        expect(actions.some((a) => a.t === "messages")).toBe(false);
    });

    test("an existing conversation with open sections: the thread loads and the window names them", async () => {
        conversation = { success: true, data: { conversation_sid: 385 }, ar_window: { open: true, sections: ["biodata", "passport"] } };
        render(<ActionChat entityDetails={ worker } user_type="worker" />);
        await waitFor(() => expect(document.querySelector("[data-mc-ar-window]")).toHaveAttribute("data-mc-ar-window", "open"));
        expect(screen.getByTestId("ar-thread")).toBeInTheDocument();
        expect(mockEmit).toHaveBeenCalledWith("join_room", { conversation_sid: 385, token: "tok" });
        expect(actions.find((a) => a.t === "messages").args).toMatchObject({ sid: 385, platform: "action_required" });
    });

    test("the window note: open names the sections (one / several), closed when none", () => {
        expect(arWindowNote(null, "Siti")).toBeNull();
        expect(arWindowNote({ open: true, sections: ["image"] }, "Siti")).toEqual({ open: true, title: "key_wkr_ar_window_open_title", text: "key_wkr_ar_window_open_text_one" });
        expect(arWindowNote({ open: true, sections: ["image", "tesda"] }, "Siti").text).toBe("key_wkr_ar_window_open_text_other");
        expect(arWindowNote({ open: false, sections: [] }, "Siti")).toEqual({ open: false, title: "key_wkr_ar_window_closed_title", text: "key_wkr_ar_window_closed_text" });
        const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
        expect(en.key_wkr_ar_window_open_title).toBe("{name} can send messages");
        expect(en.key_wkr_ar_window_open_text_other).toBe("{count} sections outstanding: {sections}. The Action Required chat is open to her while at least one section is outstanding.");
        expect(en.key_wkr_ar_window_closed_text).toBe("No section is in Action Required, so her Action Required chat is closed. This history stays visible to agents and is read-only.");
    });

    test("the history sends and deletes nothing", () => {
        const tab = read("Views/Pages/Conversaction/ActionRequiredTab.js");
        expect(tab).not.toMatch(/emit\(['"]send_message|emit\(['"]delete_message|MessageInput|uploadChatFile|EmojiPicker|isChatOpen/);
        expect(tab).toMatch(/emit|on\('receive_message'/);
        expect(read("components/chat-history-collapse-view/ActionChat.js")).not.toMatch(/isChatOpen/);
    });
});
