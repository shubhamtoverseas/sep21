import React from "react";
import UserFormPage from "./UserFormPage";

/* U-0357 (21 Oct): Settings → People → Users → Permissions — the selected user's permission editor on its own page
   (`?id=<staff id>`); the wizard's hook, dialogs and save bar are reused, the 4-step strip is not shown */
const UserPermissionsPage = () => <UserFormPage permissionsOnly />;

export default UserPermissionsPage;
