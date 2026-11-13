/* eslint-env jest */
import React from "react";
import PropTypes from "prop-types";
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import useContactOtp from "../../Views/Pages/Employer/newui/useContactOtp";
import { WORKER_CONTACT_OTP_FIELDS, WORKER_OTP_SOURCE } from "../../Views/Pages/WorkerPage/workerModuleConstants";

/* Worker contact OTP (work orders 26 Oct, v1 + v2): a CHANGED Email / Mobile / WhatsApp needs send → verify → the
   `<field>_verified` pair; e-mail compares trimmed and case-insensitive; the e-mail send carries the worker's name. */
const sent = [];
jest.mock("../../redux/Slices/employer/EmployerSlice", () => ({
    sendOtp: (body) => () => { sent.push(body); return Promise.resolve({ payload: { status: true, message: "ok", data: { verified_at: "2026-10-26 10:00:00" } } }); },
}));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../services/commonService", () => ({ formatDateTime: () => "now" }));
jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

const store = configureStore({ reducer: { noop: (s = {}) => s } });
const Wrapper = ({ children }) => <Provider store={ store }>{ children }</Provider>;
Wrapper.propTypes = { children: PropTypes.node };

const saved = { email: { value: "Old@Mail.com" }, mobile: { cc: "+852", number: "70007000" }, whatsapp: { cc: "+852", number: "70007000" } };
const run = (current) => renderHook(({ cur }) => useContactOtp({ fields: WORKER_CONTACT_OTP_FIELDS, saved, current: cur, source: WORKER_OTP_SOURCE, name: "Analyn Bautista" }), { wrapper: Wrapper, initialProps: { cur: current } });

describe("useContactOtp — worker contact fields", () => {
    beforeEach(() => { sent.length = 0; });

    it("state 1: saved values read as verified; e-mail compares trimmed and case-insensitive", () => {
        const { result } = run({ ...saved, email: { value: "  old@mail.COM " } });
        expect(result.current.state.email).toMatchObject({ changed: false, savedUnchanged: true });
        expect(result.current.state.mobile.savedUnchanged).toBe(true);
        expect(result.current.unverifiedChanged).toEqual([]);
    });

    it("state 2 → 3 → 4: a changed e-mail sends with the worker's name, verifies, and yields the verified pair", async () => {
        const { result } = run({ ...saved, email: { value: "test186@mailinator.com" } });
        expect(result.current.state.email).toMatchObject({ changed: true, verified: false, codeSent: false });
        expect(result.current.unverifiedChanged).toEqual(["email"]);
        await act(async () => { await result.current.send("email"); });
        expect(sent[0]).toEqual({ type: 1, source: "edit_worker", send_to: "test186@mailinator.com", name: "Analyn Bautista", verification_type: "email_verified" });
        expect(result.current.state.email).toMatchObject({ codeSent: true, sentTo: "test186@mailinator.com", resendSeconds: 60 });
        act(() => { result.current.setOtp("email", "123456"); });
        await act(async () => { await result.current.verify("email"); });
        expect(sent[1]).toMatchObject({ type: 2, otp: "123456", verification_type: "email_verified", send_to: "test186@mailinator.com" });
        expect(result.current.state.email).toMatchObject({ verified: true, codeSent: false });
        expect(result.current.flagsFor("email")).toEqual({ email_verified: 1, email_verified_at: "2026-10-26 10:00:00" });
        expect(result.current.unverifiedChanged).toEqual([]);
    });

    it("a phone send carries the country code and no name; editing the value again drops the verification", async () => {
        const { result, rerender } = run({ ...saved, whatsapp: { cc: "+852", number: "70007002" } });
        await act(async () => { await result.current.send("whatsapp"); });
        expect(sent[0]).toEqual({ type: 1, source: "edit_worker", send_to: "70007002", send_to_country_code: "+852", verification_type: "whatsapp_verified" });
        act(() => { result.current.setOtp("whatsapp", "123456"); });
        await act(async () => { await result.current.verify("whatsapp"); });
        expect(result.current.state.whatsapp.verified).toBe(true);
        rerender({ cur: { ...saved, whatsapp: { cc: "+852", number: "70007003" } } });
        expect(result.current.state.whatsapp).toMatchObject({ changed: true, verified: false });
        expect(result.current.flagsFor("whatsapp")).toEqual({});
    });

    it("an empty e-mail is a clear, not a change (no code asked)", () => {
        const { result } = run({ ...saved, email: { value: "" } });
        expect(result.current.state.email.changed).toBe(false);
        expect(result.current.unverifiedChanged).toEqual([]);
    });
});
