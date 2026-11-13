import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import "../worker-dashboard.css";
import { fetchDuplicateWorkers } from "../../../../../redux/Slices/worker/WorkerSlice";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import translation from "../../../../../utils/translation";
import { headingCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import WgdIcon from "../WgdIcon";
import WorkerDashboardTable from "../WorkerDashboardTable";
import { DEFAULT_SORT, TABLE_COLS, nextSort, normalizeWorkerRow } from "../workerDashboardConfig";
import { DUPLICATES_PAGE_LIMIT, DUPLICATE_SORT_FIELD, DUPLICATE_SORT_PARAM } from "../../workerModuleConstants";
import { canViewWorkerDuplicates } from "../../../../../utils/permissions/workerPermissionUtils";

const EMPTY_SET = new Set();
const NO_OWNER_FILTERS = Object.freeze({});
const noop = () => {};

const compareRows = (a, b, field) => String(a?.[field] ?? '').localeCompare(String(b?.[field] ?? ''), undefined, { sensitivity: 'base', numeric: true });

const WorkerDuplicatesPage = () => {
    const { user_id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const duplicateWorkersList = useSelector((state) => state.worker.duplicateWorkersList, shallowEqual);
    const permissionList = useSelector((state) => state.users.permissionList);
    /* D42 / W-04: View Worker Duplicates grant; partners never reach the duplicates page (the route guard agrees) */
    const canView = useMemo(
        () => canViewWorkerDuplicates(permissionList),
        [permissionList]
    );

    const [isLoading, setIsLoading] = useState(canView);
    const [loadFailed, setLoadFailed] = useState(false);
    const [sort, setSort] = useState(DEFAULT_SORT);
    /* D43: this page keeps its own page / totals — `state.worker.currentPage` etc. belong to the main list and can be stale */
    const [paging, setPaging] = useState({ page: 1, total: 0, totalPages: 1, perPage: DUPLICATES_PAGE_LIMIT });

    const load = useCallback((page, sortState) => {
        if (!canView) return;
        setIsLoading(true);
        const sortParam = DUPLICATE_SORT_PARAM[sortState?.key];
        dispatch(fetchDuplicateWorkers({
            page,
            limit: DUPLICATES_PAGE_LIMIT,
            user_id: user_id ? parseInt(user_id, 10) : null,
            ...(sortParam ? { sort_by: sortParam, sort_order: String(sortState.dir || 'asc').toUpperCase() } : {}),
        }))
            .unwrap()
            .then((res) => {
                setLoadFailed(false);
                setPaging({
                    page: parseInt(res?.current_page, 10) || page,
                    total: Number(res?.total) || (Array.isArray(res?.data) ? res.data.length : 0),
                    totalPages: Math.max(parseInt(res?.total_pages, 10) || 1, 1),
                    perPage: Number(res?.per_page) || DUPLICATES_PAGE_LIMIT,
                });
            })
            .catch((err) => {
                setLoadFailed(true);
                const message = err?.data?.data?.message || err?.data?.message;
                if (message) ShowToast('error', message);
            })
            .finally(() => setIsLoading(false));
    }, [dispatch, user_id, canView]);
    useEffect(() => { load(1, DEFAULT_SORT); }, [load]);

    /* the server sorts the whole result when it honours `sort_by`; the client sort keeps the current page consistent meanwhile */
    const rows = useMemo(() => {
        const list = (Array.isArray(duplicateWorkersList) ? duplicateWorkersList : []).map(normalizeWorkerRow);
        const field = DUPLICATE_SORT_FIELD[sort.key];
        if (!field) return list;
        const sorted = [...list].sort((a, b) => compareRows(a, b, field));
        return sort.dir === 'desc' ? sorted.reverse() : sorted;
    }, [duplicateWorkersList, sort]);

    const { page, total, totalPages, perPage: size } = paging;
    const footStart = total ? (page - 1) * size + 1 : 0;
    const footEnd = total ? Math.min(page * size, total) : 0;

    const handleSort = useCallback((key) => {
        const next = nextSort(sort, key);
        setSort(next);
        load(1, next);
    }, [sort, load]);
    const openWorker = useCallback((row) => { if (row?.id) navigate(routes.workerDetails.split('/:')[0] + `/${ row.id }`); }, [navigate]);

    if (!canView) {
        return (
            <div className="wgd" data-wgd-duplicates={ user_id }>
                <div className="page">
                    <div className="phead"><div><h1>{ headingCase(translation('key_view_duplicate_workers')) }</h1></div></div>
                    <div className="tablecard wgd-denied" role="status">{ translation('key_wkr_global_screen_denied') }</div>
                </div>
            </div>
        );
    }

    return (
        <div className="wgd" data-wgd-duplicates={ user_id }>
            <div className="page">
                <div className="phead">
                    <div>
                        <h1>{ headingCase(translation('key_view_duplicate_workers')) }</h1>
                        <div className="stats">
                            <span>{ total } { total === 1 ? translation('key_worker').toLowerCase() : translation('key_workers').toLowerCase() }</span>
                        </div>
                    </div>
                    <div className="hacts">
                        <button type="button" className="btn btn-secondary" onClick={ () => navigate(-1) }>
                            <WgdIcon name="chev_left" size={ 14 } />{ translation('key_back') }
                        </button>
                    </div>
                </div>

                <WorkerDashboardTable
                    colKeys={ TABLE_COLS.duplicates }
                    rows={ rows }
                    loading={ isLoading }
                    error={ loadFailed }
                    onRetry={ () => load(page, sort) }
                    emptyText={ translation('key_wkr_no_duplicates_found') }
                    sort={ sort }
                    ownerFilters={ NO_OWNER_FILTERS }
                    selected={ EMPTY_SET }
                    selectMode={ false }
                    rowsOpenable
                    canSelect={ false }
                    footStart={ footStart }
                    footEnd={ footEnd }
                    footTotal={ total }
                    page={ page }
                    totalPages={ totalPages }
                    onSort={ handleSort }
                    onOwnerOpen={ noop }
                    onToggleRow={ noop }
                    onToggleAll={ noop }
                    onToggleSelectMode={ noop }
                    onOpenWorker={ openWorker }
                    onOpenStage={ noop }
                    onPage={ (delta) => load(page + delta, sort) }
                />
            </div>
        </div>
    );
};

export default WorkerDuplicatesPage;
