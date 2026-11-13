/* eslint-env jest */
import { photoActivityEntries } from "../../Views/Pages/WorkerPage/worker-detail/newui/photo/photoActivity";
import { CD_DEFAULT_GROUP } from "../../Views/Pages/Contract/contractConstants";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

describe("Photo activity lines (backend 287, work order 27 Oct)", () => {
    const logs = [
        { id: 4, type: "image_crop_adjusted", current_status: "verified", message: "Headshot crop set to 50%, 32% · r 21%", json_data: JSON.stringify({ image_id: 9, crop: { cx: 50, cy: 32, r: 21 } }), created_at: "2026-10-27 11:02:00", log_created_by: "Maidmatch Admin", log_created_by_role: "Admin", actor_type: "staff" },
        { id: 3, type: "update_image", current_status: "verified", message: "", created_at: "2026-10-23 14:59:00", log_created_by: "Maidmatch Admin", log_created_by_role: "Admin", actor_type: "staff" },
        { id: 2, type: "update_image", current_status: "in_review", message: "", created_at: "2026-10-23 14:58:00", log_created_by: "System", log_created_by_role: "System", actor_type: "system" },
        { id: 1, type: "image_uploaded", current_status: "verified", message: "", created_at: "2026-10-23 09:29:00", log_created_by: "Rosamie Dela Cruz", log_created_by_role: "Worker", actor_type: "worker" },
        { id: 0, type: "update_image", current_status: "in_complete", created_at: "2026-10-22 09:00:00" },
    ];
    const lines = photoActivityEntries(logs);

    it("composes one line per entry from type, status and json_data — never from the server message for status lines", () => {
        expect(lines.map((l) => l.text)).toEqual([
            "key_wkr_photo_act_crop_set".replace("{{crop}}", "50%, 32% · r 21%"),
            "key_wkr_photo_act_status_set key_wkr_photo_act_published",
            "key_wkr_photo_act_status_set",
            "key_wkr_photo_act_submitted",
            "key_not_submitted",
        ]);
        expect(lines.map((l) => l.dot)).toEqual(["blue", "green", "blue", "blue", "red"]);
    });
    it("by-lines carry the role suffix; System reads system; the Incomplete line has no by-line", () => {
        expect(lines[0].by).toBe("Maidmatch Admin key_wkr_photo_source_staff");
        expect(lines[2].by).toBe("system");
        expect(lines[3].by).toBe("Rosamie Dela Cruz key_wkr_photo_source_worker");
        expect(lines[4].by).toBeNull();
    });
    it("an admin upload reads Original photo uploaded and never a status, whatever current_status the log carries", () => {
        const [line] = photoActivityEntries([{ type: "image_uploaded", current_status: "verified", log_created_by: "Linda Wong", log_created_by_role: "Staff", actor_type: "staff", created_at: "2026-10-23 09:29:00" }]);
        expect(line.text).toBe("key_wkr_photo_act_uploaded");
        expect(line.by).toBe("Linda Wong key_wkr_photo_source_staff");
    });
    it("a crop line without parseable json_data falls back to the server message; a removal reads Photo removed", () => {
        const [crop, removed] = photoActivityEntries([
            { type: "image_crop_adjusted", message: "Headshot crop set to 1%, 2% · r 20%", json_data: "{broken", created_at: "2026-10-27 11:02:00" },
            { type: "image_removed", log_created_by: "Linda Wong", log_created_by_role: "Staff", created_at: "2026-10-27 11:03:00" },
        ]);
        expect(crop.text).toBe("Headshot crop set to 1%, 2% · r 20%");
        expect(removed.text).toBe("key_wkr_photo_act_removed");
        expect(removed.dot).toBe("red");
    });
});

describe("Contracts dashboard opens on Group 1 (work order 27 Oct)", () => {
    it("the default VIEW is the first group, not the prototype's fixture Group 2", () => {
        expect(CD_DEFAULT_GROUP).toBe(1);
    });
});
