import React, { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import PropTypes from 'prop-types';
import WorkerJobOfferListing from "../newui/joboffer/WkdJobOfferListing";
import { dispatchWithHandling } from "../../../../../utils/dispatchHandler";
import { fetchWorkerJobOfferDetails, fetchWorkerJobStatusList, fetchWorkerJobOfferList } from "../../../../../redux/Slices/worker/WorkerSlice";
import constData from "../../../../../components/ReusableComponents/constants";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import translation from "../../../../../utils/translation";
import { JOB_OFFER_ID_PARAM, WKD_JO_SEARCH_DEBOUNCE_MS, WKD_JO_STAGE_FILTERS, WKD_JO_STAGE_FILTER_ALL, WKD_LIST_LIMIT } from "../../workerModuleConstants";

const WorkerJobOfferDetailView = lazy(() => import("../newui/joboffer/WkdJobOfferDetail"));

const selectWorkerState = (state) => state.worker;
const selectUsersState = (state) => state.users;

const IDLE = Object.freeze({ loading: false, error: false });

const WorkerJobOfferTab = ({ worker_id, limit, onHandleWorkerTextCopyInChat, isWorkerPermissionAccessInfo, isAdmin, workerProfileInfo }) => {
    const dispatch = useDispatch();
    const [isJobDetailView, setIsJobDetailView] = useState(false);
    const [isJobInfo, setIsJobInfo] = useState(null);
    const { workerJobOfferDetails, jobStatusList, workerJobOfferList, currentPage } = useSelector(selectWorkerState);
    const [updateFilters, setUpdatedFilters] = useState(constData.workerJobOfferFilters);
    const { permissionList } = useSelector(selectUsersState);
    /* the listing's own request state (SR-06) — the worker slice `status` is shared by every worker request */
    const [listState, setListState] = useState(IDLE);
    const [detailState, setDetailState] = useState(IDLE);
    /* one page size for every fetch — the first-load value the record shell used */
    const pageLimit = limit || WKD_LIST_LIMIT;

    useEffect(() => {
        if (jobStatusList?.length === 0) {
            dispatchWithHandling(dispatch, fetchWorkerJobStatusList());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    /* stale guard: the previous in-flight list request is aborted so its rows can never land after a newer one */
    const listRequest = useRef(null);
    const fetchList = useCallback((filters, page = 1) => {
        if (listRequest.current) listRequest.current.abort();
        setListState({ loading: true, error: false });
        const request = dispatch(fetchWorkerJobOfferList({ ...filters, page, limit: pageLimit, worker_id }));
        listRequest.current = request;
        request.then((res) => {
            if (res?.meta?.aborted || listRequest.current !== request) return;
            listRequest.current = null;
            setListState({ loading: false, error: Boolean(res?.error) });
        });
    }, [dispatch, worker_id, pageLimit]);

    const searchTimer = useRef(null);
    useEffect(() => () => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        if (listRequest.current) listRequest.current.abort();
    }, []);

    const detailRequest = useRef(0);
    const handleJobDetailView = useCallback((job) => {
        setIsJobInfo(job);
        setIsJobDetailView(true);
        const seq = ++detailRequest.current;
        setDetailState({ loading: true, error: false });
        dispatch(fetchWorkerJobOfferDetails({ "job_id": job?.job_id })).then((res) => {
            if (seq !== detailRequest.current) return;
            setDetailState({ loading: false, error: Boolean(res?.error) });
        });
    }, [dispatch]);

    const [searchParams, setSearchParams] = useSearchParams();
    const handledDeepLink = useRef('');
    useEffect(() => {
        const jobOfferId = searchParams.get(JOB_OFFER_ID_PARAM);
        if (!jobOfferId || listState.loading || !workerJobOfferList?.data) return;
        const rows = Array.isArray(workerJobOfferList.data) ? workerJobOfferList.data : [];
        const found = rows.find((job) => String(job.job_id) === String(jobOfferId));
        const signature = `${ worker_id }|${ jobOfferId }`;
        if (handledDeepLink.current === signature) return;
        handledDeepLink.current = signature;
        if (found) {
            handleJobDetailView(found);
        } else {
            /* the id is not in this worker's Job Offers: say so once, stay on the list (SR-05) */
            ShowToast("error", translation('key_wkr_job_offer_not_available'));
        }
    }, [searchParams, workerJobOfferList, listState.loading, worker_id, handleJobDetailView]);

    const handleJoStatusChangeRefresh = useCallback((filterId) => {
        const filter = WKD_JO_STAGE_FILTERS.find((item) => item.id === filterId);
        const value = filter ? filter.stageIds.join(',') : WKD_JO_STAGE_FILTER_ALL;
        setUpdatedFilters((prev) => {
            const next = { ...prev, job_stage_status: value };
            fetchList(next);
            return next;
        });
    }, [fetchList]);

    const handleSearchJORefresh = useCallback((searchText) => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            searchTimer.current = null;
            setUpdatedFilters((prev) => {
                const next = { ...prev, search_text: searchText };
                fetchList(next);
                return next;
            });
        }, WKD_JO_SEARCH_DEBOUNCE_MS);
    }, [fetchList]);

    const handleRefreshJobList = useCallback(() => {
        fetchList(updateFilters, parseInt(currentPage) || 1);
    }, [fetchList, updateFilters, currentPage]);

    const onHandleTextCopyInChat = useCallback((detailInfo) => {
        onHandleWorkerTextCopyInChat(detailInfo);
    }, [onHandleWorkerTextCopyInChat]);

    const handleCloseDetailView = useCallback(() => {
        setIsJobDetailView(false);
        /* Back returns to the list state: the deep-link parameter must not re-open the record */
        if (searchParams.has(JOB_OFFER_ID_PARAM)) {
            const next = new URLSearchParams(searchParams);
            next.delete(JOB_OFFER_ID_PARAM);
            setSearchParams(next, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const retryDetail = useCallback(() => {
        if (isJobInfo) handleJobDetailView(isJobInfo);
    }, [isJobInfo, handleJobDetailView]);

    const detailBody = () => {
        if (detailState.loading) {
            return (
                <div className="ctx-state" data-context-state="loading" aria-busy="true">
                    <span className="ctx-spinner" />
                    <strong>{ translation('key_loading') }…</strong>
                </div>
            );
        }
        if (detailState.error) {
            return (
                <div className="ctx-state" data-context-state="error">
                    <span className="ctx-state-icon">!</span>
                    <strong>{ translation('key_something_went_wrong') }</strong>
                    <button type="button" className="ctx-btn secondary" onClick={ retryDetail }>{ translation('key_retry') }</button>
                </div>
            );
        }
        return (
            <Suspense fallback={ <div /> }>
                <WorkerJobOfferDetailView key={ isJobInfo?.job_id } handleOnClose={ handleCloseDetailView } workerJobOfferDetails={ workerJobOfferDetails } isJobInfo={ isJobInfo } onHandleTextCopyInChat={ onHandleTextCopyInChat } permissionList={ permissionList } isWorkerPermissionAccessInfo={ isWorkerPermissionAccessInfo } isAdmin={ isAdmin } workerProfileInfo={ workerProfileInfo } handleRefreshJobList={ handleRefreshJobList } />
            </Suspense>
        );
    };

    return <div>
        <div className={ isJobDetailView ? 'd-none' : '' }>
            <WorkerJobOfferListing handleJobDetailView={ handleJobDetailView }
                workerJobs={ workerJobOfferList }
                handleJoStatusChange={ handleJoStatusChangeRefresh }
                onSearchJORefresh={ handleSearchJORefresh }
                listState={ listState }
                onRetry={ handleRefreshJobList }
            />
        </div>
        { isJobDetailView && <div>
            <button type="button" className="wkd-back" onClick={ handleCloseDetailView }>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#1d4ed8" strokeWidth="1.8" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>
                { translation('key_back_to_job_offers') }
            </button>
            { detailBody() }
        </div> }
    </div>
};

WorkerJobOfferTab.propTypes = {
    worker_id: PropTypes.any,
    limit: PropTypes.number,
    onHandleWorkerTextCopyInChat: PropTypes.func,
    isWorkerPermissionAccessInfo: PropTypes.any,
    isAdmin: PropTypes.any,
    workerProfileInfo: PropTypes.object,
};

export default React.memo(WorkerJobOfferTab);
