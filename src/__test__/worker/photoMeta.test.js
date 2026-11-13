/* eslint-env jest */
import { actorSource, dimsLabel, photoRecords, withSource } from "../../Views/Pages/WorkerPage/worker-detail/newui/photo/photoModel";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

describe("Photo meta rows after backend 286 (work order 27 Oct)", () => {
    const verified = {
        image_status: "verified",
        default_worker_image: {
            id: 9, final_image: "https://s3/x/crop.png", uploaded: "https://s3/x/596BCA92.png",
            crop: { cx: 50, cy: 30, r: 20 }, file_name: "596BCA92.png",
            uploaded_at: "2026-10-23 09:29:00", uploaded_by: 3, uploaded_by_name: "Rosamie Dela Cruz", uploaded_by_role: "Worker",
            approved_at: "2026-10-23 14:59:00", approved_by: 1, approved_by_name: "Maidmatch Admin",
        },
        last_uploaded_worker_image: null,
    };
    it("reads the uploader, the uploader role and the Verified decision from the image row", () => {
        const { current } = photoRecords(verified);
        expect(current.uploadedBy).toBe("Rosamie Dela Cruz");
        expect(current.uploadedByRole).toBe("Worker");
        expect(current.approvedBy).toBe("Maidmatch Admin");
        expect(current.approvedAt).toBe("2026-10-23 14:59:00");
        expect(current.crop).toEqual({ cx: 50, cy: 30, r: 20 });
        expect(current.fileName).toBe("596BCA92.png");
    });
    it("maps the role to the source suffix, case-insensitively, and leaves unknown roles without one", () => {
        expect(actorSource("Worker")).toBe("key_wkr_photo_source_worker_app");
        expect(actorSource("admin")).toBe("key_wkr_photo_source_staff");
        expect(actorSource("Staff")).toBe("key_wkr_photo_source_staff");
        expect(actorSource("Employer")).toBe("key_wkr_photo_source_employer");
        expect(actorSource(null)).toBe("");
        expect(actorSource("Robot")).toBe("");
    });
    it("appends the suffix to a known name only; a missing name stays a dash", () => {
        expect(withSource("Linda Wong", "(staff)")).toBe("Linda Wong (staff)");
        expect(withSource("Linda Wong", "")).toBe("Linda Wong");
        expect(withSource(null, "(staff)")).toBeNull();
    });
    it("labels dimensions only once both are known", () => {
        expect(dimsLabel({ w: 3024, h: 4032 })).toBe("3024 x 4032");
        expect(dimsLabel(null)).toBeNull();
        expect(dimsLabel({ w: 0, h: 0 })).toBeNull();
    });
});
