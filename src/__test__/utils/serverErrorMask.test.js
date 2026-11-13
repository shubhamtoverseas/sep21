/* eslint-env jest */
import createApiInstance from "../../services/createApiInstance";

jest.mock("../../utils/translation", () => ({ __esModule: true, default: (key) => key }));
jest.mock("../../utils/forceLogout", () => ({ forceLogout: jest.fn(), isLoggedOutResponse: () => false }));
jest.mock("../../utils/storage", () => ({ getStoredUser: () => null }));

/* an adapter that fails with the given status and body, the way axios surfaces a server response */
const failingAdapter = (status, data) => async (config) => {
    const response = { status, data, headers: {}, config, statusText: String(status) };
    const error = new Error(`Request failed with status code ${ status }`);
    error.config = config;
    error.response = response;
    throw error;
};

const call = async (status, data) => {
    const api = createApiInstance("http://api.test", {});
    api.defaults.adapter = failingAdapter(status, data);
    try { await api.get("/x"); } catch (error) { return error.response; }
    throw new Error("expected a rejection");
};

describe("5xx responses are masked by the shared interceptor", () => {
    beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
    afterEach(() => console.error.mockRestore());

    it("replaces a raw 500 message, keeps the body shape and the original text aside", async () => {
        const res = await call(500, { status: false, message: "Invalid `prisma.staff.findMany()` invocation", code: "P2010" });
        expect(res.data.message).toBe("Something went wrong. Please try again.");
        expect(res.data.raw_message).toContain("prisma");
        expect(res.data.server_error).toBe(true);
        expect(res.data.status).toBe(false);
        expect(res.data.code).toBe("P2010");
    });

    it("wraps a non-JSON 502 body", async () => {
        const res = await call(502, "<html>Bad Gateway</html>");
        expect(res.data.message).toBe("Something went wrong. Please try again.");
        expect(res.data.raw_message).toContain("Bad Gateway");
    });

    it("leaves a 4xx body untouched", async () => {
        const res = await call(403, { status: false, code: "NOT_PREPARED_OWNER", message: "Only the Prepared owner may mark this." });
        expect(res.data).toEqual({ status: false, code: "NOT_PREPARED_OWNER", message: "Only the Prepared owner may mark this." });
    });
});
