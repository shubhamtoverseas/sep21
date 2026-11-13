/* eslint-env jest */
import fs from "fs";
import path from "path";

/* Priyanka 11 Nov: the backend stores Direct Manager "Self" as the user's own user_id, so (1) the edited user
   never lists as their own manager — the Self option is that choice — and (2) a loaded manager_id equal to the
   user's own id reads back as Self, exactly like null. Save still sends MANAGER_SELF_VALUE as null (unchanged). */
const read = (rel) => fs.readFileSync(path.join(__dirname, rel), "utf8");

test("Direct Manager list leaves out the edited user (Self stands in)", () => {
    const src = read("../../Views/Pages/SettingsPage/newui/users/tabs/UserPermissionsTab.js");
    expect(src).toContain("activeUsers.filter((user) => String(user.user_id) !== String(currentUser?.user_id))");
});

test("a loaded manager_id of null OR the user's own id maps to Self; save still nulls Self", () => {
    const src = read("../../Views/Pages/SettingsPage/newui/users/useUserForm.js");
    expect(src).toContain("data.manager_id === null || String(data.manager_id) === String(data.user_id)");
    expect(src).toContain("manager_id: data.manager_id === MANAGER_SELF_VALUE ? null : data.manager_id");
});
