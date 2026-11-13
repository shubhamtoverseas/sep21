import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { indonesiaId, fillipinoId, bangladeshId, thaiId, COLUMN_VIEW_STATE_KEYS } from "../../../../components/ReusableComponents/constants";
import { listingTrackWidth, timeSince } from "../../../../services/commonService";
import { INACTIVE_STATUS_ID, NAME_NOT_PROVIDED, WORKER_PROFILE_STATUS } from "../workerModuleConstants";

dayjs.extend(customParseFormat);

const fmtDate = (v) => {
    if (!v) return '';
    const d = dayjs(v, ['YYYY-MM-DD', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss'], true);
    return d.isValid() ? d.format('DD/MM/YYYY') : v;
};

const sinceLabel = (v) => {
    if (!v) return '';
    const d = dayjs(v);
    if (!d.isValid()) return '';
    const days = dayjs().startOf('day').diff(d.startOf('day'), 'day');
    if (days < 0) return '';
    return days < 60 ? `${ days }d` : `${ Math.floor(days / 30) } mos`;
};

const countriesLabel = (v) => {
    if (Array.isArray(v)) return v.map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean).join(', ');
    return typeof v === 'string' ? v : '';
};

export const BUCKETS = [
    { key: 'all',            label: 'All Workers',      subtitle: 'Default view across all statuses',               statusIds: [] },
    { key: 'not_registered', label: 'Not registered',   subtitle: 'Invite sent, but not yet registered',            statusIds: [9] },
    { key: 'pipeline',       label: 'Profile pipeline', subtitle: 'Registered → 1 → 2 → review',                    statusIds: [1, 2] },
    { key: 'available',      label: 'Available',        subtitle: 'Ready for matching',                             statusIds: [3] },
    { key: 'hired',          label: 'Hired',            subtitle: 'Hired, not yet working',                         statusIds: [13] },
    { key: 'employed',       label: 'Employed',         subtitle: 'Currently on contract',                          statusIds: [4] },
    /* U005: derived Inactive (14) sits with the other not-active states */
    { key: 'not_active',     label: 'Not active',       subtitle: 'Hidden, restricted, or temporarily unavailable', statusIds: [5, 6, 7, 8, 10, 12, INACTIVE_STATUS_ID] },
];

/* status key → dashboard chip ({ label, intent, tone, treatment }) — a view over the ONE registry (WORKER_PROFILE_STATUS) */
export const STATUS = Object.fromEntries(Object.values(WORKER_PROFILE_STATUS).map((s) => [
    s.key, { label: s.label, intent: s.intent, tone: s.dashTone, ...(s.treatment ? { treatment: s.treatment } : {}) },
]));
export const STATUS_ORDER = ['available', 'inactive', 'hired', 'employed', 'in_review', 'incomplete', 'on_hold', 'holiday', 'not_registered', 'withdrawn', 'not_visible', 'suspended', 'banned'];

export const BUCKET_STATUSES = {
    all:            STATUS_ORDER.slice(),
    not_registered: ['not_registered'],
    pipeline:       ['incomplete', 'in_review'],
    available:      ['available'],
    hired:          ['hired'],
    employed:       ['employed'],
    not_active:     ['inactive', 'on_hold', 'holiday', 'withdrawn', 'not_visible', 'suspended', 'banned'],
};

export const STATUS_ID_TO_KEY = Object.fromEntries(Object.values(WORKER_PROFILE_STATUS).map((s) => [s.id, s.key]));
export const STATUS_KEY_TO_ID = Object.entries(STATUS_ID_TO_KEY).reduce((acc, [id, key]) => {
    acc[key] = Number(id);
    return acc;
}, {});
const STATUS_NAME_TO_KEY = Object.entries(STATUS).reduce((acc, [key, s]) => {
    acc[s.label.toLowerCase()] = key;
    return acc;
}, {});
const statusNameOf = (workerStatus) => workerStatus?.worker_status || workerStatus?.name || '';
export const statusKeyFor = (workerStatus) =>
    STATUS_ID_TO_KEY[workerStatus?.id]
    || STATUS_NAME_TO_KEY[String(statusNameOf(workerStatus)).trim().toLowerCase()]
    || null;
export const statusLabelFor = (workerStatus) => {
    const key = statusKeyFor(workerStatus);
    return key ? STATUS[key].label : statusNameOf(workerStatus);
};

/* DASH.md §16.1 (worker_AUDIT D13): the dropdown follows STATUS_ORDER (Inactive right after Available) whatever order the API
   sends, and a status the registry does not know (a legacy row) is never offered. `hiddenStatusIds` (PERM §5.7, X17) removes
   the statuses the actor's Profile Status global filter leaves unticked. */
const statusOrderIndex = (key) => { const i = STATUS_ORDER.indexOf(key); return i === -1 ? STATUS_ORDER.length : i; };
export const statusOptionsFor = (bucket, apiStatuses, hiddenStatusIds = null) => {
    const keys = BUCKET_STATUSES[bucket] || STATUS_ORDER;
    const hidden = new Set((hiddenStatusIds || []).map(String));
    const list = (Array.isArray(apiStatuses) && apiStatuses.length
        ? apiStatuses
            .map((s) => ({ key: statusKeyFor(s), value: String(s.id), label: statusLabelFor(s) }))
            .filter((o) => o.key)
            .sort((a, b) => statusOrderIndex(a.key) - statusOrderIndex(b.key))
        : keys
            .filter((k) => STATUS_KEY_TO_ID[k] != null)
            .map((k) => ({ key: k, value: String(STATUS_KEY_TO_ID[k]), label: STATUS[k].label }))
    ).filter((o) => !hidden.has(o.value)).map(({ value, label }) => ({ value, label }));
    if (bucket === 'all') return [{ value: '', label: 'All' }, ...list];
    if (list.length === 1) return [{ value: '', label: list[0].label }];
    const bucketLabel = (BUCKETS.find((b) => b.key === bucket) || {}).label || 'All';
    return [{ value: '', label: bucketLabel }, ...list];
};

export const STAGE = {
    review:       { label: 'Review',          intent: 'info'      },
    action:       { label: 'Action Required', intent: 'attention' },
    not_assigned: { label: 'Not Assigned',    intent: 'neutral'   },
    completed:    { label: 'Completed',       intent: 'success'   },
};

export const JO_STAGES = [
    { key: 'invited',   label: 'Invited',             icon: 'send',     hue: 'invited'   },
    { key: 'applied',   label: 'Applied',             icon: 'user',     hue: 'applied'   },
    { key: 'matched',   label: 'Matched',             icon: 'link',     hue: 'matched'   },
    { key: 'upcoming',  label: 'Interview Upcoming',  icon: 'calendar', hue: 'upcoming'  },
    { key: 'pending',   label: 'Interview Pending',   icon: 'clock',    hue: 'pending'   },
    { key: 'completed', label: 'Interview Completed', icon: 'check',    hue: 'completed' },
    { key: 'cancelled', label: 'Cancelled',           icon: 'x',        hue: 'cancelled' },
];
export const JO_STAGE_EMPHASIS = ['applied', 'matched'];
export const JO_STAGE_SHORT = {
    invited: 'Invited', applied: 'Applied', matched: 'Matched', upcoming: 'Upcoming',
    pending: 'Pending', completed: 'Completed', cancelled: 'Cancelled',
};

export const NATIONALITIES = [
    { id: fillipinoId,  label: 'Filipino' },
    { id: indonesiaId,  label: 'Indonesian' },
    { id: thaiId,       label: 'Thai' },
    { id: bangladeshId, label: 'Bangladeshi' },
];
export const TYPES = [
    { id: '', label: 'Local + Overseas' },
    { id: 1,  label: 'Local' },
    { id: 2,  label: 'Overseas' },
];

export const COLS = {
    worker:            { label: 'Worker Name',                type: 'identity', w: 200, sort: 'fullname', sticky: true },
    worker_code:       { label: 'Worker Code',                type: 'code',     w: 140, sort: 'reference_id' },
    status:            { label: 'Profile Status',             type: 'badge',    w: 140, sort: 'status' },
    updated:           { label: 'Updated',                    type: 'mono',     w: 112, sort: 'last_profile_updated_at' },
    activity:          { label: 'Activity',                   type: 'mono',     w: 112, sort: 'last_activity_at' },
    time_avail:        { label: 'Time Available',             type: 'mono',     w: 112 },
    delay:             { label: 'Delay',                      type: 'delay',    w: 88,  sort: 'worker_delay' },
    views:             { label: 'Views',                      type: 'mono',     w: 112, sort: 'worker_views_count' },
    jo_stats:          { label: 'Job Offer Statistics',       type: 'jo',       w: 250 },
    jo_stage:          { label: 'Stage Details',              type: 'stage_details', w: 176 },
    overseas_exp:      { label: 'Overseas Experience',        type: 'plain',    w: 170, clamp: true, lines: 2 },
    duplicate_reason:  { label: 'Duplicate Reason',           type: 'plain',    w: 220, clamp: true, lines: 2 },
    contract_status:   { label: 'Contract Status',            type: 'contract', w: 180, sort: 'contract_status' },
    days_remaining:    { label: 'Days Remaining',             type: 'mono',     w: 112, sort: 'days_available' },
    contract_end:      { label: 'Contract End Date',          type: 'mono',     w: 128, sort: 'contract_end_date' },
    contract_end_pipe: { label: 'Contract End',               type: 'mono',     w: 116, sort: 'contract_end_date' },
    contract_date:     { label: 'Contract Date',              type: 'mono',     w: 112, sort: 'start_date' },
    visa_release:      { label: 'Visa Release Date',          type: 'mono',     w: 128, sort: 'e_visa_payment_date' },
    requested_start:   { label: 'Requested Start',            type: 'mono',     w: 120, sort: 'requested_start_date' },
    start_date:        { label: 'Start Date',                 type: 'mono',     w: 112, sort: 'start_date' },
    visa_expiry:       { label: 'Visa Expiry',                type: 'mono',     w: 112, sort: 'visa_expiry_date' },
    contract_expected: { label: 'Contract End',               type: 'expected', w: 168, sort: 'contract_end_visa_expiry_date' },
    partner_code:      { label: 'Partner Code',               type: 'mono',     w: 112 },
    partner_owner:     { label: 'Partner Owner',              type: 'owner', role: 'po',  w: 140, ownerPool: 'po' },
    onboarding:        { label: 'Onboarding',                 type: 'owner', role: 'onb', w: 132, ownerPool: 'onb' },
    interpreter:       { label: 'Interpreter',                type: 'owner', role: 'int', w: 132, ownerPool: 'int' },
    cs:                { label: 'CS Owner',                   type: 'owner', role: 'cs',  w: 132, ownerPool: 'cs' },
    /* DASH.md §1.2 (worker_AUDIT D3): the Hired contract's assisting CS — zero or one, em dash when none, owner-style header filter */
    cs_assistant:      { label: 'CS Assistant',               type: 'owner', role: 'csa', w: 132, ownerPool: 'csa' },
    branch:            { label: 'Branch',                     type: 'plain',    w: 132 },
    biodata:           { label: 'Biodata',                    type: 'stage', w: 110, action: 'biodata' },
    photo:             { label: 'Photo',                      type: 'stage', w: 100, action: 'photo' },
    passport:          { label: 'Passport',                   type: 'stage', w: 100, grp: 'doc', action: 'passport' },
    birth_cert:        { label: 'Birth Certificate',          type: 'stage', w: 130, grp: 'doc', action: 'birth-certificate' },
    family_cert:       { label: 'Family Certificate',         type: 'stage', w: 140, grp: 'doc', action: 'family-certificate' },
    indo_id:           { label: 'Indonesian ID',              type: 'stage', w: 120, grp: 'doc', action: 'indonesian-id' },
    edu_cert:          { label: 'Education Certificate',      type: 'stage', w: 150, grp: 'doc', action: 'education-certificate' },
    ereg:              { label: 'E-Registration',             type: 'stage', w: 120, action: 'eregistration' },
    peos:              { label: 'PEOS',                       type: 'stage', w: 100, action: 'peos-certificate' },
    tesda:             { label: 'TESDA',                      type: 'stage', w: 100, action: 'tesda' },
    phone:             { label: 'Phone',                      type: 'stage', w: 80 },
    assign_partner:    { label: 'Assign Partner',             type: 'stage', w: 130, action: 'assign-pt' },
    assign_pt:         { label: 'Assign PT',                  type: 'stage', w: 110, action: 'assign-pt' },
    medical:           { label: 'Medical',                    type: 'stage', w: 110, grp: 'pt', action: 'medical' },
    submit_docs:       { label: 'Submit Documents',           type: 'stage', w: 140, grp: 'pt', action: 'submit-documents' },
    training_cert:     { label: 'Training Certificate',       type: 'stage', w: 145, grp: 'pt', action: 'training-certificate' },
    labour_id:         { label: 'Labour ID',                  type: 'stage', w: 100, grp: 'pt', action: 'labor-id' },
    passport_th:       { label: 'Passport',                   type: 'stage', w: 100, action: 'passport' },
    passport_icon:     { label: 'Passport',                   type: 'stage', w: 90,  action: 'passport' },
};
export const GROUPS = { doc: 'Doc Upload', pt: 'PT' };

export const TABLE_COLS = {
    all:            ['worker', 'worker_code', 'status', 'updated', 'activity', 'onboarding', 'interpreter', 'cs', 'branch'],
    not_registered: ['worker', 'worker_code', 'status', 'updated', 'partner_code', 'partner_owner'],
    pipe_local:     ['worker', 'worker_code', 'status', 'updated', 'delay', 'biodata', 'photo', 'contract_status', 'contract_end_pipe', 'visa_expiry', 'onboarding'],
    pipe_ph:        ['worker', 'worker_code', 'status', 'updated', 'delay', 'biodata', 'photo', 'ereg', 'peos', 'tesda', 'phone', 'assign_partner', 'onboarding'],
    pipe_id:        ['worker', 'worker_code', 'status', 'updated', 'delay', 'biodata', 'photo', 'passport', 'birth_cert', 'family_cert', 'indo_id', 'edu_cert', 'phone', 'assign_pt', 'medical', 'submit_docs', 'training_cert', 'labour_id', 'onboarding'],
    pipe_th:        ['worker', 'worker_code', 'status', 'updated', 'delay', 'biodata', 'photo', 'passport_th', 'onboarding'],
    avail_local:    ['worker', 'worker_code', 'status', 'updated', 'activity', 'views', 'jo_stats', 'contract_status', 'days_remaining', 'contract_end'],
    avail_os:       ['worker', 'worker_code', 'status', 'updated', 'activity', 'time_avail', 'views', 'jo_stage', 'overseas_exp', 'passport_icon'],
    hired:          ['worker', 'worker_code', 'status', 'updated', 'activity', 'contract_date', 'visa_release', 'requested_start', 'interpreter', 'cs', 'cs_assistant', 'branch'],
    employed:       ['worker', 'worker_code', 'status', 'updated', 'activity', 'start_date', 'visa_expiry', 'contract_expected', 'interpreter', 'cs', 'branch'],
    not_active:     ['worker', 'worker_code', 'status', 'updated', 'activity', 'contract_expected', 'onboarding', 'interpreter', 'cs', 'branch'],
    duplicates:     ['worker', 'worker_code', 'status', 'updated', 'duplicate_reason'],
};

export const PARTNER_BUCKETS = ['all', 'pipeline'];
export const PARTNER_COLS = ['worker', 'worker_code', 'status', 'updated', 'biodata', 'photo'];

const COL_ROLE = {
    identity: 'name', code: 'ref', mono: 'date', expected: 'datex', delay: 'amount',
    owner: 'staff', plain: 'staff', badge: 'status', contract: 'status', stage: 'status',
    stage_details: 'status', jo: 'status',
};
export const colTrack = (col) => listingTrackWidth(COL_ROLE[col.type] || 'staff', col.w || 0);

/* owner header-filter registers → list payload param; `csa` (CS Assistant, `cs_assistant_id` + staff type `cs_assistant`) per worker_DELTA D-26 */
export const OWNER_POOL_PARAM = { onb: 'onboarding_id', int: 'interpreter_id', cs: 'cs_id', po: 'partner_owner_id', csa: 'cs_assistant_id' };
export const OWNER_POOLS = Object.keys(OWNER_POOL_PARAM);
export const OWNER_POOL_STAFF_TYPE = { int: 'interpreter', cs: 'cs', po: 'partner_owner', csa: 'cs_assistant' };
/* `forced` (PERM §5.7 Onboarding = Owner): a register pinned to the viewer that Clear filters and the menu never remove */
export const emptyOwnerFilters = (forced = null) => OWNER_POOLS.reduce((acc, k) => { acc[k] = new Set(forced?.[k] || []); return acc; }, {});

export const BULK_ACTIONS = [
    { kind: 'onb1',     label: 'Change Onboarding 1', field: 'Onboarding 1 owner', perm: 'worker_change_onboarding1' },
    { kind: 'onb2',     label: 'Change Onboarding 2', field: 'Onboarding 2 owner', perm: 'worker_change_onboarding2' },
    { kind: 'partner',  label: 'Change Partner',      field: 'partner agency',     perm: 'worker_change_partner' },
    /* U-0324 (21 Oct): no worker-level Change CS Owner — an excluded feature, no key; the CS association is the Job Offer's */
    { kind: 'checkout', label: 'Checkout at Branch',  field: 'check-in',           perm: 'worker_checkin_branch' },
];
export const BULK_ELIGIBILITY = {
    onb2:     { test: (r) => r.type === 'overseas' && (r.natId === fillipinoId || r.natId === indonesiaId), reason: 'only Overseas Filipino and Indonesian workers have a second onboarding owner' },
    partner:  { test: (r) => r.type === 'overseas', reason: 'only Overseas workers have a partner agency' },
    checkout: { test: (r) => Boolean(r.checkinBranchId), reason: 'only workers currently checked in can be checked out' },
};

export const PIPE_VIEWS = [
    { key: 'pipe_local', label: 'Local',                       type: 1, natIds: [] },
    { key: 'pipe_ph',    label: 'Overseas Filipino',           type: 2, natIds: [fillipinoId] },
    { key: 'pipe_id',    label: 'Overseas Indonesian',         type: 2, natIds: [indonesiaId] },
    { key: 'pipe_th',    label: 'Overseas Thai / Bangladeshi', type: 2, natIds: [thaiId, bangladeshId] },
];
export const AVAIL_VIEWS = [
    { key: 'avail_local', label: 'Local',    type: 1, natIds: [] },
    { key: 'avail_os',    label: 'Overseas', type: 2, natIds: [] },
];
/* U-0339 (10 Nov package): All / Review / Action / Not Assigned are overlapping task filters — Completed is removed
   (Review = an actual submission awaiting review; Action = explicit Action Required) */
export const PIPE_CHIPS = [
    { key: 'all',          label: 'All' },
    { key: 'review',       label: 'Review' },
    { key: 'action',       label: 'Action Required' },
    { key: 'not_assigned', label: 'Not Assigned' },
];

export const tableKeyFor = (bucket, pipeView, availView) =>
    bucket === 'pipeline' ? pipeView
        : bucket === 'available' ? availView
            : bucket;

export const tableColsFor = (tableKey, { isPartner = false } = {}) => {
    const keys = TABLE_COLS[tableKey] || TABLE_COLS.all;
    return isPartner ? keys.filter((k) => PARTNER_COLS.includes(k)) : keys;
};

/* U-0336 (21 Oct catalogue "Choose listing columns", key `worker_select_fields_to_display`): an internal viewer with the grant
   chooses among the view's permitted columns; the identity, code and status columns are always on; the choice is remembered
   per view (keys, never labels). Partner dashboards stay fixed and permission-filtered; no hidden data becomes reachable. */
export const WORKER_COLUMNS_GRANT = 'worker_select_fields_to_display';
export const WORKER_MANDATORY_COLS = Object.freeze(['worker', 'worker_code', 'status']);
export const workerColumnsStateKey = (tableKey) => `${ COLUMN_VIEW_STATE_KEYS.workers }:${ tableKey }`;
/* the keys to show: the remembered subset of the view's permitted set (mandatory always, unknown dropped, view order kept) */
export const chosenWorkerCols = (tableKey, saved) => {
    const allowed = tableColsFor(tableKey);
    if (!Array.isArray(saved)) return allowed;
    const keep = new Set([...WORKER_MANDATORY_COLS, ...saved]);
    return allowed.filter((k) => keep.has(k));
};
export const toggleWorkerCol = (tableKey, current, key) => {
    if (WORKER_MANDATORY_COLS.includes(key)) return current;
    const allowed = tableColsFor(tableKey);
    if (!allowed.includes(key)) return current;
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return allowed.filter((k) => next.has(k));
};
export const workerColumnLabels = () => Object.fromEntries(Object.entries(COLS).map(([k, c]) => [k, c.label]));

const DOC_STAGE_MAP = {
    verified: 'ok',
    in_complete: 'miss',
    in_review: 'review',
    action_required: 'action',
    uploaded: 'review',
};
const ASSIGN_STAGE_MAP = {
    verified: 'completed',
    in_complete: 'not_assigned',
    in_review: 'review',
    action_required: 'action',
    uploaded: 'review',
};
const docStage = (value) => DOC_STAGE_MAP[value] || '';
const assignStage = (value) => ASSIGN_STAGE_MAP[value] || '';

const workerTypeOf = (r) => {
    const t = r?.type ?? r?.worker_type ?? r?.worker_type_info?.id;
    if (t === 2 || t === '2' || String(t).toLowerCase() === 'overseas') return 'overseas';
    if (t === 1 || t === '1' || String(t).toLowerCase() === 'local') return 'local';
    return null;
};

export const normalizeWorkerRow = (r) => {
    const overseas = r?.worker_overseas_detail_info || {};
    const statusKey = statusKeyFor(r?.worker_status);
    const status = statusKey ? STATUS[statusKey] : null;
    return {
        id: r?.id,
        name: r?.fullname || NAME_NOT_PROVIDED,
        code: r?.reference_id || null,
        registrationType: r?.registration_type || '',
        /* backend 351: `can_resend` (1 | 0) = Partner Pending; absent on an older server → null (the 409 stays the fallback) */
        canResend: r?.can_resend == null ? null : Number(r.can_resend) === 1,
        type: workerTypeOf(r),
        natId: (typeof r?.nationality === 'object' ? r?.nationality?.id : r?.nationality) ?? r?.nationality_id ?? r?.nationality_info?.id ?? null,
        checkinBranchId: r?.checkin_branch_id ?? r?.branch_id_checkin ?? null,
        email: r?.email || '',
        country_code: r?.country_code || '',
        mobile_number: r?.mobile_number || '',
        statusKey,
        statusLabel: status ? status.label : statusNameOf(r?.worker_status),
        statusIntent: status ? status.intent : 'slate',
        statusTone: status ? status.tone : 'neutral',
        statusTreatment: status ? status.treatment || null : null,
        updated: r?.last_profile_updated_at ? timeSince(r.last_profile_updated_at) : '',
        activity: r?.last_activity_at ? timeSince(r.last_activity_at) : '',
        time_avail: sinceLabel(r?.last_available_status_updated_at),
        delay: r?.worker_delay || '',
        views: r?.worker_views_count != null ? String(r.worker_views_count) : '',
        contract_status: r?.contract_status_info?.admin_panel_status || '',
        days_remaining: r?.days_available != null ? String(r.days_available) : '',
        contract_end: fmtDate(r?.contract_end_date),
        contract_end_pipe: fmtDate(r?.contract_end_date),
        contract_date: fmtDate(r?.contract_date ?? r?.start_date),
        visa_release: fmtDate(r?.e_visa_payment_date ?? r?.visa_release_date),
        requested_start: fmtDate(r?.requested_start_date),
        start_date: fmtDate(r?.start_date),
        visa_expiry: fmtDate(r?.visa_expiry_date),
        contract_expected: fmtDate(r?.contract_end_visa_expiry_date ?? r?.contract_end_expected_date),
        overseas_exp: countriesLabel(r?.work_countries),
        duplicate_reason: r?.matched_params || '',
        partner_code: r?.pt_agency_code || overseas?.pt_agency_code || r?.partner_code || '',
        po: r?.partner_owner_name || overseas?.pt_name || '',
        onb: r?.onboarding1 || r?.onboarding1_name || '',
        int: r?.interpreter_name || '',
        cs: r?.cs_name || r?.contract_cs_name || '',
        csa: r?.cs_assistant_name || '',
        branch: r?.branch_name || overseas?.branch_display_name || '',
        jo: {
            invited: r?.invited_jobs_count ?? 0,
            applied: r?.applied_jobs_count ?? 0,
            matched: r?.matched_jobs_count ?? 0,
            upcoming: r?.upcoming_jobs_count ?? 0,
            pending: r?.pending_jobs_count ?? 0,
            completed: r?.completed_jobs_count ?? 0,
            cancelled: r?.cancelled_jobs_count ?? 0,
        },
        docs: {
            biodata: docStage(r?.biodata_status),
            photo: docStage(r?.image_status),
            ereg: docStage(overseas?.eregistration_status),
            peos: docStage(overseas?.peos_certification_status),
            tesda: docStage(overseas?.tesda_status),
            passport: docStage(overseas?.passport_status),
            passport_th: docStage(overseas?.passport_status),
            passport_icon: docStage(overseas?.passport_status),
            birth_cert: docStage(overseas?.birth_certificate_status),
            family_cert: docStage(overseas?.family_certificate_status),
            indo_id: docStage(overseas?.indonesian_id_status),
            edu_cert: docStage(overseas?.education_certificate_status),
            phone: r?.mobile_number ? 'ok' : 'miss',
            assign_partner: assignStage(overseas?.pt_assign_status),
            assign_pt: assignStage(overseas?.pt_assign_status),
            medical: assignStage(overseas?.medical_status),
            submit_docs: assignStage(overseas?.submit_document_status),
            training_cert: assignStage(overseas?.training_certificate_status),
            labour_id: assignStage(overseas?.labour_id_status),
        },
    };
};

export const DEFAULT_SORT_BY = 'fullname';

/* Priyanka 6 Nov (TAB_STATUS_MAP): the backend's pipeline key is `in_pipeline` — the UI bucket key stays `pipeline`,
   only the API calls (get-worker-statuses, get-worker-list) map it */
export const apiTabType = (bucket) => (bucket === 'pipeline' ? 'in_pipeline' : bucket);

export const buildWorkerListPayload = ({ bucket, pipeView, availView, filters, ownerFilters, sort, chip, page, limit }) => {
    const payload = {
        page,
        limit,
        search_text: filters.search || '',
        profile_status: '',
        nationality: [],
        reference_id: filters.code ? [filters.code] : [],
        sort_by: sort.key || DEFAULT_SORT_BY,
        sort_order: sort.key ? sort.dir.toUpperCase() : 'ASC',
        type: '',
    };
    if (bucket !== 'all') payload.tab_type = apiTabType(bucket);
    if (filters.status) payload.status = [filters.status];
    if (bucket === 'pipeline' || bucket === 'available') {
        const views = bucket === 'pipeline' ? PIPE_VIEWS : AVAIL_VIEWS;
        const view = views.find((v) => v.key === (bucket === 'pipeline' ? pipeView : availView));
        if (view) {
            payload.type = view.type;
            if (view.natIds.length) payload.nationality = view.natIds;
        }
    } else if (bucket === 'not_registered') {
        /* Priyanka 6 Nov: invited, not-yet-registered workers are always Overseas — the bucket has no Type
           control and a leftover filters.type is ignored */
        payload.type = 2;
    } else if (filters.type) {
        payload.type = filters.type;
    }
    if (!payload.nationality.length && filters.nats?.length && bucket !== 'pipeline') {
        payload.nationality = filters.nats.map(Number);
    }
    if (bucket === 'pipeline' && chip && chip !== 'all') payload.pipeline_stage = chip;
    OWNER_POOLS.forEach((pool) => {
        if (ownerFilters[pool]?.size) payload[OWNER_POOL_PARAM[pool]] = [...ownerFilters[pool]];
    });
    if (bucket === 'available' && availView === 'avail_local') {
        if (filters.preferred) payload.preferred_interview_locations = [Number(filters.preferred)];
        if (filters.qr) payload.branch_id_checkin = [Number(filters.qr)];
    }
    return payload;
};

export const EMPTY_FILTERS = { search: '', status: '', type: '', nats: [], code: '', preferred: '', qr: '' };
export const DEFAULT_SORT = { key: '', dir: 'asc' };

export const isNonDefaultState = ({ filters, ownerFilters, sort, isAvailLocal, forcedOwnerFilters = null, bucket = '' }) => {
    const contextual = isAvailLocal && (filters.preferred || filters.qr);
    const ownerActive = Object.keys(ownerFilters || {}).some((k) => [...(ownerFilters[k] || [])].some((id) => !forcedOwnerFilters?.[k]?.includes(id)));
    /* Not registered has no Type control — a leftover filters.type never counts as an active filter there */
    const typeActive = bucket === 'not_registered' ? false : filters.type;
    return Boolean(filters.search || filters.status || typeActive || filters.nats?.length
        || filters.code || contextual || ownerActive || sort.key);
};

export const nextSort = (prev, key) => {
    if (prev.key !== key) return { key, dir: 'asc' };
    if (prev.dir === 'asc') return { key, dir: 'desc' };
    return DEFAULT_SORT;
};
