import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getPermissionValue, isAdminUser } from "../../../../../../services/commonService";
import { EMPLOYER_CROSS_MODULE_CREATE } from "../../../../Employer/newui/employerNewUiConstants";
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';
import WkdListingFoot from "./WkdListingFoot";
import WkdNewTop from "./WkdNewTop";
import WkdListing, { WkdDash, fmtListingDate } from "./WkdListing";
import useListingParty from "./useListingParty";
import routes from "../../../../routes/routesConfig";
import { fetchPartyInsuranceRecords } from "../../../../../../redux/Slices/insurance/InsuranceSlice";
import { getInitials } from "../../../../../../utils/utils";
import translation from "../../../../../../utils/translation";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import { COVERAGE_TONE, coverageDetail, coverageLabel } from "../../../../insurance/dashboard/insuranceDashboardConfig";
import InsuranceWorkTags from "../../../../insurance/shared/InsuranceWorkTags";
import StaffAccountCue from "../../../../../../components/ui/StaffAccountCue";
import { WKD_LIST_LIMIT, WKD_PAGE_LIMIT } from "../../../workerModuleConstants";

/* @migration-unspecified(insurance): the Worker / Employer Insurance tabs are retained as the party entry
   point (U-3, C13); they read R1 with the party filter and show coverage and open requests instead of the
   retired stored status. Retained existing behaviour. Confirm with product before release. */

const dateCell = (v) => (
    <div className="mc-worker-listing-cell mc-listing-date">{ v || <WkdDash /> }</div>
);

const SORT_KEYS = { employer: 'employer', worker: 'worker', condition: 'condition', coverage: 'coverage', expiry: 'expiry' };

const WorkerInsuranceListing = ({ worker_id, employer_id, partyColumn = 'employer', paginated = false }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [tableHeaderFilter, setTableHeaderFilter] = useState({ sort: '', order: '' });
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(WKD_PAGE_LIMIT);
    const [result, setResult] = useState({ rows: [], total: 0, restricted: false });
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [reloadTick, setReloadTick] = useState(0);
    const requestSeq = useRef(0);
    const showWorkerParty = partyColumn === 'worker';
    /* U-0056: "New" is the Insurance module's own create action — shown with its grant only */
    const permissionList = useSelector((state) => state.users.permissionList);
    const canCreate = useMemo(() => isAdminUser() || getPermissionValue(permissionList?.data, EMPLOYER_CROSS_MODULE_CREATE.insurance.module, EMPLOYER_CROSS_MODULE_CREATE.insurance.key) === 'y', [permissionList?.data]);
    /* "New" from a record page opens the wizard with this record's worker / employer preselected */
    const { insuranceState } = useListingParty(worker_id, employer_id);
    const onNew = useCallback(() => navigate(routes.insuranceNew, { state: insuranceState }), [navigate, insuranceState]);

    useEffect(() => {
        const seq = ++requestSeq.current;
        const pageLimit = paginated ? limit : WKD_LIST_LIMIT;
        setIsLoading(true);
        setLoadError(false);
        dispatch(fetchPartyInsuranceRecords({
            page: paginated ? page : 1,
            limit: pageLimit,
            ...(worker_id && { worker_id: Number(worker_id) }),
            ...(employer_id && { employer_id: Number(employer_id) }),
            ...(tableHeaderFilter.sort && { sort: { key: SORT_KEYS[tableHeaderFilter.sort], dir: tableHeaderFilter.order === 'DESC' ? 'desc' : 'asc' } }),
        }))
            .unwrap()
            .then((data) => { if (seq === requestSeq.current) setResult(data || { rows: [], total: 0 }); })
            .catch(() => {
                /* a failed load is an error state with Retry (SR-02), not a toast over an empty list */
                if (seq !== requestSeq.current) return;
                setResult({ rows: [], total: 0, restricted: false });
                setLoadError(true);
            })
            .finally(() => { if (seq === requestSeq.current) setIsLoading(false); });
    }, [dispatch, worker_id, employer_id, tableHeaderFilter, paginated, page, limit, reloadTick]);

    const retry = useCallback(() => setReloadTick((tick) => tick + 1), []);

    const handleSort = useCallback((sortKey) => {
        setPage(1);
        setTableHeaderFilter((prev) => ({
            sort: sortKey,
            order: prev.sort === sortKey && prev.order === 'ASC' ? 'DESC' : 'ASC',
        }));
    }, []);

    const columns = useMemo(() => [
        showWorkerParty
            ? { key: 'emp', label: translation('key_worker'), sortKey: 'worker' }
            : { key: 'emp', label: translation('key_employer'), sortKey: 'employer' },
        { key: 'st', label: translation('key_ins_col_coverage_status'), sortKey: 'condition' },
        { key: 'pol', label: translation('key_ins_col_qbe_policy_number') },
        { key: 'eff', label: translation('key_effective_date'), sortKey: 'coverage' },
        { key: 'exp', label: translation('key_expiry_date'), sortKey: 'expiry' },
        { key: 'next', label: translation('key_ins_col_open_requests') },
        { key: 'cs', label: translation('key_ins_col_cs_owner') },
    ], [showWorkerParty]);

    const renderCells = useCallback((row) => {
        const party = showWorkerParty ? row.worker?.name : row.employer?.name;
        const cv = row.coverage || {};
        return [
            <div key="emp" className="mc-listing-primary">{ party || '—' }</div>,
            <div key="st" className="mc-worker-listing-cell">
                {/* the coverage tag only; its detail is the title (register #84) */}
                <span className={ listStyles.statusTag } data-tone={ COVERAGE_TONE[cv.label] || 'neutral' } title={ coverageDetail(cv) || undefined }>
                    { coverageLabel(cv.label) }
                </span>
            </div>,
            row.carrierRef
                ? <span key="pol" className="mc-listing-mono">{ row.carrierRef }</span>
                : <WkdDash key="pol" />,
            dateCell(fmtListingDate(row.policyPeriod?.effective)),
            dateCell(fmtListingDate(row.policyPeriod?.expiry)),
            /* open requests by type and the Needs attention note, the dashboard's component (INS08, C4) */
            <div key="next" className="mc-worker-listing-cell wkd-listing-work">
                <InsuranceWorkTags openRequests={ row.work?.openRequests || [] } attention={ row.work?.attention || 0 } empty={ <WkdDash /> } />
            </div>,
            /* CS Owner is current responsibility: the shared cue for an explicitly inactive account only (C3) */
            row.owner?.name ? (
                <div className="wkd-listing-owner sm">
                    <span className="wkd-listing-owner-av sm">{ getInitials(row.owner.name) }</span>
                    <StaffAccountCue active={ row.owner.active } />
                    <span className="mc-listing-owner-name">{ row.owner.name }</span>
                </div>
            ) : <WkdDash />,
        ];
    }, [showWorkerParty]);

    const handleRowClick = useCallback((row) => {
        if (row.ref) navigate(routes.insuranceRecord.replace(':ref', row.ref));
    }, [navigate]);

    const total = result.restricted ? (result.rows || []).length : Number(result.total) || 0;
    const footer = paginated ? (
        <WkdListingFoot
            total={ total }
            currentPage={ result.restricted ? 1 : page }
            lastPage={ result.restricted ? 1 : Math.max(Math.ceil(total / limit), 1) }
            perPage={ limit }
            isLoading={ isLoading }
            unitKey="key_policies_lc"
            onPrev={ () => setPage((prev) => Math.max(1, prev - 1)) }
            onNext={ () => setPage((prev) => prev + 1) }
            onLimitChange={ (value) => { setLimit(value); setPage(1); } }
        />
    ) : null;

    return (
        <WkdListing
            topBar={ <WkdNewTop ariaLabel={ `${ translation('key_new') } ${ translation('key_insurance') }` } onClick={ canCreate ? onNew : undefined } /> }
            footer={ footer }
            columns={ columns }
            gridClass="wkd-grid-ins"
            rows={ result.rows || [] }
            loading={ isLoading }
            error={ loadError }
            onRetry={ retry }
            notice={ result.restricted ? (
                /* PERM §1.3 Restricted Search Access: the server returned the capped accessible set, not the whole list */
                <div className="mc-listing-sub wkd-listing-notice" role="status" data-mc-restricted="true">{ translation('key_wkr_restricted_listing_note') }</div>
            ) : null }
            sort={ tableHeaderFilter.sort }
            order={ tableHeaderFilter.order }
            onSort={ handleSort }
            emptyText={ translation('key_no_insurance_to_display') }
            rowKey={ (row) => row.id || row.ref }
            onRowClick={ handleRowClick }
            rowAriaLabel={ (row) => `${ row.worker?.name || '' } ${ row.ref || '' }`.trim() }
            renderCells={ renderCells }
        />
    );
};

WorkerInsuranceListing.propTypes = {
    paginated: PropTypes.bool,
    worker_id: PropTypes.any,
    employer_id: PropTypes.any,
    partyColumn: PropTypes.oneOf(['employer', 'worker']),
};

export default React.memo(WorkerInsuranceListing);
