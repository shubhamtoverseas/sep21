/* eslint-env jest */
import { dispatchWithHandling } from "../../utils/dispatchHandler";

const fakeDispatch = (outcome) => jest.fn(() => ({ unwrap: () => outcome }));
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("dispatchWithHandling (backend 292 FYI, 27 Oct: a failed fetch must not crash the page)", () => {
    let warn;
    beforeEach(() => { warn = jest.spyOn(console, "warn").mockImplementation(() => {}); });
    afterEach(() => { warn.mockRestore(); });

    test("a fire-and-forget rejected thunk raises no unhandled rejection (the global ErrorBoundary would show 'Something went wrong')", async () => {
        const unhandled = jest.fn();
        process.on("unhandledRejection", unhandled);
        try {
            dispatchWithHandling(fakeDispatch(Promise.reject(new Error("The type is invalid."))), { type: "x" });
            await flush();
            await flush();
            expect(unhandled).not.toHaveBeenCalled();
            expect(warn).toHaveBeenCalledWith("[dispatchWithHandling] rejected:", "The type is invalid.");
        } finally {
            process.off("unhandledRejection", unhandled);
        }
    });

    test("an awaiting caller still receives the rejection", async () => {
        const error = new Error("nope");
        await expect(dispatchWithHandling(fakeDispatch(Promise.reject(error)), { type: "x" })).rejects.toBe(error);
    });

    test("a resolved thunk resolves with the unwrapped payload", async () => {
        await expect(dispatchWithHandling(fakeDispatch(Promise.resolve({ ok: 1 })), { type: "x" })).resolves.toEqual({ ok: 1 });
    });
});
