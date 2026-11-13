/* eslint-env jest */
import { launchWhatsAppApp } from "../../utils/utils";
import { WHATSAPP_APP_SCHEME } from "../../Views/Pages/WorkerPage/workerModuleConstants";

describe("Send Template · Open WhatsApp launches the app scheme in the current tab (no blank tab)", () => {
    const original = window.location;
    beforeEach(() => { delete window.location; window.location = { assign: jest.fn() }; window.open = jest.fn(); });
    afterEach(() => { window.location = original; });
    test("asks the OS for whatsapp:// without a recipient or message and never opens a new window", () => {
        expect(WHATSAPP_APP_SCHEME).toBe("whatsapp://");
        expect(launchWhatsAppApp(WHATSAPP_APP_SCHEME)).toEqual({ opened: true });
        expect(window.location.assign).toHaveBeenCalledWith("whatsapp://");
        expect(window.open).not.toHaveBeenCalled();
    });
    test("a refused launch reads as blocked", () => {
        window.location.assign.mockImplementation(() => { throw new Error("blocked"); });
        expect(launchWhatsAppApp(WHATSAPP_APP_SCHEME)).toEqual({ opened: false });
    });
});
