import { getInnerPermissionCategory, getPermissionValue, isAdminUser } from "../../../../services/commonService";
import { EMPLOYER_SEARCH_ACCESS } from "./employerNewUiConstants";

const csvHas = (permissionList, key, value) => {
    const csv = getInnerPermissionCategory(permissionList, 'employer', key)?.selected_value;
    return Boolean(csv) && String(csv).split(',').includes(value);
};

const ALL_GRANTS = Object.freeze({
    contactView: true, contactEdit: true, detailsTab: true,
    basicView: true, basicEdit: true, basicSendTemplate: true, familyView: true, familyEdit: true, familySendTemplate: true,
    ban: true, restore: true,
    searchAccess: EMPLOYER_SEARCH_ACCESS.FULL,
    accessLocations: null,
});

/* PERM §9.1 Access (Location): the grid stores the ticked location ids as a CSV (`employer_access_location`). null = admin,
   or an account with no ticks — the server then returns no employer at all (backend 375 / E-8: the list answers
   ACCESS_NOT_FOUND, a record 403 EMPLOYER_LOCATION_NOT_ALLOWED → the neutral denial screen) */
const accessLocationIds = (permissionList) => {
    const csv = getInnerPermissionCategory(permissionList, 'employer', 'employer_access_location')?.selected_value;
    const ids = String(csv || '').split(',').map((value) => Number(value.trim())).filter((value) => Number.isFinite(value) && value > 0);
    return ids.length ? ids : null;
};

/*
 * Employer grants as the record and the dashboard use them (PERM §9). One reader, so a control cannot drift from the grid.
 * "If View unchecked, Edit irrelevant" — every Edit needs its View. Search Access: '' (no search) | restricted | full_access.
 * 21 Oct catalogue (U-0346): Basic — View and Family — View are children of the Details tab control, so neither section
 *   exists for an actor without it (hidden, not read-only). Basic / Family — Send Template (U-0047) each need their View.
 * U-0046: Ban Employer and Restore Employer are two separate record actions (`employer_ban` / `employer_restore`).
 * `employer_details_tab` stores `y` / `n` (backend 375 / E-18); the reader also tolerates the older '' / no.
 */
export const getEmployerGrants = (permissionList) => {
    if (isAdminUser()) return ALL_GRANTS;
    const contactView = csvHas(permissionList, 'employer_contact_details', 'view');
    const detailsTabValue = String(getPermissionValue(permissionList?.data, 'employer', 'employer_details_tab') || '').toLowerCase();
    const detailsTab = detailsTabValue !== '' && detailsTabValue !== 'n' && detailsTabValue !== 'no';
    const basicView = detailsTab && csvHas(permissionList, 'employer_basic_details', 'view');
    const familyView = detailsTab && csvHas(permissionList, 'employer_family_details', 'view');
    return {
        contactView,
        contactEdit: contactView && csvHas(permissionList, 'employer_contact_details', 'edit'),
        detailsTab,
        basicView,
        basicEdit: basicView && csvHas(permissionList, 'employer_basic_details', 'edit'),
        basicSendTemplate: basicView && csvHas(permissionList, 'employer_basic_details', 'send_template'),
        familyView,
        familyEdit: familyView && csvHas(permissionList, 'employer_family_details', 'edit'),
        familySendTemplate: familyView && csvHas(permissionList, 'employer_family_details', 'send_template'),
        ban: getPermissionValue(permissionList?.data, 'employer', 'employer_ban') === 'y',
        restore: getPermissionValue(permissionList?.data, 'employer', 'employer_restore') === 'y',
        searchAccess: String(getPermissionValue(permissionList?.data, 'employer', 'employer_access_type') || ''),
        accessLocations: accessLocationIds(permissionList),
    };
};
