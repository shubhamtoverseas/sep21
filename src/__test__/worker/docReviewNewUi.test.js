/* eslint-env jest */
import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { DOC_EVENT_KEY_MAP, DOC_REVIEW_SPEC, DOC_REVIEW_ROLE } from "../../Views/Pages/WorkerPage/workerModuleConstants";
import { indonesiaId, fillipinoId } from "../../components/ReusableComponents/constants";
import { docSavePayload, docMatchFlags, docVerifyMismatch, docIsHolding, docTemplateSlug, docSaveErrors, docStoredFields } from "../../Views/Pages/WorkerPage/worker-detail/newui/doc-review/useDocReview";
import WkdDocReview from "../../Views/Pages/WorkerPage/worker-detail/newui/doc-review/WkdDocReview";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("../../Views/Pages/WorkerPage/worker-detail/newui/WkdSendTemplateModal", () => () => null);

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(__dirname, "../../", rel));

/* gap list Worker #4: the eight document tabs rebuilt on the prototype review card (docsHTML), one logic for all eight */
describe("Doc Upload review · spec parity", () => {
    test("every deep-link document key has a review spec with the server contract", () => {
        expect(Object.keys(DOC_REVIEW_SPEC).sort()).toEqual(Object.keys(DOC_EVENT_KEY_MAP).sort());
        Object.entries(DOC_REVIEW_SPEC).forEach(([key, spec]) => {
            expect(spec.type).toBe(DOC_EVENT_KEY_MAP[key].activityType);
            expect(spec.statusField).toMatch(/_status$/);
            expect(typeof spec.fileField).toBe("string");
            expect(typeof spec.uploadedAtField).toBe("string");
            expect(spec.slug).toMatch(/_action_required$/);
            expect(Array.isArray(spec.fields)).toBe(true);
        });
    });
    test("the legacy tabs, certificate forms and their validators are gone; the review kit replaces them", () => {
        expect(exists("Views/Pages/WorkerPage/worker-detail/details-tab-worker/doc-upload-tab")).toBe(false);
        expect(exists("components/certificate-form")).toBe(false);
        expect(read("Views/Pages/WorkerPage/worker-detail/formValidation.js")).not.toMatch(/validateWorker(Birth|FamilyCertificate|EducationCertificate)DocUpdate/);
        expect(read("components/ReusableComponents/form-states.js")).not.toMatch(/saveWorker(IndoId|Birth|FamilyCertificate|EducationCertificate)DocUploadState/);
        const container = read("Views/Pages/WorkerPage/worker-detail/profile-tab/doc-upload-tab/WorkerDocUploadDetails.js");
        expect(container).toMatch(/newui\/doc-review\/WkdDocReview/);
        expect(container).not.toMatch(/details-tab-worker\/doc-upload-tab/);
        const css = read("Views/Pages/WorkerPage/worker-detail/newui/worker-details.css");
        expect(css).not.toMatch(/display: contents/);
        expect(css).not.toMatch(/wkd-docws-review/);
    });
});

describe("Doc Upload review · per-document rules", () => {
    const ids = { routeWorkerId: "route-7", workerId: 42 };
    test("Save bodies keep each legacy tab's shape: worker_id source and module_key", () => {
        expect(docSavePayload(DOC_REVIEW_SPEC.eregistration, ids, { passport_number_in_eregistration: "P1", passport_expiry_date_in_eregistration: "2030-01-01" }))
            .toEqual({ worker_id: "route-7", type: "eregistration", passport_number_in_eregistration: "P1", passport_expiry_date_in_eregistration: "2030-01-01", module_key: "worker" });
        expect(docSavePayload(DOC_REVIEW_SPEC.tesda, ids, { tesda_name: "A", tesda_issue_date: "", tesda_expiry_date: "" }))
            .toEqual({ worker_id: "route-7", type: "tesda", tesda_name: "A", tesda_issue_date: "", tesda_expiry_date: "", module_key: "worker" });
        const passport = docSavePayload(DOC_REVIEW_SPEC.passport, ids, {});
        expect(passport.worker_id).toBe(42);
        expect(passport.module_key).toBe("worker");
        expect(Object.keys(passport)).toEqual(["worker_id", "type", "name_in_passport", "birth_date_in_passport", "birth_place_in_passport", "passport_number", "passport_issue_date", "passport_expiry_date", "module_key"]);
        ["indonesian-id", "birth-certificate", "family-certificate", "education-certificate"].forEach((k) => {
            const body = docSavePayload(DOC_REVIEW_SPEC[k], ids, {});
            expect(body.worker_id).toBe(42);
            expect(body).not.toHaveProperty("module_key");
            expect(body.type).toBe(DOC_REVIEW_SPEC[k].type);
        });
    });
    test("match tags: a dependent compares with the KTP once all three KTP values exist, else with the Passport; the KTP with the Passport unless Path A", () => {
        const base = { name_in_passport: "Siti", birth_date_in_passport: "1994-07-03", birth_place_in_passport: "Surabaya", name_in_birth_certificate: "SITI", birth_date_in_birth_certificate: "1994-07-03", birth_place_in_birth_certificate: "surabaya" };
        const viaPassport = docMatchFlags(DOC_REVIEW_SPEC["birth-certificate"], base);
        expect(viaPassport.ref.labelKey).toBe("key_passport");
        expect(viaPassport.flags).toEqual({ name_in_birth_certificate: true, birth_date_in_birth_certificate: true, birth_place_in_birth_certificate: true });
        const withKtp = { ...base, name_in_indonesian_id: "Other", birth_date_in_indonesian_id: "1994-07-03", birth_place_in_indonesian_id: "Surabaya" };
        const viaKtp = docMatchFlags(DOC_REVIEW_SPEC["birth-certificate"], withKtp);
        expect(viaKtp.ref.labelKey).toBe("key_central_ktp_label");
        expect(viaKtp.flags.name_in_birth_certificate).toBe(false);
        expect(viaKtp.flags.birth_date_in_birth_certificate).toBe(true);
        expect(docMatchFlags(DOC_REVIEW_SPEC["indonesian-id"], withKtp).ref.labelKey).toBe("key_passport");
        expect(docMatchFlags(DOC_REVIEW_SPEC["indonesian-id"], { ...withKtp, passport_lost_reason: 3 }).ref).toBeNull();
        expect(docMatchFlags(DOC_REVIEW_SPEC.passport, withKtp).ref).toBeNull();
    });
    test("Verify refuses on a stored mismatch with the Passport (Path B) or the KTP (Path A); the KTP is skipped on Path A", () => {
        const rec = { name_in_passport: "Siti", birth_date_in_passport: "1994-07-03", birth_place_in_passport: "Surabaya", name_in_indonesian_id: "Siti", birth_date_in_indonesian_id: "1994-07-03", birth_place_in_indonesian_id: "Semarang", name_in_family_certificate: "siti", birth_date_in_family_certificate: "1994-07-03", birth_place_in_family_certificate: "SURABAYA" };
        expect(docVerifyMismatch(DOC_REVIEW_SPEC["family-certificate"], rec)).toBeNull();
        expect(docVerifyMismatch(DOC_REVIEW_SPEC["family-certificate"], { ...rec, passport_lost_reason: 3 })).toBe("key_details_not_matched_with_indonesian_id");
        expect(docVerifyMismatch(DOC_REVIEW_SPEC["indonesian-id"], rec)).toBe("key_details_not_matched_with_passport");
        expect(docVerifyMismatch(DOC_REVIEW_SPEC["indonesian-id"], { ...rec, passport_lost_reason: 3 })).toBeNull();
        expect(docVerifyMismatch(DOC_REVIEW_SPEC.tesda, rec)).toBeNull();
    });
    test("holding (W-27): a dependent at Uploaded waits for the central document", () => {
        expect(docIsHolding(DOC_REVIEW_SPEC["indonesian-id"], { passport_status: "in_review" }, "uploaded")).toBe(true);
        expect(docIsHolding(DOC_REVIEW_SPEC["indonesian-id"], { passport_status: "in_review", passport_lost_reason: 3 }, "uploaded")).toBe(false);
        expect(docIsHolding(DOC_REVIEW_SPEC["birth-certificate"], { passport_status: "verified" }, "uploaded")).toBe(false);
        expect(docIsHolding(DOC_REVIEW_SPEC["birth-certificate"], { passport_status: "verified", indonesian_id_status: "in_review", passport_lost_reason: 3 }, "uploaded")).toBe(true);
        expect(docIsHolding(DOC_REVIEW_SPEC["birth-certificate"], { passport_status: "in_review" }, "in_review")).toBe(false);
        expect(docIsHolding(DOC_REVIEW_SPEC.eregistration, {}, "uploaded")).toBe(false);
    });
    test("template slug: the Birth Certificate on an Indonesian overseas record sends the date-not-matched variant", () => {
        expect(docTemplateSlug(DOC_REVIEW_SPEC["birth-certificate"], { nationality: { id: indonesiaId }, type: 2 })).toBe("birth_certificate_date_not_matched_action_required");
        expect(docTemplateSlug(DOC_REVIEW_SPEC["birth-certificate"], { nationality: { id: indonesiaId }, type: 1 })).toBe("birth_certificate_action_required");
        expect(docTemplateSlug(DOC_REVIEW_SPEC["birth-certificate"], { nationality: { id: fillipinoId }, type: 2 })).toBe("birth_certificate_action_required");
        expect(docTemplateSlug(DOC_REVIEW_SPEC["family-certificate"], { nationality: { id: indonesiaId }, type: 2 })).toBe("family_certificate_action_required");
    });
    test("required-on-Save keeps the certificate forms' rules; the other documents have none", () => {
        expect(docSaveErrors(DOC_REVIEW_SPEC["education-certificate"], { name_in_education_certificate: " " }))
            .toEqual({ name_in_education_certificate: "key_this_field_is_required", birth_date_in_education_certificate: "key_date_of_birth_is_required", birth_place_in_education_certificate: "key_birth_place_is_required" });
        expect(docSaveErrors(DOC_REVIEW_SPEC.passport, {})).toEqual({});
        expect(docStoredFields(DOC_REVIEW_SPEC.tesda, { tesda_name: "A" })).toEqual({ tesda_name: "A", tesda_issue_date: "", tesda_expiry_date: "" });
        expect(DOC_REVIEW_SPEC["birth-certificate"].role).toBe(DOC_REVIEW_ROLE.DEPENDENT);
    });
});

describe("Doc Upload review · card", () => {
    const statuses = [{ id: "in_review", name: "In Review" }, { id: "action_required", name: "Action Required" }, { id: "verified", name: "Verified" }];
    const mount = (overseas, { status = "idle", perms = ["edit", "change_status", "send_template"], centralVerified, docKey = "birth-certificate" } = {}) => {
        const worker = {
            status,
            allStatusList: statuses,
            activityLogList: [{ current_status: "in_review", log_created_by: "Siti (worker)", created_at: "2026-08-23 07:48:00" }],
            workerDetailTabInfo: {},
            workerDocumentUploadInfo: { id: 42, user_id: 9, nationality: { id: 2 }, type: 2, worker_overseas_detail_info: overseas },
        };
        const store = configureStore({ reducer: { worker: () => worker, chat: () => ({}) } });
        return render(
            <Provider store={ store }>
                <MemoryRouter initialEntries={ ["/workers/42"] }>
                    <Routes><Route path="/workers/:worker_id" element={ <WkdDocReview docKey={ docKey } uploadDocPermission={ perms } isAdmin={ false } onRefreshActivity={ () => {} } centralVerified={ centralVerified } /> } /></Routes>
                </MemoryRouter>
            </Provider>
        );
    };
    const indo = {
        passport_status: "verified", passport_file: "https://x/p.jpg",
        name_in_passport: "Siti", birth_date_in_passport: "1994-07-03", birth_place_in_passport: "Surabaya",
        birth_certificate_status: "in_review", birth_certificate_file: "https://x/b.jpg", birth_certificate_file_uploaded_at: "2026-08-23 07:48:00",
        name_in_birth_certificate: "SITI", birth_date_in_birth_certificate: "1994-07-03", birth_place_in_birth_certificate: "Bandung",
    };
    test("two-column card: scan left, group title with the compare target, match tags on matching values, Save under the fields, Change Status in the footer", () => {
        const { container } = mount(indo, { centralVerified: true });
        expect(container.querySelector(".wkd-docrv-preview")).not.toBeNull();
        expect(container.querySelector(".wkd-docrv-grp")).toHaveTextContent("key_details_in key_birth_certificate · compared with key_passport");
        const fields = Array.from(container.querySelectorAll(".wkd-docrv-field"));
        expect(fields.map((f) => f.getAttribute("data-mc-doc-match"))).toEqual(["true", "true", null]);
        expect(screen.getAllByText(/Matches key_passport/).length).toBe(2);
        const save = screen.getByRole("button", { name: "key_save" });
        expect(save).toBeDisabled();
        fireEvent.change(container.querySelector("input[name='birth_place_in_birth_certificate']"), { target: { value: "Surabaya" } });
        expect(save).not.toBeDisabled();
        fireEvent.click(screen.getByRole("button", { name: /key_change_status/i }));
        const rows = Array.from(container.querySelectorAll(".bio-status-row")).map((n) => n.textContent);
        expect(rows[0]).toMatch(/key_in_review/);
        expect(rows.slice(1)).toEqual(["Action Required", "Verified"]);
        expect(container.querySelector(".bio-status-pop").className).toMatch(/\bup\b/);
    });
    test("holding: Change Status is disabled with the pending text while the central document is not Verified; Verify stays listed but disabled", () => {
        const { container } = mount({ ...indo, passport_status: "in_review", birth_certificate_status: "uploaded" }, { centralVerified: false });
        expect(container.querySelector(".wkd-docrv-holding")).toHaveTextContent("key_wkr_pending_central_doc_verification");
        expect(screen.getByRole("button", { name: /key_change_status/i })).toBeDisabled();
        /* Uploaded stays editable (legacy lock = Incomplete / Verified only); Save waits for a change */
        expect(screen.getByRole("button", { name: "key_save" })).toBeDisabled();
    });
    test("no edit sub-verb: fields read-only, no Save; no change_status: no footer", () => {
        const { container } = mount(indo, { perms: [] });
        expect(container.querySelector("input[name='name_in_birth_certificate']")).toHaveAttribute("readonly");
        expect(container.querySelector(".wkd-docrv-save")).toBeNull();
        expect(container.querySelector(".wkd-docrv-foot")).toBeNull();
    });
    test("PEOS: no fields, the visual-inspection note; passport declared lost: the declaration stands in for the scan", () => {
        const { container } = mount({ peos_certification_status: "in_review", peos_certification_file: "https://x/peos.pdf" }, { docKey: "peos-certificate" });
        expect(container.querySelector(".wkd-docrv-note.is-dashed")).toHaveTextContent("key_wkr_visual_inspection_only_no_data_fields_are");
        expect(container.querySelector("iframe.wkd-docrv-pdf")).not.toBeNull();
        expect(container.querySelector(".wkd-docrv-field")).toBeNull();
        const lost = mount({ passport_status: "in_review", passport_lost_reason: 1 }, { docKey: "passport" });
        expect(lost.container.querySelector(".wkd-docrv-body").className).toMatch(/is-single/);
        expect(lost.container.querySelector(".wkd-docrv-note")).toHaveTextContent("key_worker_has_lost_passport");
        expect(lost.container.querySelector(".wkd-docrv-preview")).toBeNull();
    });
});
