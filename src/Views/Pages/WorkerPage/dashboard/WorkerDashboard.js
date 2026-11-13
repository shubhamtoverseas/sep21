import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    PARTNER_ACCESS_TYPE_RESTRICTED, PARTNER_RESTRICTED_ROW_CAP, WGD_SEARCH_TOO_MANY,
    WORKER_ACCESS_TYPE_KEY, WORKER_GLOBAL_LIST_KEY, WORKER_GLOBAL_FILTER_KEYS, WORKER_GLOBAL_ONBOARDING, onboardingModeOf, manualStatusTargets, wgdViewStateKeyFor,
} from "../workerModuleConstants";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import WgdIcon from "./WgdIcon";
import BucketCards from "./BucketCards";
import DashboardViewToggle from "./DashboardViewToggle";
import DashboardFilterBar from "./DashboardFilterBar";
import PipelineChips from "./PipelineChips";
import SelectionBar from "./SelectionBar";
import WorkerDashboardTable from "./WorkerDashboardTable";
import OwnerFilterMenu from "./OwnerFilterMenu";
import ConfirmModal from "../../../../components/ui/ConfirmModal";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { dispatchWithHandling } from "../../../../utils/dispatchHandler";
import { fetchWorkers, updateWorkerStatus, updateWorkerOnboarding, workerCheckoutAtBranch, fetchWorkerReferenceIdInitials } from "../../../../redux/Slices/worker/WorkerSlice";
import { fetchWorkerStatuses } from "../../../../redux/Slices/common/workerStatuses/WorkerStatusesSlice";
import { searchStaff } from "../../../../redux/Slices/common/cs/CsSlice";
import { searchStaffList } from "../../../../services/cs";
import { fetchMappingBranches } from "../../../../redux/Slices/settings/branches/BranchesSlice";
import { fetchMappingAgencies } from "../../../../redux/Slices/settings/agencies/AgenciesSlice";
import { getPermissionValue, isAdminUser, isPartnerUser, isDisabledCsOption } from "../../../../services/permissionService";
import { getCurrentUser, getWorkerPermissionAccess, getPermissionModule, findPermission } from "../../../../services/commonService";
import {
    normalizeWorkerRow, buildWorkerListPayload, tableKeyFor, tableColsFor, isNonDefaultState, nextSort, emptyOwnerFilters, statusLabelFor, apiTabType,
    WORKER_COLUMNS_GRANT, chosenWorkerCols, toggleWorkerCol, workerColumnsStateKey, workerColumnLabels,
    EMPTY_FILTERS, DEFAULT_SORT, PIPE_VIEWS, AVAIL_VIEWS, PIPE_CHIPS, PARTNER_BUCKETS, BULK_ACTIONS, OWNER_POOLS, OWNER_POOL_STAFF_TYPE, STATUS_KEY_TO_ID, TYPES, NATIONALITIES,
} from "./workerDashboardConfig";
import { getWorkerDashboardCounts, getWorkerPipelineCounts, bulkChangeWorkerPartner, resendWorkerInvitation } from "../../../../services/workers";
import { getWorkerStatuses } from "../../../../services/commonApi";
import { SEARCH_DEBOUNCE_MS, CHECKIN_COUNTRY_IDS, SEARCH_ACCESS_OFF, canCreateWorkerByLink, canResendInvitation, SEND_REG_LINK_COPY, WORKER_INVITATION_NOT_PENDING } from "../workerModuleConstants";
import { MACAU_LOCATION_ID, workerTypeList } from "../../../../components/ReusableComponents/constants";
import "./worker-dashboard.css";
import translation from "../../../../utils/translation";


const BulkActionModal = lazy(() => import("./BulkActionModal"));
const CheckInDrawer = lazy(() => import("./CheckInDrawer"));

/* D21 / U-0193: the remembered view is keyed per signed-in user; search text and row selection are never written */
const loadViewState = (key) => {
    try {
        const parsed = JSON.parse(localStorage.getItem(key));
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch { return null; }
};
const saveViewState = (key, state) => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) { void e; }
};
const restoreOwnerFilters = (saved, forced) => {
    const base = emptyOwnerFilters(forced);
    OWNER_POOLS.forEach((k) => { (saved?.[k] || []).forEach((id) => base[k].add(id)); });
    return base;
};
const serializeOwnerFilters = (owner) => OWNER_POOLS.reduce((acc, k) => { acc[k] = [...(owner[k] || [])]; return acc; }, {});
const BULK_COLUMN = { onb1: 'onboarding', onb2: 'onboarding', partner: 'partner_owner', checkout: null };
/* PERM §5.7: a global-filter toggle list — `values` are the options the grid can tick, `selected_value` the CSV of ticked ids */
const globalFilterGrant = (permissionList, key) => {
    const cat = findPermission(getPermissionModule(permissionList, 'worker') || null, key);
    const selected = String(cat?.selected_value || '').split(',').map((v) => v.trim()).filter(Boolean);
    const toggleable = Array.isArray(cat?.values) ? cat.values.map((v) => String(v?.id ?? v)) : null;
    return { selected, toggleable };
};
/* an option is hidden only when the grid can tick it and the actor has not (options the grid cannot express stay — D16) */
const isHiddenByGrant = (grant, id) => grant.toggleable != null && grant.toggleable.includes(String(id)) && !grant.selected.includes(String(id));
/* per-row results of a bulk call, when the API names them (D36) */
const namedIds = (data, keys) => keys.map((k) => data?.[k]).find(Array.isArray) || null;

const WorkerDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const { workersList, currentPage, totalPages, totalWorkers, lastUpdated, perPage, currentStatus } = useSelector((state) => ({
        workersList: state.worker.workersList,
        currentPage: state.worker.currentPage,
        totalPages: state.worker.totalPages,
        totalWorkers: state.worker.totalWorkers,
        lastUpdated: state.worker.lastUpdated,
        perPage: state.worker.perPage,
        currentStatus: state.worker.status,
    }), shallowEqual);
    const staffList = useSelector((state) => state.cs.staffList);
    const mappingBranches = useSelector((state) => state.branches.mappingBranches);
    const mappingAgencies = useSelector((state) => state.agencies.mappingAgencies);
    const workerStatuses = useSelector((state) => state.workerStatuses.workerStatuses);
    const workerRefIdInitials = useSelector((state) => state.worker.workerRefIdInitials);
    const permissionList = useSelector((state) => state.users.permissionList);
    const ownerOnboardingList = useSelector((state) => state.users.ownerOnboardingList);

    const isAdmin = useMemo(isAdminUser, []);
    const isPartner = useMemo(() => isPartnerUser(), []);
    const perm = useCallback((key) => getPermissionValue(permissionList?.data, 'worker', key), [permissionList]);
    const grants = useMemo(() => {
        const pl = permissionList?.data;
        const y = (k) => isAdmin || perm(k) === 'y';
        /* DASH.md §9 / SEARCH.md 2.1 / PERM §5.3 (X15): Search Access governs the search input and the Restricted 10-row cap —
           host `worker_access_type`, partner `partner_access_type`: '' disables search, `restricted` caps at 10, `full_access` is uncapped */
        const searchAccess = isAdmin ? null : String((isPartner ? getPermissionValue(pl, 'partner', 'partner_access_type') : perm(WORKER_ACCESS_TYPE_KEY)) || '');
        const cutByGrant = !isAdmin && !isPartner;
        return {
            /* PERM §5.6 (X16): the dashboard is the Global Screen; without `worker_global_list` a host actor reaches records only via cross-links */
            globalScreen: isAdmin || isPartner || perm(WORKER_GLOBAL_LIST_KEY) === 'y',
            searchEnabled: searchAccess === null || (searchAccess !== '' && searchAccess !== SEARCH_ACCESS_OFF),   /* backend 269: `off` = search disabled */
            searchRestricted: searchAccess === PARTNER_ACCESS_TYPE_RESTRICTED,
            /* U-0216: the dashboard's Send Registration Link creates a worker — Create Worker AND Send Link for a host */
            sendRegistration: canCreateWorkerByLink({ permissionList: pl, isAdmin, isPartner, getPermissionValue }),
            /* U-0337: Resend on a Pending row needs the current Send Link grant alone (no Create) */
            resendInvitation: canResendInvitation({ permissionList: pl, isAdmin, isPartner, getPermissionValue }),
            /* U-0336: Choose listing columns — internal viewers only; partners stay on the fixed, permission-filtered set */
            chooseColumns: !isPartner && y(WORKER_COLUMNS_GRANT),
            onb1: y('worker_change_onboarding1'),
            onb2: y('worker_change_onboarding2'),
            partner: y('worker_change_partner'),
            checkinBranchIds: isAdmin ? null : String(perm('worker_checkin_branch') || '').split(',').filter(Boolean),
            /* PERM §5.7 Worker Global Filters (X17): Type / Nationality / Profile Status options cut to the ticked values;
               Onboarding `owner` | `all` | '' (hidden). The partner grid carries none of these, so partners are not cut. */
            typeGrant: cutByGrant ? globalFilterGrant(pl, WORKER_GLOBAL_FILTER_KEYS.type) : null,
            natGrant: cutByGrant ? globalFilterGrant(pl, WORKER_GLOBAL_FILTER_KEYS.nationality) : null,
            statusGrant: cutByGrant ? globalFilterGrant(pl, WORKER_GLOBAL_FILTER_KEYS.profileStatus) : null,
            /* backend 273: the grant is a CSV of owner / all (All ⊇ Owner) — reduced to the mode the filters understand */
            onboardingMode: cutByGrant ? onboardingModeOf(perm(WORKER_GLOBAL_FILTER_KEYS.onboarding)) : WORKER_GLOBAL_ONBOARDING.ALL,
        };
    }, [isAdmin, isPartner, perm, permissionList?.data]);
    const viewer = useMemo(() => getCurrentUser()?.data, []);
    /* PERM §5.7 Onboarding = Owner: the Onboarding register is pinned to the viewer — rows where the viewer is the Onboarding owner */
    const forcedOwnerFilters = useMemo(
        () => (grants.onboardingMode === WORKER_GLOBAL_ONBOARDING.OWNER && viewer?.staff?.id != null ? { onb: [viewer.staff.id] } : null),
        [grants.onboardingMode, viewer?.staff?.id]
    );

    const viewStateKey = useMemo(() => wgdViewStateKeyFor(viewer?.id), [viewer?.id]);
    const saved = useMemo(() => loadViewState(viewStateKey), [viewStateKey]);
    const [bucket, setBucket] = useState(saved?.bucket || 'all');
    const [pipeView, setPipeView] = useState(saved?.pipeView || 'pipe_local');
    const [availView, setAvailView] = useState(saved?.availView || 'avail_local');
    /* a saved chip that left the registry (U-0339 removed Completed) falls back to All */
    const [chip, setChip] = useState(PIPE_CHIPS.some((c) => c.key === saved?.chip) ? saved.chip : 'all');
    const [filters, setFilters] = useState(saved?.filters ? { ...EMPTY_FILTERS, ...saved.filters, nats: saved.filters.nats || [], search: '' } : EMPTY_FILTERS);
    const [searchValue, setSearchValue] = useState('');
    const [sort, setSort] = useState(saved?.sort?.key ? saved.sort : DEFAULT_SORT);
    const [ownerFilters, setOwnerFilters] = useState(() => restoreOwnerFilters(saved?.ownerFilters, forcedOwnerFilters));
    const [listError, setListError] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [ownerMenu, setOwnerMenu] = useState(null);
    const [page, setPage] = useState(saved?.page > 0 ? saved.page : 1);
    const [confirmStatusId, setConfirmStatusId] = useState(null);
    const [resendRow, setResendRow] = useState(null);           /* the Pending row whose invitation is to be re-sent (U-0337) */
    const [resendBusy, setResendBusy] = useState(false);
    const [confirmStatusReason, setConfirmStatusReason] = useState('');
    const [bulk, setBulk] = useState(null);
    const [checkin, setCheckin] = useState(false);

    const searchDebounceRef = useRef(null);
    useEffect(() => () => clearTimeout(searchDebounceRef.current), []);

    const queryRef = useRef({ bucket, pipeView, availView, filters, ownerFilters, sort, chip, page });
    queryRef.current = { bucket, pipeView, availView, filters, ownerFilters, sort, chip, page };

    const runFetch = useCallback((overrides = {}) => {
        const q = { ...queryRef.current, ...overrides };
        const payload = buildWorkerListPayload({
            bucket: q.bucket,
            pipeView: q.pipeView,
            availView: q.availView,
            filters: q.filters,
            ownerFilters: q.ownerFilters,
            sort: q.sort,
            chip: q.chip,
            page: q.page,
            limit: q.limit || perPage || 10,
        });
        /* SR-06 (D40): a failed list fetch is shown as an error state, never as stale rows or an empty "no match" */
        dispatchWithHandling(dispatch, fetchWorkers(payload)).then(() => setListError(false), () => setListError(true));
    }, [dispatch, perPage]);

    /* owner header-filter pools, by register (D3 adds `csa` = CS Assistant); Onboarding comes from the shared staffList */
    const [poolStaff, setPoolStaff] = useState({});

    useEffect(() => {
        runFetch();
        if (!staffList?.length) dispatch(searchStaff({ type: 'onboarding' }));
        dispatch(fetchMappingBranches({ module_key: 'worker' }));   /* always: the shared list may be another screen's (27 Oct) */
        let alive = true;
        Object.entries(OWNER_POOL_STAFF_TYPE).forEach(([pool, type]) => {
            searchStaffList({ type })
                .then((res) => { if (alive && Array.isArray(res?.data?.data)) setPoolStaff((prev) => ({ ...prev, [pool]: res.data.data })); })
                .catch(() => { });
        });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* the forced Onboarding scope may only be known once the permission list has loaded */
    useEffect(() => {
        if (!forcedOwnerFilters) return;
        const current = queryRef.current.ownerFilters;
        const missing = Object.entries(forcedOwnerFilters).some(([pool, ids]) => ids.some((id) => !current[pool]?.has(id)));
        if (!missing) return;
        const nextOwner = restoreOwnerFilters(serializeOwnerFilters(current), forcedOwnerFilters);
        setOwnerFilters(nextOwner);
        runFetch({ ownerFilters: nextOwner });
    }, [forcedOwnerFilters, runFetch]);

    useEffect(() => {
        saveViewState(viewStateKey, { bucket, pipeView, availView, chip, filters: { ...filters, search: '' }, sort, page, ownerFilters: serializeOwnerFilters(ownerFilters) });
    }, [viewStateKey, bucket, pipeView, availView, chip, filters, sort, page, ownerFilters]);

    /* user 10 Nov (over backend 401): the initials follow the ACTIVE VIEW's worker type — a Local view fetches
       worker_type local, the Overseas views fetch overseas with their nationality scope; buckets without a view
       toggle (Not registered, All, …) stay on the Overseas scope. A Type = Local pick on those buckets still
       hides the control (DashboardFilterBar). */
    useEffect(() => {
        let natIds = [];
        let workerType = 'overseas';
        if (bucket === 'pipeline' || bucket === 'available') {
            const views = bucket === 'pipeline' ? PIPE_VIEWS : AVAIL_VIEWS;
            const view = views.find((v) => v.key === (bucket === 'pipeline' ? pipeView : availView));
            if (view?.type === 1) workerType = 'local';
            if (view) natIds = view.natIds;
        } else if (filters.nats?.length) {
            natIds = filters.nats.map(Number);
        }
        dispatch(fetchWorkerReferenceIdInitials({ worker_type: workerType, worker_nationality: natIds }));
    }, [dispatch, bucket, pipeView, availView, filters.nats]);

    const selectedIds = useMemo(() => [...selected], [selected]);

    useEffect(() => {
        if (selectedIds.length === 1) {
            dispatch(fetchWorkerStatuses({ worker_id: selectedIds[0] }));
        }
    }, [dispatch, selectedIds]);

    const [tabStatuses, setTabStatuses] = useState(null);
    useEffect(() => {
        let alive = true;
        getWorkerStatuses(bucket === 'all' ? {} : { tab_type: apiTabType(bucket) })
            .then((res) => {
                if (alive) setTabStatuses(Array.isArray(res?.data?.data) && res.data.data.length ? res.data.data : null);
            })
            .catch(() => { if (alive) setTabStatuses(null); });
        return () => { alive = false; };
    }, [bucket]);

    const [chipCounts, setChipCounts] = useState(null);
    useEffect(() => {
        if (bucket !== 'pipeline') { setChipCounts(null); return undefined; }
        let alive = true;
        const view = PIPE_VIEWS.find((v) => v.key === pipeView);
        getWorkerPipelineCounts({ type: view?.type, nationality: view?.natIds?.join(',') || '' })
            .then((res) => { if (alive) setChipCounts(res?.data?.data || null); })
            .catch(() => { if (alive) setChipCounts(null); });
        return () => { alive = false; };
    }, [bucket, pipeView]);

    const [apiBucketCounts, setApiBucketCounts] = useState(null);
    /* DASH.md §10 (D9): bucket counts load on mount and again after a status change, a bulk change, a check-out and Clear filters */
    const loadBucketCounts = useCallback(() => {
        getWorkerDashboardCounts().then((res) => {
            const d = res?.data?.data;
            if (!d) return;
            /* DASH.md §14 (D8): a count the API omits stays an em dash — it is never derived from the other buckets */
            setApiBucketCounts({
                all: d.total_workers,
                not_registered: d.not_registered_workers,
                pipeline: d.pipeline_workers,
                available: d.available_workers ?? d.avaialble_workers,
                hired: d.hired_workers,
                employed: d.employed_workers,
                not_active: d.not_active_workers,
            });
        }).catch(() => {});
    }, []);
    useEffect(() => { loadBucketCounts(); }, [loadBucketCounts]);

    const resetAll = useCallback((next = {}) => {
        /* DASH.md §10 (D22): a search still inside its debounce must not re-apply after Clear */
        clearTimeout(searchDebounceRef.current);
        const owner = emptyOwnerFilters(forcedOwnerFilters);
        setFilters(EMPTY_FILTERS);
        setSearchValue('');
        setSort(DEFAULT_SORT);
        setOwnerFilters(owner);
        setChip('all');
        setSelected(new Set());
        setPage(1);
        runFetch({ filters: EMPTY_FILTERS, ownerFilters: owner, sort: DEFAULT_SORT, chip: 'all', page: 1, ...next });
        loadBucketCounts();
    }, [runFetch, forcedOwnerFilters, loadBucketCounts]);

    const handleBucketSelect = useCallback((key) => {
        setBucket(key);
        resetAll({ bucket: key });
    }, [resetAll]);

    const handleViewSelect = useCallback((key) => {
        const next = { page: 1, sort: DEFAULT_SORT, chip: 'all' };
        if (queryRef.current.bucket === 'pipeline') { setPipeView(key); next.pipeView = key; }
        else { setAvailView(key); next.availView = key; }
        /* a view switch changes the Code Group vocabulary (local vs overseas initials) — a stale pick never
           silently filters the next view's list */
        if (queryRef.current.filters.code) {
            const nextFilters = { ...queryRef.current.filters, code: '' };
            setFilters(nextFilters);
            next.filters = nextFilters;
        }
        setChip('all');
        setSort(DEFAULT_SORT);
        setSelected(new Set());
        setPage(1);
        runFetch(next);
    }, [runFetch]);

    const handleSearchChange = useCallback((value) => {
        setSearchValue(value);
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            const nextFilters = { ...queryRef.current.filters, search: value };
            setFilters(nextFilters);
            setPage(1);
            runFetch({ filters: nextFilters, page: 1 });
        }, SEARCH_DEBOUNCE_MS);
    }, [runFetch]);

    const handleFilterChange = useCallback((key, value) => {
        const nextFilters = { ...queryRef.current.filters, [key]: value };
        /* backend 401: a Local worker can never match a Partner Code — picking Type = Local clears Code Group (its control hides) */
        if (key === 'type' && String(value) === '1' && nextFilters.code) nextFilters.code = '';
        setFilters(nextFilters);
        setPage(1);
        runFetch({ filters: nextFilters, page: 1 });
    }, [runFetch]);

    const handleChipSelect = useCallback((key) => {
        setChip(key);
        setPage(1);
        runFetch({ chip: key, page: 1 });
    }, [runFetch]);

    const handleSortChange = useCallback((key) => {
        const next = key ? { key, dir: 'asc' } : DEFAULT_SORT;
        setSort(next);
        runFetch({ sort: next });
    }, [runFetch]);

    const handleHeaderSort = useCallback((key) => {
        const next = nextSort(queryRef.current.sort, key);
        setSort(next);
        runFetch({ sort: next });
    }, [runFetch]);

    const handleClearFilters = useCallback(() => resetAll(), [resetAll]);

    const handleOwnerOpen = useCallback((pool, rect) => {
        setOwnerMenu((prev) => (prev?.pool === pool ? null : { pool, rect }));
    }, []);

    const handleOwnerToggle = useCallback((id) => {
        const pool = queryRef.current.ownerFilters;
        const menuPool = ownerMenu?.pool;
        if (!menuPool) return;
        if (forcedOwnerFilters?.[menuPool]?.includes(id)) return;
        const nextSet = new Set(pool[menuPool]);
        if (nextSet.has(id)) nextSet.delete(id); else nextSet.add(id);
        const nextOwner = { ...pool, [menuPool]: nextSet };
        setOwnerFilters(nextOwner);
        setPage(1);
        runFetch({ ownerFilters: nextOwner, page: 1 });
    }, [ownerMenu, runFetch, forcedOwnerFilters]);

    const handleOwnerClear = useCallback(() => {
        const menuPool = ownerMenu?.pool;
        if (!menuPool) return;
        const nextOwner = { ...queryRef.current.ownerFilters, [menuPool]: new Set(forcedOwnerFilters?.[menuPool] || []) };
        setOwnerFilters(nextOwner);
        setOwnerMenu(null);
        setPage(1);
        runFetch({ ownerFilters: nextOwner, page: 1 });
    }, [ownerMenu, runFetch, forcedOwnerFilters]);

    const handlePage = useCallback((dir) => {
        const next = queryRef.current.page + dir;
        setPage(next);
        runFetch({ page: next });
    }, [runFetch]);

    /* SEARCH.md 2.1.1 (D24): a Restricted actor never sees more than the cap, whatever page size the server honoured */
    const rows = useMemo(() => {
        const list = (workersList || []).map(normalizeWorkerRow);
        return grants.searchRestricted ? list.slice(0, PARTNER_RESTRICTED_ROW_CAP) : list;
    }, [workersList, grants.searchRestricted]);
    const rowById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

    const handleToggleSelectMode = useCallback(() => {
        setSelectMode((on) => {
            if (on) setSelected(new Set());
            return !on;
        });
    }, []);
    const handleToggleRow = useCallback((id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else if (rowById.has(id)) next.add(id);
            return next;
        });
    }, [rowById]);
    const handleToggleAll = useCallback(() => {
        setSelected((prev) => {
            const every = rows.length > 0 && rows.every((r) => prev.has(r.id));
            const next = new Set(prev);
            rows.forEach((r) => { if (every) next.delete(r.id); else next.add(r.id); });
            return next;
        });
    }, [rows]);
    const handleClearSelection = useCallback(() => setSelected(new Set()), []);
    const handleSelectionDone = useCallback(() => { setSelected(new Set()); setSelectMode(false); }, []);

    /* U-0325: a reason travels with every host status change (the server requires it for On Hold; the rule is the same for all three) */
    const handleConfirmStatusChange = useCallback(async () => {
        const reason = confirmStatusReason.trim();
        if (!reason) return;
        try {
            for (const workerId of selectedIds) {
                await dispatchWithHandling(dispatch, updateWorkerStatus({ worker_id: workerId, status: confirmStatusId, reason }));
            }
            ShowToast("success", t('key_worker_status_changed_successfully'));
            setConfirmStatusId(null);
            setConfirmStatusReason('');
            setSelected(new Set());
            runFetch();
            loadBucketCounts();
        } catch (err) {
            ShowToast("error", err.message);
        }
    }, [dispatch, selectedIds, confirmStatusId, confirmStatusReason, runFetch, loadBucketCounts, t]);

    /* U-0337 (21 Oct package): Resend on a Pending row — POST /worker-invitations/resend { worker_id } (backend 248); the server
       revalidates the recipient; 409 INVITATION_NOT_PENDING means the invitation moved on, so the list is re-read */
    const handleResendInvitation = useCallback(async () => {
        if (!resendRow?.id || resendBusy) return;
        setResendBusy(true);
        try {
            const res = await resendWorkerInvitation({ worker_id: resendRow.id });
            if (res?.data?.status === false) { ShowToast('error', res?.data?.message || translation('key_something_went_wrong')); return; }
            ShowToast('success', `${ SEND_REG_LINK_COPY.resentText } ${ resendRow.email || '' }`.trim());
            setResendRow(null);
        } catch (err) {
            const body = err?.response?.data;
            ShowToast('error', body?.message || translation('key_something_went_wrong'));
            if (body?.code === WORKER_INVITATION_NOT_PENDING) { setResendRow(null); runFetch(); loadBucketCounts(); }
        } finally {
            setResendBusy(false);
        }
    }, [resendRow, resendBusy, runFetch, loadBucketCounts]);

    /* X29 / U-0198: the same manual-target rule as the record header — the server list, minus Available → In Review, with
       On Hold / Suspended / Banned enabled only by the actor's role-block keys for this worker */
    const statusOptions = useMemo(() => {
        if (selectedIds.length !== 1) return [];
        const row = rowById.get(selectedIds[0]);
        const accessInfo = getWorkerPermissionAccess(ownerOnboardingList, selectedIds[0], permissionList?.data);
        return manualStatusTargets(workerStatuses, { currentStatusId: row?.statusKey ? STATUS_KEY_TO_ID[row.statusKey] : null, accessInfo, isAdmin })
            .map((s) => ({ id: s.id, name: statusLabelFor(s), enable: s.enable }));
    }, [workerStatuses, selectedIds, rowById, ownerOnboardingList, permissionList?.data, isAdmin]);

    const handleOpenWorker = useCallback((row) => {
        if (!row?.id) { ShowToast('error', translation('key_wkr_no_worker_details_record_is_delivered_for')); return; }
        navigate(`./details/${ row.id }`);
    }, [navigate]);

    const handleOpenStage = useCallback((row, action) => {
        if (action) navigate(`./details/${ row.id }?action=${ action }`);
        else navigate(`./details/${ row.id }`);
    }, [navigate]);

    const branchOptions = useMemo(
        /* settings API (backend 181, module_key=worker): each row carries `checked_in` (workers checked in right now) and `is_macau` */
        () => (mappingBranches || []).map((b) => ({ id: b.id, name: b.name || b.branch_name || '', countryId: Number(b.branch_country_code ?? b.country_id), isMacauFlag: b.is_macau == null ? null : Boolean(Number(b.is_macau)), checkinCount: b.checked_in ?? b.checkin_count ?? b.checked_in_count ?? null })),
        [mappingBranches]
    );
    /* check-in locations = the branch list (backend 2026-10-12: no separate locations API) cut to Hong Kong + Macau by
       `branch_country_code`; Macau is grouped on its own; overseas partner branches never check anyone in */
    const checkinLocations = useMemo(
        () => branchOptions.filter((b) => CHECKIN_COUNTRY_IDS.includes(b.countryId)).map((b) => ({ ...b, isMacau: b.isMacauFlag ?? (b.countryId === MACAU_LOCATION_ID) })),
        [branchOptions]
    );
    const permittedLocations = useMemo(() => {
        const ids = grants.checkinBranchIds;
        return ids ? checkinLocations.filter((l) => ids.includes(String(l.id))) : checkinLocations;
    }, [checkinLocations, grants.checkinBranchIds]);
    const toOptions = (list) => (list || []).map((s) => ({ id: s.id, name: s.name || '' }));
    /* PERM §5.7 Onboarding: `all` → the full staff dropdown, `owner` → the viewer only (the forced scope), '' → widget hidden */
    const onboardingOptions = useMemo(
        () => toOptions((staffList || []).filter((s) => !isDisabledCsOption(s, grants.onboardingMode))),
        [staffList, grants.onboardingMode]
    );
    const poolOptions = useMemo(
        () => Object.keys(OWNER_POOL_STAFF_TYPE).reduce((acc, pool) => { acc[pool] = toOptions(poolStaff[pool]); return acc; }, {}),
        [poolStaff]
    );
    const ownerMenuOptions = (ownerMenu?.pool === 'onb' ? onboardingOptions : poolOptions[ownerMenu?.pool]) || [];
    const hiddenOwnerPools = useMemo(() => (grants.onboardingMode ? [] : ['onb']), [grants.onboardingMode]);

    /* PERM §5.7 (X17): Type / Nationality options cut to the ticked values (Type CSV carries `local` / `overseas`, Nationality ids) */
    const typeOptions = useMemo(() => {
        const keyOf = (id) => workerTypeList().find((wt) => wt.id === Number(id))?.key;
        return TYPES.filter((o) => o.id === '' || !grants.typeGrant || !isHiddenByGrant(grants.typeGrant, keyOf(o.id)));
    }, [grants.typeGrant]);
    const natOptions = useMemo(
        () => NATIONALITIES.filter((n) => !grants.natGrant || !isHiddenByGrant(grants.natGrant, n.id)),
        [grants.natGrant]
    );
    const hiddenStatusIds = useMemo(
        () => (grants.statusGrant?.toggleable ? grants.statusGrant.toggleable.filter((id) => isHiddenByGrant(grants.statusGrant, id)) : null),
        [grants.statusGrant]
    );

    /* DASH.md §14 (D18): Code Group offers what the API returned — never a hard-coded list */
    const codeGroups = useMemo(() => (Array.isArray(workerRefIdInitials) ? workerRefIdInitials : []), [workerRefIdInitials]);

    const bucketCounts = useMemo(
        () => apiBucketCounts || { [bucket]: totalWorkers ?? 0 },
        [apiBucketCounts, bucket, totalWorkers]
    );

    const bulkActions = useMemo(() => BULK_ACTIONS.map((a) => ({
        kind: a.kind,
        label: a.label,
        deferred: a.perm === null,
        allowed: a.perm === null ? false
            : a.kind === 'checkout' ? permittedLocations.length > 0
                : Boolean(grants[a.kind]),
    })), [grants, permittedLocations]);
    const bulkMeta = bulk ? BULK_ACTIONS.find((a) => a.kind === bulk.kind) : null;
    const bulkRows = useMemo(() => selectedIds.map((id) => rowById.get(id)).filter(Boolean), [selectedIds, rowById]);
    const bulkOptions = useMemo(() => {
        if (!bulk) return [];
        if (bulk.kind === 'checkout') return permittedLocations;
        if (bulk.kind === 'partner') return (mappingAgencies || []).map((a) => ({
            id: `${ a.id }-${ a.branch_id }`,
            name: `${ a.code ? `${ a.code } ` : '' }${ a.agency_name || a.name || '' }${ a.branch_name ? ` · ${ a.branch_name }` : '' }`,
            agency_id: a.id, branch_id: a.branch_id,
        }));
        return onboardingOptions;
    }, [bulk, permittedLocations, mappingAgencies, onboardingOptions]);
    const handleBulkOpen = useCallback((kind) => {
        if (kind === 'partner' && !mappingAgencies?.length) dispatch(fetchMappingAgencies({ type: 'branch' }));
        setBulk({ kind });
    }, [dispatch, mappingAgencies]);
    const handleBulkApply = useCallback(async (ids, dest) => {
        const kind = bulk?.kind;
        const changed = [];
        const skipped = [];
        if (kind === 'onb1' || kind === 'onb2') {
            for (const id of ids) {
                const res = await dispatch(updateWorkerOnboarding({ type: kind === 'onb1' ? 'one' : 'two', worker_id: id, onboarding_id: Number(dest) }));
                if (res?.payload?.status) changed.push({ id });
                else skipped.push({ id: rowById.get(id)?.code || id, why: res?.payload?.message || 'not changed' });
            }
        } else if (kind === 'partner') {
            const opt = bulkOptions.find((o) => String(o.id) === String(dest));
            const res = await bulkChangeWorkerPartner({ worker_ids: ids, pt_staff_agency_id: opt?.agency_id, pt_staff_branch_id: opt?.branch_id });
            const data = res?.data?.data || {};
            (data.changed || ids).forEach((id) => changed.push({ id }));
            (data.skipped || []).forEach((s) => skipped.push({ id: s.reference_id || s.worker_id, why: s.reason || 'not changed' }));
        } else if (kind === 'checkout') {
            /* D36: per-row results when the API names them (`changed` / `checked_out` / `worker_ids` + `skipped`); otherwise the
               call succeeded for the ids it was given */
            const res = await dispatch(workerCheckoutAtBranch({ worker_ids: ids, branch_id: Number(dest) })).unwrap();
            const data = res?.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : (res || {});
            (namedIds(data, ['changed', 'checked_out', 'worker_ids']) || ids).forEach((id) => changed.push({ id }));
            (Array.isArray(data.skipped) ? data.skipped : []).forEach((s) => skipped.push({ id: s.reference_id || s.worker_id || s.id, why: s.reason || 'not changed' }));
        }
        setSelected(new Set());
        runFetch();
        loadBucketCounts();
        return { changed, skipped };
    }, [bulk, dispatch, rowById, bulkOptions, runFetch, loadBucketCounts]);

    const tableKey = tableKeyFor(bucket, pipeView, availView);
    /* U-0336: the view's remembered column subset (per view); without the grant, or for a partner, the fixed set */
    const [chosenCols, setChosenCols] = useState({});
    const colKeys = useMemo(() => {
        if (isPartner || !grants.chooseColumns) return tableColsFor(tableKey, { isPartner });
        if (chosenCols[tableKey]) return chosenCols[tableKey];
        return chosenWorkerCols(tableKey, loadViewState(workerColumnsStateKey(tableKey))?.columns);
    }, [tableKey, isPartner, grants.chooseColumns, chosenCols]);
    const handleToggleColumn = useCallback((key) => {
        const next = toggleWorkerCol(tableKey, colKeys, key);
        setChosenCols((prev) => ({ ...prev, [tableKey]: next }));
        saveViewState(workerColumnsStateKey(tableKey), { columns: next });
    }, [tableKey, colKeys]);
    const columnLabels = useMemo(() => workerColumnLabels(), []);
    const bulkFieldShown = bulkMeta ? Boolean(BULK_COLUMN[bulkMeta.kind] && colKeys.includes(BULK_COLUMN[bulkMeta.kind])) : true;
    const isAvailLocal = bucket === 'available' && availView === 'avail_local';
    const showClear = isNonDefaultState({ filters, ownerFilters, sort, isAvailLocal, forcedOwnerFilters, bucket });
    const visibleBuckets = isPartner ? PARTNER_BUCKETS : null;
    const safePage = parseInt(currentPage, 10) || 1;
    const rawTotal = parseInt(totalWorkers, 10) || 0;
    const safeTotalPages = grants.searchRestricted ? 1 : (parseInt(totalPages, 10) || 1);
    const safePerPage = parseInt(perPage, 10) || rows.length || 10;
    const total = grants.searchRestricted ? Math.min(rawTotal, PARTNER_RESTRICTED_ROW_CAP) : rawTotal;
    const footNote = grants.searchRestricted && rawTotal > PARTNER_RESTRICTED_ROW_CAP ? WGD_SEARCH_TOO_MANY : '';
    const footStart = total === 0 ? 0 : (safePage - 1) * safePerPage + 1;
    const footEnd = Math.min(total, safePage * safePerPage);

    if (!grants.globalScreen) {
        return (
            <div className="wgd">
                <div className="page">
                    <div className="phead"><div><h1>{ translation('key_workers') }</h1></div></div>
                    <div className="tablecard wgd-denied" role="status">{ translation('key_wkr_global_screen_denied') }</div>
                </div>
            </div>
        );
    }

    return (
        <div className="wgd">
            <div className="page">
                <div className="phead">
                    <div>
                        <h1>{ translation('key_workers') }</h1>
                        <div className="stats">
                            <span>{ translation('key_last_refresh') } <b>{ lastUpdated || '—' }</b></span>
                        </div>
                    </div>
                    <div className="hacts">
                        { /* U-0192 / O-09 / U-0444 (ruled 5 Nov): Check In is branch-scoped operational authority — the button is
                             gated by the worker.checkin_<branch> keys only, never by the Type / Profile Status filters, and no
                             worker-level Check In permission exists. Worker eligibility (Local + Available, country, profile,
                             document and lifecycle validation) is enforced inside the drawer's actions and server-side on every
                             scan — not here. The old filter-scoped entry stays retired. */ }
                        { permittedLocations.length > 0 && (
                            <button type="button" className="btn btn-secondary" onClick={ () => setCheckin(true) }><WgdIcon name="qr" size={ 14 } />{ translation('key_wkr_qr_check_in') }</button>
                        ) }
                        { grants.sendRegistration && (
                            <button type="button" className="btn btn-primary" onClick={ () => navigate('./send-registration-link') }><WgdIcon name="user_plus" size={ 14 } />{ t('key_send_registration_link') }</button>
                        ) }
                    </div>
                </div>

                <BucketCards activeBucket={ bucket } counts={ bucketCounts } visible={ visibleBuckets } onSelect={ handleBucketSelect } />

                <DashboardViewToggle bucket={ bucket } pipeView={ pipeView } availView={ availView } onSelect={ handleViewSelect } />

                <DashboardFilterBar
                    bucket={ bucket }
                    pipeView={ pipeView }
                    availView={ availView }
                    tabStatuses={ tabStatuses }
                    filters={ filters }
                    searchValue={ searchValue }
                    sort={ sort }
                    codeGroups={ codeGroups }
                    locations={ checkinLocations }
                    checkinFilterLocations={ permittedLocations }
                    typeOptions={ typeOptions }
                    natOptions={ natOptions }
                    hiddenStatusIds={ hiddenStatusIds }
                    searchEnabled={ grants.searchEnabled }
                    showClear={ showClear }
                    isPartner={ isPartner }
                    columnKeys={ colKeys }
                    columnOrder={ tableColsFor(tableKey) }
                    columnLabels={ columnLabels }
                    showColumns={ grants.chooseColumns }
                    onToggleColumn={ handleToggleColumn }
                    onSearchChange={ handleSearchChange }
                    onFilterChange={ handleFilterChange }
                    onSortChange={ handleSortChange }
                    onClear={ handleClearFilters }
                />

                <PipelineChips bucket={ bucket } activeChip={ chip } counts={ chipCounts } onSelect={ handleChipSelect } />

                { selectMode && (
                    <SelectionBar
                        count={ selected.size }
                        actions={ bulkActions }
                        canChangeStatus={ selected.size === 1 }
                        statusOptions={ statusOptions }
                        onPickStatus={ (id) => setConfirmStatusId(id) }
                        onAction={ handleBulkOpen }
                        onClear={ handleClearSelection }
                        onDone={ handleSelectionDone }
                    />
                ) }

                <WorkerDashboardTable
                    colKeys={ colKeys }
                    rows={ rows }
                    loading={ currentStatus === 'loading' }
                    error={ listError }
                    onRetry={ runFetch }
                    sort={ sort }
                    ownerFilters={ ownerFilters }
                    hiddenOwnerPools={ hiddenOwnerPools }
                    selected={ selected }
                    selectMode={ selectMode }
                    canSelect={ !isPartner }
                    footStart={ footStart }
                    footEnd={ footEnd }
                    footTotal={ total }
                    footNote={ footNote }
                    page={ safePage }
                    totalPages={ safeTotalPages }
                    showLegend={ isAvailLocal }
                    onSort={ handleHeaderSort }
                    onOwnerOpen={ handleOwnerOpen }
                    onToggleRow={ handleToggleRow }
                    onToggleAll={ handleToggleAll }
                    onToggleSelectMode={ handleToggleSelectMode }
                    onOpenWorker={ handleOpenWorker }
                    onOpenStage={ handleOpenStage }
                    onResend={ grants.resendInvitation ? setResendRow : undefined }
                    onPage={ handlePage }
                />

                { resendRow && (
                    <ConfirmModal
                        title={ SEND_REG_LINK_COPY.resend }
                        body={ `${ SEND_REG_LINK_COPY.resend } — ${ resendRow.name }${ resendRow.email ? ` (${ resendRow.email })` : '' }?` }
                        confirmLabel={ SEND_REG_LINK_COPY.resend }
                        busy={ resendBusy }
                        onConfirm={ handleResendInvitation }
                        onClose={ () => { if (!resendBusy) setResendRow(null); } }
                    />
                ) }

                { ownerMenu && (
                    <OwnerFilterMenu
                        anchorRect={ ownerMenu.rect }
                        options={ ownerMenuOptions }
                        selected={ ownerFilters[ownerMenu.pool] || new Set() }
                        locked={ forcedOwnerFilters?.[ownerMenu.pool] }
                        onToggle={ handleOwnerToggle }
                        onClear={ handleOwnerClear }
                        onClose={ () => setOwnerMenu(null) }
                    />
                ) }

                { confirmStatusId != null && (
                    <ConfirmModal
                        title={ t('key_confirm_status_change') }
                        body={ (
                            <>
                                { `${ t('key_are_you_sure_you_want_to_change_the_status').replace(/[.?]+$/, '') }?` }
                                <label className="wkd-status-reason">
                                    <span>{ t('key_reason') }</span>
                                    <textarea rows={ 3 } value={ confirmStatusReason } maxLength={ 500 } required aria-required onChange={ (e) => setConfirmStatusReason(e.target.value) } />
                                </label>
                            </>
                        ) }
                        confirmLabel={ t('key_yes') }
                        cancelLabel={ t('key_no') }
                        onConfirm={ handleConfirmStatusChange }
                        onClose={ () => { setConfirmStatusId(null); setConfirmStatusReason(''); } }
                    />
                ) }
                <Suspense fallback={ null }>
                    { bulk && bulkMeta && (
                        <BulkActionModal
                            action={ bulkMeta }
                            rows={ bulkRows }
                            options={ bulkOptions }
                            fieldShown={ bulkFieldShown }
                            onApply={ handleBulkApply }
                            onClose={ () => setBulk(null) }
                        />
                    ) }
                    { checkin && (
                        <CheckInDrawer
                            locations={ permittedLocations }
                            onClose={ () => setCheckin(false) }
                            onChanged={ () => { runFetch(); loadBucketCounts(); } }
                        />
                    ) }
                </Suspense>
            </div>
        </div>
    );
};

export default WorkerDashboard;
