import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { Link, useSearchParams } from "react-router-dom";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import BulkOwnershipModal from "../../../../components/Layout/popups/bulk-ownership/BulkOwnershipModal";
const ManageOwnersDrawer = lazy(() => import("../details/ManageOwnersDrawer"));
import { getContractDashboardListAPI } from "../../../../services/contracts";
import { fetchContractCategory } from "../../../../redux/Slices/contract/ContractSlice";
import { fetchWorkerNationalities } from "../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import {
    getCurrentUser, getPermissionValue, isAdminUser, loadSessionViewState, loadViewState, saveSessionViewState, saveViewState,
} from "../../../../services/commonService";
import translation from "../../../../utils/translation";
import routes from "../../routes/routesConfig";
import StatusCards from "./StatusCards";
import DashboardFilterBar, { BRANCH_MODE } from "./DashboardFilterBar";
import DashboardTable from "./DashboardTable";
import SelectionBar from "./SelectionBar";
import { ColumnSortMenu, ColumnsMenu, OwnerFilterMenu, StageSortMenu } from "./DashboardMenus";
import { EM_DASH, buildColumns, clockNow, csvIds, isHideable, isYes, ownerOptionsFrom, reconcileSort, sortParams } from "./contractDashboardUtils";
import {
    CD_COL_KIND, CD_CS_FILTER_SCOPE, CD_DEFAULT_GROUP, CD_DEFAULT_HIDDEN_COLS, CD_DEFAULT_PAGE_SIZE, CD_DEFAULT_SORT, CD_DEFAULT_STAGE_ORDER, CD_ITB_NATIONALITY_IDS, CD_NATIONALITY_FILTER_GROUPS, CD_OWNER_API_PARAMS, CD_OWNER_ROW_KEYS, CD_OWNER_UNASSIGNED,
    CD_DEFAULT_STATUS, CD_GROUPS, CD_OWNER_REGISTER, CD_PAGE_SIZES, CD_PERMISSION, CD_SEARCH_ACCESS, CD_PREFS_KEY, CD_QUERY, CD_RETURN_STATE_KEY,
    CD_SEARCH_DEBOUNCE_MS, CD_SORT_DIR, CD_SORT_MODE, CD_STATUS, CD_STATUS_ID, CD_STATUS_KEYS, CD_TOAST_MS, CD_VIEW,
} from "../contractConstants";
import "./ContractsDashboard.css";

const PaosRoster = lazy(() => import("./PaosRoster"));

const EMPTY_FILTERS = Object.freeze({ contract_category: "", nationality: "", code_group: "" });
const REGISTERS = Object.values(CD_OWNER_REGISTER);
const EMPTY_OWNERS = Object.freeze(Object.fromEntries(REGISTERS.map((r) => [r, []])));
const MENU = Object.freeze({ COLUMNS: "cols", SORT: "hsort|", OWNER: "owner|" });
const strings = (list) => (Array.isArray(list) ? list.map(String) : []);

/* the state a visit starts from: the URL card, else the session return context, else per-user preferences, else defaults */
const readInitialState = (statusParam, saved, prefs) => {
    const s = saved || {};
    const sort = s.sort?.col ? s.sort : (prefs?.sort?.col ? prefs.sort : CD_DEFAULT_SORT);
    /* U-0445: Prepared / Ready owner columns are not in the default set (OLD-CMATRIX names only CS Owner / CS Assistant /
       Worker Name / Worker Code) — they stay available in the column picker. The pref field is versioned (`hidden_v2`)
       so the new default reaches users whose stored `hidden: []` was only the old default, never a choice. */
    const hiddenKeys = Array.isArray(s.hidden) ? s.hidden : (Array.isArray(prefs?.hidden_v2) ? prefs.hidden_v2 : CD_DEFAULT_HIDDEN_COLS);
    const hidden = {};
    hiddenKeys.forEach((key) => { if (isHideable(key)) hidden[key] = true; });
    return {
        status: CD_STATUS_KEYS.includes(statusParam) ? statusParam : (CD_STATUS_KEYS.includes(s.status) ? s.status : CD_DEFAULT_STATUS),
        group: CD_GROUPS.includes(Number(s.group)) ? Number(s.group) : CD_DEFAULT_GROUP,
        search: typeof s.search === "string" ? s.search : "",
        filters: {
            contract_category: String(s.filters?.contract_category || ""),
            nationality: String(s.filters?.nationality || ""),
            code_group: String(s.filters?.code_group || ""),
        },
        branch: strings(s.branch),
        owners: Object.fromEntries(REGISTERS.map((r) => [r, strings(s.owners?.[r])])),
        sort,
        hidden,
        page: Number(s.page) > 0 ? Number(s.page) : 1,
        limit: CD_PAGE_SIZES.includes(Number(s.limit)) ? Number(s.limit) : CD_DEFAULT_PAGE_SIZE,
        scrollX: Number(s.scrollX) || 0,
        restored: Boolean(saved),
    };
};

/**
 * /contracts — the Contracts dashboard (prototype Contracts_Dashboard.html, CT-01): header · four status cards ·
 * View (Group 1–4) · filter card · selection bar · listing · footer, plus the PAOS roster (CT-06) in place of the
 * listing. Data: POST /contract/global/dashboard-list. The selected card lives in `?status=`; filters, sort, page
 * and scroll survive a round trip to the record (session); sort and hidden columns persist per user.
 */
const ContractsDashboard = ({ onOpenContract, mappingBranches, workerRefIdInitials }) => {
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();
    const { contractCategoryLists, workerNationalities, permissionList } = useSelector((state) => ({
        contractCategoryLists: state.contracts.contractCategoryLists,
        /* the group-scoped fetch stores HERE (nationalitiesExtraReducer: type worker + group), not in workerNationalities —
           the old read only ever showed options another page's group-less fetch had left behind */
        workerNationalities: state.nationalities.workerNationalitiesGroupWise,
        permissionList: state.users.permissionList,
    }), shallowEqual);
    const perms = permissionList?.data;
    const isAdmin = isAdminUser();
    /* backend 269: Search access `off` hides the search box; records otherwise accessible stay listed */
    const searchEnabled = isAdmin || String(getPermissionValue(perms, CD_PERMISSION.ACCESS_MODULE, CD_SEARCH_ACCESS.KEY) || "") !== CD_SEARCH_ACCESS.OFF;
    const me = getCurrentUser()?.data;
    const myStaffId = Number(me?.staff?.id) || null;
    const prefsKey = `${ CD_PREFS_KEY }:${ me?.id ?? myStaffId ?? "anon" }`;

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const initial = useMemo(() => readInitialState(searchParams.get(CD_QUERY.STATUS), loadSessionViewState(CD_RETURN_STATE_KEY), loadViewState(prefsKey)), []);
    const [view, setView] = useState(CD_VIEW.LIST);
    const [status, setStatus] = useState(initial.status);
    const [group, setGroup] = useState(initial.group);
    const [search, setSearch] = useState(initial.search);
    const [filters, setFilters] = useState(initial.filters);
    const [branch, setBranch] = useState(initial.branch);
    const [owners, setOwners] = useState(initial.owners);
    const [sort, setSort] = useState(initial.sort);
    const [hidden, setHidden] = useState(initial.hidden);
    const [page, setPage] = useState(initial.page);
    const [limit, setLimit] = useState(initial.limit);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [stageOrder, setStageOrder] = useState(CD_DEFAULT_STAGE_ORDER);
    const [cards, setCards] = useState(null);
    const [facets, setFacets] = useState({});
    const [capped, setCapped] = useState(false);
    const [overflow, setOverflow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [lastRefresh, setLastRefresh] = useState("");
    const [menu, setMenu] = useState(null);           /* { id, anchor } */
    const [selecting, setSelecting] = useState(false);
    const [picked, setPicked] = useState([]);
    const [bulk, setBulk] = useState(null);           /* register of the open ownership run */
    const [ownerRow, setOwnerRow] = useState(null);   /* the row whose Manage owners dialog is open */
    const [toast, setToast] = useState("");
    const [reloadTick, setReloadTick] = useState(0);
    const [loadSeq, setLoadSeq] = useState(0);     /* bumps on every successful load */
    const reqId = useRef(0);
    const scrollRef = useRef(null);
    const scrollRestored = useRef(false);
    const restoreToastPending = useRef(initial.restored);
    /* the load sequence after which the owner selections are re-validated (a restore, a Group or a Branch change); null = nothing pending */
    const normalizeOwnersAfter = useRef(initial.restored ? 0 : null);
    const loadSeqRef = useRef(0);
    loadSeqRef.current = loadSeq;

    /* ---- permissions (Settings grid) ---- */
    const access = useMemo(() => {
        /* K-21: one scope — contract_global_cs / contract_global_branch (the processing_global_* keys were merged server-side) */
        const csScopeTokens = String(getPermissionValue(perms, CD_PERMISSION.CONTRACT_MODULE, CD_PERMISSION.CONTRACT_CS_FILTER) || "").split(",").map((v) => v.trim());
        const bulkOwners = isYes(getPermissionValue(perms, CD_PERMISSION.PROCESSING_MODULE, CD_PERMISSION.BULK_OWNERS));
        /* CPERM §6: a register run needs the bulk key plus that register's own key; the owner key is per owner / non-owner
           context, so the dashboard (no record context) offers the run when either context grants it */
        const changeOwner = isYes(getPermissionValue(perms, CD_PERMISSION.OWNER_MODULE, CD_PERMISSION.OWNER_CHANGE_OWNER))
            || isYes(getPermissionValue(perms, CD_PERMISSION.NON_OWNER_MODULE, CD_PERMISSION.NON_OWNER_CHANGE_OWNER));
        const registers = {
            [CD_OWNER_REGISTER.CS_OWNER]: bulkOwners && changeOwner,
            [CD_OWNER_REGISTER.CS_ASSISTANT]: bulkOwners && isYes(getPermissionValue(perms, CD_PERMISSION.PROCESSING_MODULE, CD_PERMISSION.CHANGE_ASSISTANT)),
            /* Prepared / Ready: the one grant (admin always), plus the bulk key for a run */
            [CD_OWNER_REGISTER.PREPARED]: bulkOwners && (isAdmin || isYes(getPermissionValue(perms, CD_PERMISSION.PROCESSING_MODULE, CD_PERMISSION.CHANGE_PREP_READY))),
            [CD_OWNER_REGISTER.READY]: bulkOwners && (isAdmin || isYes(getPermissionValue(perms, CD_PERMISSION.PROCESSING_MODULE, CD_PERMISSION.CHANGE_PREP_READY))),
        };
        return {
            master: isYes(getPermissionValue(perms, CD_PERMISSION.ACCESS_MODULE, CD_PERMISSION.MASTER_ACCESS)),
            /* backend 273: the grant is a CSV of owner / all — All ⊇ Owner */
            csFilterVisible: isAdmin || csScopeTokens.includes(CD_CS_FILTER_SCOPE.OWNER) || csScopeTokens.includes(CD_CS_FILTER_SCOPE.ALL),
            csAll: isAdmin || csScopeTokens.includes(CD_CS_FILTER_SCOPE.ALL),
            branchIds: isAdmin ? null : new Set(csvIds(getPermissionValue(perms, CD_PERMISSION.CONTRACT_MODULE, CD_PERMISSION.CONTRACT_BRANCH_FILTER))),
            registers,
            manageAvailable: bulkOwners && Object.values(registers).some(Boolean),
            /* single-record Manage owners from a row's owner cell (no bulk key needed): the register's own grant */
            single: {
                owner: changeOwner,
                assistant: isYes(getPermissionValue(perms, CD_PERMISSION.PROCESSING_MODULE, CD_PERMISSION.CHANGE_ASSISTANT)),
                prepReady: isAdmin || isYes(getPermissionValue(perms, CD_PERMISSION.PROCESSING_MODULE, CD_PERMISSION.CHANGE_PREP_READY)),
            },
            ownerDetails: isYes(getPermissionValue(perms, CD_PERMISSION.OWNER_MODULE, CD_PERMISSION.OWNER_DETAILS)),
            nonOwnerDetails: isYes(getPermissionValue(perms, CD_PERMISSION.NON_OWNER_MODULE, CD_PERMISSION.NON_OWNER_DETAILS)),
            // @migration-unspecified(contract): the complete-portfolio scope is management-only; no management flag exists, so admins only.
            canPortfolio: isAdmin,
            newContractInvoice: isAdmin || isYes(getPermissionValue(perms, CD_PERMISSION.CONTRACT_MODULE, CD_PERMISSION.NEW_CONTRACT_INVOICE)),
        };
    }, [perms, isAdmin]);

    /* ---- option lists (Group-scoped category + nationality; permitted branches) ---- */
    /* ClickUp 14ykpqtz7y7 (Shubham, 7 Nov): the Nationality filter exists on Groups 1 & 3 only, and offers ITB alone */
    const nationalityEnabled = CD_NATIONALITY_FILTER_GROUPS.includes(group);
    useEffect(() => {
        dispatch(fetchContractCategory({ group }));
        if (CD_NATIONALITY_FILTER_GROUPS.includes(group)) dispatch(fetchWorkerNationalities({ type: "worker", group }));
    }, [dispatch, group]);
    const categoryOptions = useMemo(() => (contractCategoryLists || []).map((o) => ({ value: String(o.id), label: o.name_en || o.name || "" })), [contractCategoryLists]);
    const nationalityOptions = useMemo(() => (workerNationalities || [])
        .map((o) => ({ value: String(o.id), label: o.name || o.name_en || "" }))
        .filter((o) => CD_ITB_NATIONALITY_IDS.includes(o.value)), [workerNationalities]);
    const codeOptions = useMemo(() => (workerRefIdInitials || []).map((x) => (typeof x === "string"
        ? { value: x, label: x }
        : { value: String(x.initial || x.reference_id_initial || x.id), label: String(x.initial || x.reference_id_initial || x.name || x.id) })), [workerRefIdInitials]);
    const branchControl = useMemo(() => {
        const all = (mappingBranches || []).map((b) => ({ value: String(b.id), label: b.branch_display_name || b.branch_display_name_en || b.name || "" }));
        if (!access.branchIds) return { mode: BRANCH_MODE.MENU, options: all, selected: branch };
        const options = all.filter((o) => access.branchIds.has(Number(o.value)));
        if (!options.length) return { mode: BRANCH_MODE.HIDDEN, options: [], selected: [] };
        if (options.length === 1) return { mode: BRANCH_MODE.FIXED, options, selected: [options[0].value], fixedLabel: options[0].label };
        return { mode: BRANCH_MODE.MENU, options, selected: branch };
    }, [mappingBranches, access.branchIds, branch]);

    const showToast = useCallback((message) => setToast(message), []);
    useEffect(() => {
        if (!toast) return undefined;
        const timer = setTimeout(() => setToast(""), CD_TOAST_MS);
        return () => clearTimeout(timer);
    }, [toast]);
    const noteDroppedSaved = useCallback(() => {
        if (!restoreToastPending.current) return;
        restoreToastPending.current = false;
        showToast(translation("key_cd_saved_filters_unavailable"));
    }, [showToast]);

    /* a selection the current Group / exposure no longer offers is dropped (silently after a Group change, with one message after a restore) */
    useEffect(() => {
        if (!categoryOptions.length || !filters.contract_category || categoryOptions.some((o) => o.value === filters.contract_category)) return;
        setFilters((f) => ({ ...f, contract_category: "" })); noteDroppedSaved();
    }, [categoryOptions, filters.contract_category, noteDroppedSaved]);
    useEffect(() => {
        if (!filters.nationality) return;
        /* Groups 2 & 4 have no Nationality filter: a carried selection is dropped silently (by design, not "unavailable") */
        if (!nationalityEnabled) { setFilters((f) => ({ ...f, nationality: "" })); return; }
        if (!nationalityOptions.length || nationalityOptions.some((o) => o.value === filters.nationality)) return;
        setFilters((f) => ({ ...f, nationality: "" })); noteDroppedSaved();
    }, [nationalityEnabled, nationalityOptions, filters.nationality, noteDroppedSaved]);
    useEffect(() => {
        if (branchControl.mode !== BRANCH_MODE.MENU || !branchControl.options.length || !branch.length) return;
        const keep = branch.filter((id) => branchControl.options.some((o) => o.value === id));
        if (keep.length !== branch.length) { setBranch(keep); noteDroppedSaved(); }
    }, [branchControl, branch, noteDroppedSaved]);

    /* ---- columns and sort ---- */
    const allColumns = useMemo(() => buildColumns(status, group, stageOrder), [status, group, stageOrder]);
    const columns = useMemo(() => allColumns.filter((c) => !hidden[c.key]), [allColumns, hidden]);
    useEffect(() => { setSort((s) => reconcileSort(s, allColumns, group)); }, [allColumns, group]);

    /* ---- the request ---- */
    const effectiveBranchIds = useMemo(() => (branchControl.mode === BRANCH_MODE.HIDDEN ? [] : branchControl.selected), [branchControl]);
    const body = useMemo(() => {
        const request = {
            status: [CD_STATUS_ID[status]], group, search_text: search.trim(),
            contract_category: filters.contract_category ? [filters.contract_category] : [],
            nationality: filters.nationality ? [filters.nationality] : [],
            code_group: filters.code_group ? [filters.code_group] : [],
            branch_id: effectiveBranchIds,
            ...sortParams(sort), page, limit,
        };
        REGISTERS.forEach((register) => {
            const selected = owners[register]; if (!selected.length) return;
            const param = CD_OWNER_API_PARAMS[register];
            const ids = selected.filter((v) => v !== CD_OWNER_UNASSIGNED).map(Number).filter(Boolean);
            const unassigned = selected.includes(CD_OWNER_UNASSIGNED);
            if (param.unassignedValue) { const list = unassigned ? [...ids, param.unassignedValue] : ids; if (list.length) request[param.ids] = list; }
            else { if (ids.length) request[param.ids] = ids; if (unassigned && param.unassigned) request[param.unassigned] = true; }
        });
        return request;
    }, [status, group, search, filters, effectiveBranchIds, sort, page, limit, owners]);

    const load = useCallback(async (request) => {
        const id = ++reqId.current;
        setLoading(true); setError(false);
        try {
            const res = await getContractDashboardListAPI(request);
            if (id !== reqId.current) return;
            /* backend 269: a search refused for Search access = off is "no search" — drop the text and list without it */
            if (res?.data?.code === CD_SEARCH_ACCESS.REFUSAL_CODE && request.search_text) { setSearch(""); return; }
            const d = res?.data?.status ? res.data.data : null;
            if (!d) throw new Error(res?.data?.message || "");
            setRows(Array.isArray(d.data) ? d.data : []);
            setTotal(Number(d.total) || 0);
            if (d.stage_order) setStageOrder(d.stage_order);
            if (Array.isArray(d.cards)) setCards(d.cards);
            setFacets({
                owner_options: d.owner_options, assistant_options: d.assistant_options, has_unassigned_assistant: d.has_unassigned_assistant,
                /* N-16: the Prepared / Ready facets over the accessible matching population */
                prepared_owner_options: d.prepared_owner_options, ready_owner_options: d.ready_owner_options, has_unassigned_prepared: d.has_unassigned_prepared, has_unassigned_ready: d.has_unassigned_ready,
            });
            setCapped(Boolean(d.capped)); setOverflow(Boolean(d.overflow));
            setLastRefresh(clockNow());
            setLoadSeq((n) => n + 1);
        } catch {
            if (id === reqId.current) { setRows([]); setTotal(0); setError(true); }
        } finally {
            if (id === reqId.current) setLoading(false);
        }
    }, []);
    useEffect(() => {
        if (!access.master || view !== CD_VIEW.LIST) return undefined;
        const timer = setTimeout(() => load(body), CD_SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [body, load, access.master, view, reloadTick]);

    /* ---- owner facets (server options when given, else the loaded rows) + their normalisation ---- */
    const ownerOptions = useMemo(() => {
        const list = ownerOptionsFrom(facets.owner_options, rows, "cs_owner_id", "cs_owner_name");
        return access.csAll || !myStaffId ? list : list.filter((o) => o.id === myStaffId);
    }, [facets.owner_options, rows, access.csAll, myStaffId]);
    const assistantOptions = useMemo(() => ownerOptionsFrom(facets.assistant_options, rows, "cs_assistant_id", "cs_assistant_name"), [facets.assistant_options, rows]);
    const hasUnassigned = typeof facets.has_unassigned_assistant === "boolean" ? facets.has_unassigned_assistant : rows.some((r) => !r.cs_assistant_id);
    /* Prepared / Ready: the list response's facets (N-16); the loaded rows until a response carries them */
    const preparedOptions = useMemo(() => ownerOptionsFrom(facets.prepared_owner_options, rows, ...CD_OWNER_ROW_KEYS[CD_OWNER_REGISTER.PREPARED]), [facets.prepared_owner_options, rows]);
    const readyOptions = useMemo(() => ownerOptionsFrom(facets.ready_owner_options, rows, ...CD_OWNER_ROW_KEYS[CD_OWNER_REGISTER.READY]), [facets.ready_owner_options, rows]);
    const optionsByRegister = useMemo(() => ({
        [CD_OWNER_REGISTER.CS_OWNER]: ownerOptions, [CD_OWNER_REGISTER.CS_ASSISTANT]: assistantOptions, [CD_OWNER_REGISTER.PREPARED]: preparedOptions, [CD_OWNER_REGISTER.READY]: readyOptions,
    }), [ownerOptions, assistantOptions, preparedOptions, readyOptions]);
    const unassignedByRegister = useMemo(() => ({
        [CD_OWNER_REGISTER.CS_OWNER]: false, [CD_OWNER_REGISTER.CS_ASSISTANT]: hasUnassigned,
        [CD_OWNER_REGISTER.PREPARED]: typeof facets.has_unassigned_prepared === "boolean" ? facets.has_unassigned_prepared : rows.some((r) => !r.prepared_owner_id),
        [CD_OWNER_REGISTER.READY]: typeof facets.has_unassigned_ready === "boolean" ? facets.has_unassigned_ready : rows.some((r) => !r.ready_owner_id),
    }), [hasUnassigned, rows, facets.has_unassigned_prepared, facets.has_unassigned_ready]);
    useEffect(() => {
        if (normalizeOwnersAfter.current === null || loadSeq <= normalizeOwnersAfter.current) return;
        normalizeOwnersAfter.current = null;
        const next = {}; let changed = false;
        REGISTERS.forEach((register) => {
            const ids = new Set(optionsByRegister[register].map((o) => String(o.id)));
            next[register] = owners[register].filter((id) => (id === CD_OWNER_UNASSIGNED ? unassignedByRegister[register] : ids.has(id)));
            if (next[register].length !== owners[register].length) changed = true;
        });
        if (!changed) return;
        setOwners(next);
        const branchNames = branchControl.options.filter((o) => effectiveBranchIds.includes(o.value)).map((o) => o.label).join(", ");
        showToast(`${ translation("key_cd_unavailable_cs_owners_cleared") } ${ branchNames || translation("key_cd_hong_kong_branches") }.`);
    }, [loadSeq, optionsByRegister, unassignedByRegister, owners, branchControl.options, effectiveBranchIds, showToast]);

    /* ---- URL ↔ card, return context, preferences, scroll ---- */
    useEffect(() => {
        if (searchParams.get(CD_QUERY.STATUS) === status) return;
        const next = new URLSearchParams(searchParams);
        next.set(CD_QUERY.STATUS, status);
        setSearchParams(next, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);
    useEffect(() => {
        const param = searchParams.get(CD_QUERY.STATUS);
        if (CD_STATUS_KEYS.includes(param) && param !== status) { setStatus(param); setPage(1); setPicked([]); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);
    const snapshot = useCallback(() => ({
        status, group, search, filters, branch, owners, sort, hidden: Object.keys(hidden).filter((k) => hidden[k]), page, limit,
        scrollX: scrollRef.current?.scrollLeft || 0,
    }), [status, group, search, filters, branch, owners, sort, hidden, page, limit]);
    useEffect(() => { saveSessionViewState(CD_RETURN_STATE_KEY, snapshot()); }, [snapshot]);
    useEffect(() => { saveViewState(prefsKey, { sort, hidden_v2: Object.keys(hidden).filter((k) => hidden[k]) }); }, [sort, hidden, prefsKey]);
    useEffect(() => {
        if (scrollRestored.current || !rows.length || !scrollRef.current) return;
        scrollRestored.current = true;
        scrollRef.current.scrollLeft = initial.scrollX;
    }, [rows.length, initial.scrollX]);

    /* ---- handlers ---- */
    const pickStatus = useCallback((key) => {
        setView(CD_VIEW.LIST);
        if (key === status) return;
        setStatus(key); setPage(1); setPicked([]);
    }, [status]);
    const pickGroup = useCallback((g) => {
        if (g === group) return;
        setGroup(g); setPage(1); setPicked([]);
        /* cleared in the same batch so no request carries a nationality into a Group that has no such filter */
        if (!CD_NATIONALITY_FILTER_GROUPS.includes(g)) setFilters((f) => (f.nationality ? { ...f, nationality: "" } : f));
        normalizeOwnersAfter.current = loadSeqRef.current;
    }, [group]);
    const setFilter = useCallback((key, value) => { setFilters((f) => ({ ...f, [key]: String(value ?? "") })); setPage(1); }, []);
    const pickBranch = useCallback((values) => { setBranch(strings(values)); setPage(1); normalizeOwnersAfter.current = loadSeqRef.current; }, []);
    const clearFilters = useCallback(() => {
        setSearch(""); setFilters(EMPTY_FILTERS); setBranch([]); setOwners(EMPTY_OWNERS); setPage(1); setMenu(null);
    }, []);
    const closeMenu = useCallback(() => setMenu(null), []);
    const openMenu = useCallback((id, anchor) => setMenu((m) => (m?.id === id ? null : { id, anchor })), []);
    const sortCycle = useCallback((key) => {
        setSort((s) => {
            const current = s.col === key && s.mode === CD_SORT_MODE.DIR ? s.dir : null;
            if (current === null) return { col: key, mode: CD_SORT_MODE.DIR, dir: CD_SORT_DIR.ASC };
            if (current === CD_SORT_DIR.ASC) return { col: key, mode: CD_SORT_MODE.DIR, dir: CD_SORT_DIR.DESC };
            return CD_DEFAULT_SORT;
        });
        setPage(1); setMenu(null);
    }, []);
    const sortPick = useCallback((next) => { setSort(next || CD_DEFAULT_SORT); setPage(1); setMenu(null); }, []);
    const toggleColumn = useCallback((key) => {
        const willHide = !hidden[key];
        setHidden((h) => { const next = { ...h }; if (next[key]) delete next[key]; else next[key] = true; return next; });
        if (willHide && sort.col === key) setSort(CD_DEFAULT_SORT);   /* a hidden column cannot stay the sort column */
    }, [hidden, sort.col]);
    const resetColumns = useCallback(() => setHidden({}), []);
    const toggleOwner = useCallback((register, id) => {
        setOwners((o) => ({ ...o, [register]: o[register].includes(id) ? o[register].filter((x) => x !== id) : [...o[register], id] }));
        setPage(1);
    }, []);
    const clearOwner = useCallback((register) => { setOwners((o) => ({ ...o, [register]: [] })); setPage(1); }, []);

    const toggleSelecting = useCallback(() => { setSelecting((v) => !v); setPicked([]); }, []);
    const togglePick = useCallback((id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])), []);
    const toggleAll = useCallback(() => setPicked((p) => (rows.length && rows.every((r) => p.includes(r.id)) ? [] : rows.map((r) => r.id))), [rows]);
    const selectAllVisible = useCallback(() => setPicked(rows.map((r) => r.id)), [rows]);
    const canOpenRow = useCallback((row) => {
        if (typeof row.can_open === "boolean") return row.can_open;
        return myStaffId && Number(row.cs_owner_id) === myStaffId ? access.ownerDetails : access.nonOwnerDetails;
    }, [myStaffId, access.ownerDetails, access.nonOwnerDetails]);
    const openRow = useCallback((row) => {
        saveSessionViewState(CD_RETURN_STATE_KEY, snapshot());
        onOpenContract(row.id);
    }, [snapshot, onOpenContract]);
    const openDenied = useCallback(() => showToast(translation("key_cd_cannot_open_details")), [showToast]);
    const reload = useCallback(() => setReloadTick((n) => n + 1), []);
    const bulkDone = useCallback(() => { setBulk(null); setSelecting(false); setPicked([]); reload(); }, [reload]);

    const ownerCounts = Object.fromEntries(REGISTERS.map((r) => [r, owners[r].length]));
    const blockedFilters = Object.keys(ownerCounts).filter((register) => ownerCounts[register] > 0);

    const renderMenu = () => {
        if (!menu) return null;
        if (menu.id === MENU.COLUMNS) {
            return <ColumnsMenu anchor={ menu.anchor } columns={ allColumns } hidden={ hidden } blockedFilters={ blockedFilters } onToggle={ toggleColumn } onReset={ resetColumns } onClose={ closeMenu } />;
        }
        if (menu.id.startsWith(MENU.OWNER)) {
            const register = menu.id.slice(MENU.OWNER.length);
            return (
                <OwnerFilterMenu
                    anchor={ menu.anchor }
                    register={ register }
                    options={ optionsByRegister[register] || [] }
                    selected={ owners[register] }
                    hasUnassigned={ Boolean(unassignedByRegister[register]) }
                    onToggle={ (id) => toggleOwner(register, id) }
                    onClear={ () => clearOwner(register) }
                    onClose={ closeMenu }
                />
            );
        }
        if (menu.id.startsWith(MENU.SORT)) {
            const column = allColumns.find((c) => c.key === menu.id.slice(MENU.SORT.length));
            if (!column) return null;
            return column.kind === CD_COL_KIND.STAGE
                ? <StageSortMenu anchor={ menu.anchor } column={ column } group={ group } sort={ sort } onPick={ sortPick } onClose={ closeMenu } />
                : <ColumnSortMenu anchor={ menu.anchor } column={ column } sort={ sort } onPick={ sortPick } onClose={ closeMenu } />;
        }
        return null;
    };

    /* Master Access unchecked: a neutral surface that discloses nothing — no cards, no counts */
    if (!access.master) {
        return (
            <div className="mcd" data-mc-module="contracts-dashboard" data-cd-no-surface="access">
                <div className="denied" role="status">{ translation("key_cd_not_accessible") }</div>
            </div>
        );
    }

    const rosterOn = view === CD_VIEW.PAOS;
    return (
        <div className="mcd" data-mc-module="contracts-dashboard">
            <div className="phead">
                <div className="hbody">
                    <h1>{ translation("key_contracts") }</h1>
                    <div className="stats"><span>{ translation("key_last_refresh") } <b>{ lastRefresh || EM_DASH }</b></span></div>
                </div>
                <div className="hact">
                    <button type="button" className="fclear hbtn" aria-pressed={ rosterOn } onClick={ () => setView(rosterOn ? CD_VIEW.LIST : CD_VIEW.PAOS) }>
                        { rosterOn ? translation("key_back_to_contracts") : translation("key_paos_roster") }
                    </button>
                    { /* U-0272: the Contracts list is one of the three Contract Invoice entry points (PERM §6.5 "New Contract Invoice") */ }
                    { access.newContractInvoice && (
                        <Link className="fclear hbtn" to={ `/${ routes.addContractInvoice }` }>+ { translation("key_add_new_contract_invoice") }</Link>
                    ) }
                </div>
            </div>

            <StatusCards cards={ cards } status={ status } onPick={ pickStatus } />

            { rosterOn ? (
                <>
                    <div className="variantbar"><span className="roster-title">{ translation("key_cd_paos_roster_title") }</span></div>
                    <Suspense fallback={ <CustomSpinner /> }>
                        <PaosRoster branchOptions={ branchControl.options } onOpenContract={ openRow } />
                    </Suspense>
                </>
            ) : (
                <>
                    <div className="variantbar">
                        <span className="vlbl">{ translation("key_view") }</span>
                        <div className="viewseg">
                            { CD_GROUPS.map((g) => (
                                <button key={ g } type="button" className={ group === g ? "on" : "" } aria-pressed={ group === g } onClick={ () => pickGroup(g) }>
                                    { translation("key_group") } { g }
                                </button>
                            )) }
                        </div>
                    </div>

                    <DashboardFilterBar
                        search={ search }
                        searchEnabled={ searchEnabled }
                        onSearch={ (value) => { setSearch(value); setPage(1); } }
                        filters={ filters }
                        categoryOptions={ categoryOptions }
                        nationalityVisible={ nationalityEnabled }
                        nationalityOptions={ nationalityOptions }
                        codeOptions={ codeOptions }
                        onFilter={ setFilter }
                        branch={ branchControl }
                        onBranch={ pickBranch }
                        visibleCount={ columns.length }
                        totalCount={ allColumns.length }
                        columnsOpen={ menu?.id === MENU.COLUMNS }
                        onColumnsOpen={ (anchor) => openMenu(MENU.COLUMNS, anchor) }
                        onClear={ clearFilters }
                    />

                    { selecting && (
                        <SelectionBar count={ picked.length } visibleCount={ rows.length } registers={ access.registers } onBulk={ setBulk } onSelectAll={ selectAllVisible } onClear={ () => setPicked([]) } onDone={ toggleSelecting } />
                    ) }

                    <DashboardTable
                        columns={ columns }
                        rows={ rows }
                        status={ status }
                        sort={ sort }
                        loading={ loading }
                        error={ error }
                        scrollRef={ scrollRef }
                        openMenuId={ menu?.id }
                        ownerCounts={ ownerCounts }
                        csFilterVisible={ access.csFilterVisible }
                        onSortCycle={ sortCycle }
                        onSortMenu={ (column, anchor) => openMenu(`${ MENU.SORT }${ column.key }`, anchor) }
                        onOwnerMenu={ (register, anchor) => openMenu(`${ MENU.OWNER }${ register }`, anchor) }
                        selecting={ selecting }
                        picked={ picked }
                        onTogglePick={ togglePick }
                        onToggleAll={ toggleAll }
                        canOpenRow={ canOpenRow }
                        onOpenRow={ openRow }
                        onOpenDenied={ openDenied }
                        page={ page }
                        limit={ limit }
                        total={ total }
                        capped={ capped }
                        overflow={ overflow }
                        searchActive={ Boolean(search.trim()) }
                        onPage={ (delta) => setPage((p) => p + delta) }
                        onLimit={ (n) => { setLimit(n); setPage(1); } }
                        manageAvailable={ access.manageAvailable }
                        registers={ access.registers }
                        onToggleSelecting={ toggleSelecting }
                        onBulk={ setBulk }
                        onOwnerCell={ status === CD_STATUS.PROCESSING && (access.single.owner || access.single.assistant || access.single.prepReady) ? setOwnerRow : undefined }
                        onRetry={ reload }
                        onClearFilters={ clearFilters }
                    />
                </>
            ) }

            { renderMenu() }
            <div className={ `mcd-toast${ toast ? " on" : "" }` } role="status" aria-live="polite">{ toast }</div>

            { ownerRow && (
                <Suspense fallback={ null }>
                    <ManageOwnersDrawer contractId={ ownerRow.id } row={ { ...ownerRow, contract_status: CD_STATUS_ID[status] } }
                        canChangeOwner={ access.single.owner } canChangeAssistant={ access.single.assistant } canChangePrepReady={ access.single.prepReady }
                        onClose={ () => setOwnerRow(null) } onChanged={ reload } />
                </Suspense>
            ) }
            { bulk && (
                <BulkOwnershipModal
                    contractIds={ picked }
                    records={ rows.filter((r) => picked.includes(r.id)) }
                    holders={ ownerOptionsFrom(null, rows, ...CD_OWNER_ROW_KEYS[bulk]) }
                    defaultRegister={ bulk }
                    canPortfolio={ access.canPortfolio }
                    onClose={ () => setBulk(null) }
                    onDone={ bulkDone }
                />
            ) }
        </div>
    );
};

ContractsDashboard.propTypes = {
    onOpenContract: PropTypes.func.isRequired,
    mappingBranches: PropTypes.array,
    workerRefIdInitials: PropTypes.array,
};

export default ContractsDashboard;
