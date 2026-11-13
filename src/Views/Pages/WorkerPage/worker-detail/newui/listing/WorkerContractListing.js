import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getPermissionValue, isAdminUser } from "../../../../../../services/commonService";
import { EMPLOYER_CROSS_MODULE_CREATE } from "../../../../Employer/newui/employerNewUiConstants";
import { useNavigate } from "react-router-dom";
import PropTypes from 'prop-types';
import WkdListingFoot from "./WkdListingFoot";
import WkdNewTop from "./WkdNewTop";
import WkdListing, { WkdDash, fmtListingDate } from "./WkdListing";
import WkdStatusChip from "../WkdStatusChip";
import useListingParty from "./useListingParty";
import { fetchContracts } from "../../../../../../redux/Slices/contract/ContractSlice";
import { getInitials } from "../../../../../../utils/utils";
import routes from "../../../../routes/routesConfig";
import translation from "../../../../../../utils/translation";
import { WKD_LIST_LIMIT, WKD_PAGE_LIMIT, CT_CHIP } from "../../../workerModuleConstants";

const dateCell = (v) => {
    const formatted = fmtListingDate(v);
    return <div className="mc-worker-listing-cell mc-listing-date">{ formatted || <WkdDash /> }</div>;
};

const WorkerContractListing = ({ worker_id, employer_id, partyColumn = 'employer', paginated = false }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [tableHeaderFilter, setTableHeaderFilter] = useState({ sort: '', order: '' });
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(WKD_PAGE_LIMIT);
    /* this listing keeps its own copy of the rows and page meta (SR-06): the contract slice is shared with the
       Contract dashboard, so another screen's rows must never flash here */
    const [result, setResult] = useState({ rows: [], currentPage: 1, lastPage: 1, total: 0 });
    const [listState, setListState] = useState({ loading: false, error: false });
    const requestSeq = useRef(0);
    const showWorkerParty = partyColumn === 'worker';
    /* U-0056: "New" is the Contract module's own create action (New Contract Invoice) — shown with its grant only */
    const permissionList = useSelector((state) => state.users.permissionList);
    const canCreate = useMemo(() => isAdminUser() || getPermissionValue(permissionList?.data, EMPLOYER_CROSS_MODULE_CREATE.contract.module, EMPLOYER_CROSS_MODULE_CREATE.contract.key) === 'y', [permissionList?.data]);
    /* "New" from a record page opens the create screen with this record's worker / employer preselected (ClickUp 14ykpqtw0m0) */
    const { invoiceState } = useListingParty(worker_id, employer_id);
    const onNew = useCallback(() => navigate(`/${ routes.addContractInvoice }`, { state: invoiceState }), [navigate, invoiceState]);

    const load = useCallback(() => {
        const seq = ++requestSeq.current;
        setListState({ loading: true, error: false });
        dispatch(fetchContracts({
            page: paginated ? page : 1,
            ...(worker_id && { worker_id }),
            ...(employer_id && { employer_id }),
            limit: paginated ? limit : WKD_LIST_LIMIT,
            ...(tableHeaderFilter.sort && tableHeaderFilter),
        })).then((res) => {
            if (seq !== requestSeq.current) return;
            if (res?.error) {
                setListState({ loading: false, error: true });
                return;
            }
            const payload = res?.payload || {};
            setResult({
                rows: Array.isArray(payload.data) ? payload.data : [],
                currentPage: Number(payload.current_page) || 1,
                lastPage: Number(payload.total_pages) || 1,
                total: Number(payload.total_count) || 0,
            });
            setListState({ loading: false, error: false });
        });
    }, [dispatch, worker_id, employer_id, tableHeaderFilter, paginated, page, limit]);

    useEffect(() => { load(); }, [load]);

    /* one sort grammar: a new column starts ascending; the same column flips */
    const handleSort = useCallback((sortKey) => {
        setPage(1);
        setTableHeaderFilter((prev) => ({
            sort: sortKey,
            order: prev.sort === sortKey && prev.order === 'ASC' ? 'DESC' : 'ASC',
        }));
    }, []);

    const columns = useMemo(() => [
        showWorkerParty
            ? { key: 'emp', label: translation('key_worker_name'), sortKey: 'contract.workersModel' }
            : { key: 'emp', label: translation('key_employer_name'), sortKey: 'contract.employersModel' },
        { key: 'st', label: translation('key_status'), sortKey: 'contract.contract_status' },
        { key: 'cdate', label: translation('key_contract_date'), sortKey: 'contract.contract_date' },
        { key: 'visaRel', label: translation('key_visa_release'), sortKey: 'contract.e_visa_payment_date' },
        { key: 'start', label: translation('key_start_date'), sortKey: 'contract.requested_start_date' },
        { key: 'end', label: translation('key_contract_end'), sortKey: 'contract.expiry_date' },
        { key: 'cs', label: translation('key_cs_owner'), sortKey: 'contract.staffsModel' },
    ], [showWorkerParty]);

    const partyCell = useCallback((row) => {
        if (showWorkerParty) {
            const workerName = row.workersModel?.worker_name || row.worker_name;
            return workerName || '—';
        }
        return row.employersModel?.employer_name || '—';
    }, [showWorkerParty]);

    const expectedEndCell = (row) => {
        const expected = row.expected_end_date || row.contract_end_expected_date;
        if (!row.expiry_date && row.contract_status === 'Active' && expected) {
            return (
                <div className="mc-worker-listing-cell mc-listing-date" data-mc-contract-end="expected">
                    <span className="mc-expected-cell">{ fmtListingDate(expected) }</span>
                    <span className="mc-expected-tag">{ translation('key_wkr_expected') }</span>
                </div>
            );
        }
        return dateCell(row.expiry_date);
    };

    const renderCells = useCallback((row) => [
        <div key="emp" className="mc-listing-primary">{ partyCell(row) }</div>,
        row.contract_status
            ? <WkdStatusChip label={ row.contract_status } tone={ CT_CHIP[row.contract_status] || 'up' } />
            : <WkdDash />,
        dateCell(row.contract_date),
        dateCell(row.e_visa_payment_date),
        dateCell(row.requested_start_date),
        expectedEndCell(row),
        row.staffsModel?.cs_name ? (
            <div className="wkd-listing-owner">
                <span className="wkd-listing-owner-av">{ getInitials(row.staffsModel.cs_name) }</span>
                <span className="mc-listing-owner-name">{ row.staffsModel.cs_name }</span>
            </div>
        ) : <WkdDash />,
    ], [partyCell]);

    const handleRowClick = useCallback((row) => {
        if (row.id) navigate(routes.contractDetails.replace(':contract_id', row.id));
    }, [navigate]);

    const footer = paginated ? (
        <WkdListingFoot
            total={ result.total }
            currentPage={ result.currentPage }
            lastPage={ result.lastPage }
            perPage={ limit }
            isLoading={ listState.loading }
            unitKey="key_contracts_lc"
            onPrev={ () => setPage((prev) => Math.max(1, prev - 1)) }
            onNext={ () => setPage((prev) => prev + 1) }
            onLimitChange={ (value) => { setLimit(value); setPage(1); } }
        />
    ) : null;

    return (
        <WkdListing
            topBar={ <WkdNewTop ariaLabel={ `${ translation('key_new') } ${ translation('key_contract') }` } onClick={ canCreate ? onNew : undefined } /> }
            footer={ footer }
            columns={ columns }
            gridClass="wkd-grid-ct"
            rows={ result.rows }
            loading={ listState.loading }
            error={ listState.error }
            onRetry={ load }
            sort={ tableHeaderFilter.sort }
            order={ tableHeaderFilter.order }
            onSort={ handleSort }
            emptyText={ translation('key_no_contracts_to_display') }
            rowKey={ (row) => row.id || row.contract_number }
            onRowClick={ handleRowClick }
            rowAriaLabel={ (row) => row.contract_number }
            renderCells={ renderCells }
        />
    );
};

WorkerContractListing.propTypes = {
    paginated: PropTypes.bool,
    worker_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    employer_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    partyColumn: PropTypes.oneOf(['employer', 'worker']),
};

export default React.memo(WorkerContractListing);
