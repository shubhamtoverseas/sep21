/* eslint-env jest */
import fs from "fs";
import path from "path";
import { skillDisplayName } from "../../utils/workerDisplay";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* ClickUp 14ykpqtn0j7 item 2 / WORKER.md Step 7 / backend 253: care skills print their age band from `age_range` */
describe("worker skills · age band label", () => {
    test("band from the saved row, else from the master row, else the bare name", () => {
        expect(skillDisplayName({ id: 5, name: "Elderly Care", age_range: "65+" })).toBe("Elderly Care (65+)");
        expect(skillDisplayName({ id: 1, name: "Baby Care" }, [{ id: 1, name: "Baby Care", age_range: "0-1" }])).toBe("Baby Care (0-1)");
        expect(skillDisplayName({ id: 7, name: "Driving" }, [{ id: 7, name: "Driving", age_range: "" }])).toBe("Driving");
        expect(skillDisplayName({ id: 9, name_en: "Teen Care", age_range: "13-19" })).toBe("Teen Care (13-19)");
        expect(skillDisplayName(null)).toBe("");
    });
    test("the Profile read card and the Main Skills editor compose the label; no hard-coded band remains", () => {
        const view = read("Views/Pages/WorkerPage/worker-detail/profile-tab/biodata-tab/BiodataView.js");
        const form = read("Views/Pages/WorkerPage/worker-detail/profile-tab/biodata-tab/MainSkillsBiodataForm.js");
        expect(view).toMatch(/skillDisplayName\(s, mainSkills\)/);
        expect(form).toMatch(/label: skillDisplayName\(item\)/);
        expect(form).not.toMatch(/65\+/);
    });
});
