/* Display-only worker label mappings — stored values and identities are unchanged. */

/* The shared course label is "Mother and Baby Care Course" (W-02); legacy data stores "Maternity Course". */
const COURSE_DISPLAY_NAMES = { 'maternity course': 'Mother and Baby Care Course' };
export const courseDisplayName = (name) => COURSE_DISPLAY_NAMES[String(name || '').trim().toLowerCase()] || name;

/* District applies to Hong Kong work locations only (W-02). */
export const isHongKongLocation = (countryInfo) => /hong\s*kong/i.test(countryInfo?.name || '');

/* WORKER.md Work History: Reason for Leaving IS the experience's Contract Status (work order 26 Oct) — the name comes from the
   contract status list (admin_panel_status), or from a name the row itself carries */
export const experienceReasonForLeaving = (exp, contractStatusList = []) => {
    const id = exp?.contract_status ?? exp?.contract_status_info?.id;
    const fromList = id != null && id !== '' ? (contractStatusList || []).find((s) => Number(s?.id) === Number(id)) : null;
    return fromList?.admin_panel_status || fromList?.name || exp?.contract_status_info?.admin_panel_status || exp?.contract_status_info?.name || exp?.leaving_reason_info?.name || '';
};

/* WORKER.md Step 7 (ClickUp 14ykpqtn0j7 item 2, backend 253): the five care skills carry an age band — "Baby Care (0-1)" …
   "Elderly Care (65+)" — composed on the client from `age_range` (the master row's, else the saved row's own); the master
   names stay unbanded. A skill without a band prints its name. */
export const skillDisplayName = (skill, master) => {
    const name = String(skill?.name || skill?.name_en || '').trim();
    if (!name) return '';
    const row = Array.isArray(master) ? master.find((m) => String(m?.id) === String(skill?.id)) : null;
    const band = String(skill?.age_range || row?.age_range || '').trim();
    return band ? `${ name } (${ band })` : name;
};
