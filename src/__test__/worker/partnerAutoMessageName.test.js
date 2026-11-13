/* eslint-env jest */
import React from "react";
import fs from "fs";
import path from "path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

/* The Partner Assigned Information auto message (category 65): since S10 it follows the actual assignment only — the
   Assign action sends it with {{ worker_full_name }} filled (worker/partnerInquiry.test.js) — and Change Onboarding 2
   sends nothing (below). */
jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../redux/Slices/worker/WorkerSlice", () => ({
    fetchWorkerOnboarding: (args) => ({ t: "onboardingList", args }),
    updateWorkerOnboarding: (args) => ({ t: "updateOwner", args }),
}));
jest.mock("../../redux/Slices/settings/templates/TemplateSlice", () => ({
    fetchCategoryList: (args) => ({ t: "categories", args }),
    fetchTemplateNameByFilter: (args) => ({ t: "templates", args }),
    sendChatMessage: (args) => ({ t: "sendChat", args }),
}));
const sent = [];
jest.mock("react-redux", () => ({
    useDispatch: () => (action) => {
        sent.push(action);
        switch (action.t) {
            case "onboardingList": return Promise.resolve({ payload: { data: [{ id: 9, user_id: 909, name: "New Owner", worker_count: 2 }] } });
            case "categories": return Promise.resolve({ payload: { data: [{ id: 3, slug: "partner_assigned_information_auto_message" }] } });
            case "templates": return Promise.resolve({ payload: { data: [{ id: 44, template_content: "Hi {{ worker_full_name }} from {{ nationality }}", file_path_name: "" }] } });
            case "updateOwner": return Promise.resolve({ payload: { status: true, message: "ok" } });
            default: return Promise.resolve({ payload: {} });
        }
    },
}));

import WkdChangeOwnerDialog from "../../Views/Pages/WorkerPage/worker-detail/newui/WkdChangeOwnerDialog";

const worker = { worker_id: 5, user_id: 501, name: "MARY JANE DELA CRUZ", type: "Overseas", nationality: "Filipino", onboarding2: "Old Owner" };

/* S10b (10 Nov 2026 package X-06 / TC08, ruling Q6): Change Onboarding 2 is not the Partner assignment event — it changes
   the owner and sends nothing; category 65 is neither fetched nor sent from here */
test("Change Onboarding 2 changes the owner and sends no message", async () => {
    const onChanged = jest.fn();
    render(<WkdChangeOwnerDialog type={ 2 } worker={ worker } onClose={ () => {} } onChanged={ onChanged } />);
    fireEvent.click(await screen.findByText("New Owner"));
    fireEvent.click(screen.getByRole("button", { name: /key_change_onboarding 2/ }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(sent.find((a) => a.t === "updateOwner").args).toEqual({ type: "two", worker_id: 5, onboarding_id: 9 });
    expect(sent.some((a) => ["categories", "templates", "sendChat"].includes(a.t))).toBe(false);
    const src = fs.readFileSync(path.join(__dirname, "../../Views/Pages/WorkerPage/worker-detail/newui/WkdChangeOwnerDialog.js"), "utf8");
    expect(src).not.toMatch(/sendChatMessage|fetchTemplateNameByFilter|ONBOARDING2_AUTO_MESSAGE/);
    expect(require("../../Views/Pages/WorkerPage/workerModuleConstants").ONBOARDING2_AUTO_MESSAGE).toBeUndefined();
});
