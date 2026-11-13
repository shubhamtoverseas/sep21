/* eslint-env jest */
import React from "react";
import { render } from "@testing-library/react";
import { emptyDraft, paosPayload, validatePaos, isOutcomeStep } from "../../Views/Pages/Contract/details/paosRules";
import { CR_PAOS_PROGRESS, CR_PAOS_TRI } from "../../Views/Pages/Contract/contractConstants";
import NotificationRow from "../../Views/Pages/Notifications/newui/NotificationRow";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

const activeRow = { contract_status: 2, contract_start: "2026-10-01" };

/* backend 379 (handoff v23 §Z): the Arrange PAOS save carried `to_arrange` with a session and `attended: "yes"` */
describe("PAOS save payload (backend 379)", () => {
    test("Arrange opens on Scheduled; a later step opens on the stored one", () => {
        expect(emptyDraft(null).progress).toBe(CR_PAOS_PROGRESS.SCHEDULED);
        expect(emptyDraft({ progress: CR_PAOS_PROGRESS.TO_ARRANGE }).progress).toBe(CR_PAOS_PROGRESS.SCHEDULED);
        expect(emptyDraft({ progress: CR_PAOS_PROGRESS.ATTENDED }).progress).toBe(CR_PAOS_PROGRESS.ATTENDED);
    });
    test("a booked session is sent as Scheduled with no attendance and no certificate", () => {
        const draft = { ...emptyDraft(null), session_date: "2026-11-10", session_time: "10:00", venue: "Central", booking_ref: "B1", attended: CR_PAOS_TRI.YES, attendance_date: "2026-11-10", certificate_received: CR_PAOS_TRI.YES, certificate_ref: "C9" };
        expect(paosPayload(draft, "41", false)).toEqual({
            contract_id: 41, progress: "scheduled", attended: null, attendance_date: null, certificate_received: 0, certificate_ref: null, note: null,
            session_date: "2026-11-10", session_time: "10:00", venue: "Central", instructions: null, booking_ref: "B1",
        });
    });
    test("attendance travels on an outcome step, the certificate only with Completed; Record outcome sends no session", () => {
        const attended = { ...emptyDraft({ progress: CR_PAOS_PROGRESS.SCHEDULED }), progress: CR_PAOS_PROGRESS.ATTENDED, session_date: "2026-11-10", venue: "Central", attended: CR_PAOS_TRI.YES, attendance_date: "2026-11-10", certificate_received: CR_PAOS_TRI.YES, certificate_ref: "C9" };
        const body = paosPayload(attended, 41, false);
        expect(body.attended).toBe("yes");
        expect(body.attendance_date).toBe("2026-11-10");
        expect(body.certificate_received).toBe(0);
        expect(body.certificate_ref).toBeNull();
        const completed = paosPayload({ ...attended, progress: CR_PAOS_PROGRESS.COMPLETED }, 41, true);
        expect(completed.certificate_received).toBe(1);
        expect(completed.certificate_ref).toBe("C9");
        expect(completed).not.toHaveProperty("session_date");
        expect(isOutcomeStep(CR_PAOS_PROGRESS.NEEDS_REBOOKING)).toBe(true);
    });
    test("a session typed while the step is To arrange is refused before Save", () => {
        const draft = { ...emptyDraft(null), progress: CR_PAOS_PROGRESS.TO_ARRANGE, session_date: "2026-11-10" };
        expect(validatePaos(draft, CR_PAOS_PROGRESS.TO_ARRANGE, activeRow, false).progress).toBe("key_cr_paos_err_only_follows");
        expect(validatePaos({ ...draft, session_date: "" }, CR_PAOS_PROGRESS.TO_ARRANGE, activeRow, false).progress).toBeUndefined();
    });
});

/* handoff v23 §Y: an unregistered notification type keeps the row's column structure */
describe("notification row without a category", () => {
    test("the tag cell is rendered empty, the text stays in its own column", () => {
        const item = { id: 9990, type: "update_visa_reference_no_notification_to_cs", message: "Visa ref no updated", is_read: 0, created_at: "2026-10-26 10:00:00" };
        const { container } = render(<NotificationRow item={ item } onOpen={ () => {} } onMarkRead={ () => {} } />);
        const row = container.querySelector(".nf-row");
        expect(row.children[1].getAttribute("data-nf-no-category")).toBe("");
        expect(row.children[2].className).toBe("nf-main");
        expect(container.querySelector(".nf-cat-tag")).toBeNull();
    });
});
