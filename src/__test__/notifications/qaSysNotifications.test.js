/* eslint-env jest */
import fs from "fs";
import path from "path";
import { NOTIFICATION_FAMILIES } from "../../Views/Pages/Notifications/notificationConstants";

/* QA-SYS Activity & Notifications (4 Nov 2026): the inbox and bell against the ACTIVITY_NOTIFICATIONS register and NOTIFICATION-MAP
   (qa-system-doc/QA_SYS_ACTIVITY_NOTIFICATIONS_REPORT.md). Source checks for what is done; `test.todo` names each open defect. */
const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");

describe("QA-SYS Notifications", () => {
    test("families the map marks not enabled have no destination row (ACT #53 / #54; U-0163, U-0184; DONE)", () => {
        for (const type of ["notification_to_worker_for_not_uploading_photo", "submit_policy_request", "insurance_effective_date_updated", "update_visa_reference_no_notification_to_cs"])
            expect(NOTIFICATION_FAMILIES[type]).toBeUndefined();
    });

    test.todo("QA-SYS-ACTIVITY-009: \"Match created\" (job_matched) has no destination row while the map marks it not enabled (ACT #54) — the registry still routes it to Job Offer Details");

    test("opening an item marks it read before the destination is resolved, so an unavailable target is still read (ACT #44; DONE)", () => {
        const open = read("Views/Pages/Notifications/newui/useNotificationActions.js");
        expect(open.indexOf("if (!item?.is_read) markRead(item);")).toBeGreaterThan(-1);
        expect(open.indexOf("if (!item?.is_read) markRead(item);")).toBeLessThan(open.indexOf("resolveTarget(item, permissionList)", open.indexOf("const open")));
    });

    test.todo("QA-SYS-ACTIVITY-002: the bell badge and the page's unread count load on start (ACT #42 one count) — nothing dispatches fetchNotificationUnreadCount since 6eac2e787, so they read 0 and Mark all read is disabled while items are unread");
    test.todo("QA-SYS-ACTIVITY-008: the system actor reads \"system\" in lower case on every activity surface (ACT #13) — Contract Activity, the invoice feed and Insurance history show \"System\"");
});
