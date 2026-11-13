/* eslint-env jest */
import { configureStore } from "@reduxjs/toolkit";

jest.mock("../../services/jobOffers", () => ({
    __esModule: true,
    cancelSuggestedInterview: jest.fn(),
}));
jest.mock("../../utils/translation", () => ({ __esModule: true, default: (key) => key, translation: (key) => key }));

const { cancelSuggestedInterview } = require("../../services/jobOffers");
const { cancelSuggestion } = require("../../redux/Slices/job-offer/JobOfferSlice");

const store = configureStore({ reducer: { noop: (s = {}) => s } });

describe("cancelSuggestion returns the API envelope (work order 27 Oct)", () => {
    test("a successful cancel resolves to { status: true, message } so the caller toasts the server message", async () => {
        cancelSuggestedInterview.mockResolvedValueOnce({ data: { status: true, message: "Suggestion cancelled successfully", data: [] } });
        const res = await store.dispatch(cancelSuggestion({ worker_id: 7, job_id: 329 }));
        expect(cancelSuggestedInterview).toHaveBeenCalledWith({ worker_id: 7, job_id: 329 });
        expect(res.error).toBeUndefined();
        expect(res.payload).toEqual({ status: true, message: "Suggestion cancelled successfully", data: [] });
    });
    test("a refused cancel keeps the server message on the rejected payload", async () => {
        cancelSuggestedInterview.mockRejectedValueOnce({ response: { status: 403, data: { status: false, message: "CAN_NOT_CANCEL_SUGGESTION", data: [] } } });
        const res = await store.dispatch(cancelSuggestion({ worker_id: 7, job_id: 329 }));
        expect(res.error).toBeDefined();
        expect(res.payload.data.data.message).toBe("CAN_NOT_CANCEL_SUGGESTION");
    });
});
