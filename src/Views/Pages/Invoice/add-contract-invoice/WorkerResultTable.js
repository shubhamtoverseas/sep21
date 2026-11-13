import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import constData, { SEARCH_DEBOUNCE_MS } from "../../../../components/ReusableComponents/constants";
import { fetchWorkers } from "../../../../redux/Slices/worker/WorkerSlice";
import { fetchWorkerNationalities } from "../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import { fetchWorkerProfileStatus } from "../../../../redux/Slices/common/workerStatuses/WorkerStatusesSlice";
import { dispatchWithHandling } from "../../../../utils/dispatchHandler";
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import NotFoundMessage from "../../../../components/ReusableComponents/NotFoundMessage";
import translation from "../../../../utils/translation";

const PROFILE_STATUS = constData.INVOICE_WORKER_PROFILE_STATUS;
const CONTRACT_STATUS_NOT_IN = constData.INVOICE_WORKER_CONTRACT_STATUS_NOT_IN;

/**
 * Bundle-styled "result-table" for selecting a worker in the invoice flow.
 * Reuses the same redux state (state.worker) + fetchWorkers thunk + the same
 * invoice filter params as WorkerTableInvoice; only the rendering (radio
 * single-select + Worker Type / Nationality / Worker Status dropdowns) differs.
 * No API/redux changes.
 *
 * Exchange (INV-X2; register #76): every worker is searchable and listed; one held by an Active or Processing contract is
 * shown with that contract's reference and status and cannot be picked (the server refuses it again, #56). A Worker Status
 * column, no eligibility labels; filters Worker Type, Nationality, Contract Status (the contract holding the worker) and
 * Worker Status. @migration-unspecified(invoice): #76 names "contract status" and "availability" filters without defining
 * them; read here as the Active / Processing contract and the Worker Status (OP-27-123).
 */
const LIVE_CONTRACT_KEYS = { 1: 'key_processing', 2: 'key_active' };

const WorkerResultTable = ({ searchQueryText, handleSelectedCheckedRows, renewalEmployerId, exchange = false }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [pageLimit, setPageLimit] = useState(10);
    const [type, setType] = useState('');
    const [nationality, setNationality] = useState('');
    const [statusId, setStatusId] = useState('');
    const [liveStatus, setLiveStatus] = useState('');
    const [selectedId, setSelectedId] = useState(null);

    const { workersList, currentPage, totalPages, totalWorkers, lastUpdated, perPage, status } = useSelector((state) => state.worker);
    const { workerNationalities } = useSelector((state) => state.nationalities);
    const { workerProfileStatusList } = useSelector((state) => state.workerStatuses);

    const localWorkerType = useMemo(() => constData.workerTypeList().find((x) => x.key === 'local'), []);
    const overseasWorkerType = useMemo(() => constData.workerTypeList().find((x) => x.key === 'overseas'), []);

    const buildFilter = useCallback((over = {}) => {
        if (exchange) {
            const f = { live_contract: 1, status: [], search_text: searchQueryText || '' };
            if (statusId) f.invoice_profile_status = [Number(statusId)];
            if (liveStatus) f.live_contract_status = [liveStatus];
            if (type) f.type = Number(type);
            if (nationality) f.nationality = [Number(nationality)];
            return { ...f, ...over };
        }
        const f = {
            invoice_profile_status: statusId ? [Number(statusId)] : PROFILE_STATUS,
            contract_status_not_in: CONTRACT_STATUS_NOT_IN,
            status: [],
            search_text: searchQueryText || '',
        };
        /* QA-27 ruling 11 (R-B3): this employer's Renewal workers are listed although they hold an Active contract; a status
           filter asks for that status only */
        if (renewalEmployerId && !statusId) f.renewal_employer_id = Number(renewalEmployerId);
        if (type) f.type = Number(type);
        if (nationality) f.nationality = [Number(nationality)];
        return { ...f, ...over };
    }, [exchange, type, nationality, statusId, liveStatus, searchQueryText, renewalEmployerId]);

    useEffect(() => {
        dispatch(fetchWorkers(buildFilter({ page: 1 })));
        if (!workerNationalities || workerNationalities.length === 0) {
            dispatch(fetchWorkerNationalities({ type: 'worker' }));
        }
        if (!workerProfileStatusList || workerProfileStatusList.length === 0) {
            dispatch(fetchWorkerProfileStatus());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    const applyFilter = useCallback((over) => {
        dispatchWithHandling(dispatch, fetchWorkers(buildFilter({ ...over, page: 1 })));
    }, [dispatch, buildFilter]);

    // Refetch (debounced) when the search text typed in the modal changes.
    const searchInitRef = useRef(true);
    const searchReadRef = useRef(null);
    useEffect(() => {
        if (searchInitRef.current) { searchInitRef.current = false; return; }
        const timer = setTimeout(() => {
            /* only the latest search counts: one still in flight is aborted (performance track A-17); a failed read
               fails as it did through dispatchWithHandling, an aborted one does not */
            searchReadRef.current?.abort();
            const read = dispatch(fetchWorkers(buildFilter({ page: 1, limit: pageLimit })));
            searchReadRef.current = read;
            read.unwrap().catch((error) => { if (error?.name !== 'AbortError') throw error; });
        }, SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQueryText]);

    const statusOptions = useMemo(() => {
        const flat = [];
        (workerProfileStatusList || []).forEach((group) => {
            const values = Array.isArray(group?.values) ? group.values : [group];
            values.forEach((s) => {
                const id = Number(s?.id);
                if ((exchange || PROFILE_STATUS.includes(id)) && !flat.some((x) => x.id === id)) {
                    flat.push({ id, name: s.name || s.worker_status || s.title || `${ id }` });
                }
            });
        });
        return flat;
    }, [workerProfileStatusList, exchange]);

    const onTypeChange = (e) => { const v = e.target.value; setType(v); applyFilter({ type: v ? Number(v) : undefined }); };
    const onNationalityChange = (e) => { const v = e.target.value; setNationality(v); applyFilter({ nationality: v ? [Number(v)] : undefined }); };
    const onStatusChange = (e) => { const v = e.target.value; setStatusId(v); applyFilter({ invoice_profile_status: v ? [Number(v)] : (exchange ? undefined : PROFILE_STATUS) }); };
    const onLiveStatusChange = (e) => { const v = e.target.value; setLiveStatus(v); applyFilter({ live_contract_status: v ? [v] : undefined }); };

    const handlePrevClick = useCallback(() => {
        if (parseInt(currentPage) > 1) dispatchWithHandling(dispatch, fetchWorkers(buildFilter({ page: parseInt(currentPage) - 1, limit: pageLimit })));
    }, [dispatch, currentPage, pageLimit, buildFilter]);

    const handleNextClick = useCallback(() => {
        if (parseInt(currentPage) < totalPages) dispatchWithHandling(dispatch, fetchWorkers(buildFilter({ page: parseInt(currentPage) + 1, limit: pageLimit })));
    }, [dispatch, currentPage, totalPages, pageLimit, buildFilter]);

    const handlePerPageChange = useCallback((perPageVal) => {
        setPageLimit(perPageVal);
        dispatchWithHandling(dispatch, fetchWorkers(buildFilter({ page: parseInt(currentPage), limit: perPageVal })));
    }, [dispatch, currentPage, buildFilter]);

    const handleRefresh = useCallback(() => {
        dispatchWithHandling(dispatch, fetchWorkers(buildFilter({ page: parseInt(currentPage), limit: pageLimit })));
    }, [dispatch, currentPage, pageLimit, buildFilter]);

    const paginationEntity = useMemo(() => ({
        total: totalWorkers,
        current_page: parseInt(currentPage),
        prev_page_url: parseInt(currentPage) > 1 ? `?page=${ parseInt(currentPage) - 1 }` : null,
        next_page_url: parseInt(currentPage) < totalPages ? `?page=${ parseInt(currentPage) + 1 }` : null,
        last_page: totalPages,
        per_page: perPage,
    }), [totalWorkers, currentPage, totalPages, perPage]);

    const typeLabel = (w) => {
        if (Number(w.type) === localWorkerType?.id) return t('key_local') || 'Local';
        if (Number(w.type) === overseasWorkerType?.id) return t('key_overseas') || 'Overseas';
        return '—';
    };
    const onRowSelect = (w) => { setSelectedId(w.id); handleSelectedCheckedRows([w]); };
    /* #76: the Active / Processing contract holding the worker, as the list reads it */
    const heldBy = (w) => (exchange && w.live_contract_number
        ? `${ w.live_contract_number } · ${ t(LIVE_CONTRACT_KEYS[Number(w.live_contract_status)] || 'key_contract') }` : '');

    return (
        <>
            <div className="tk-filters">
                <div className="field">
                    <label>{ t('key_worker_type') || 'Worker Type' }</label>
                    <div className="select"><select className="input" value={ type } onChange={ onTypeChange }>
                        <option value="">{ t('key_all') || 'All' }</option>
                        { constData.workerTypeList().map((wt) => <option key={ wt.id } value={ wt.id }>{ t(wt.translationKey) || wt.name }</option>) }
                    </select></div>
                </div>
                <div className="field">
                    <label>{ t('key_nationality') || 'Nationality' }</label>
                    <div className="select"><select className="input" value={ nationality } onChange={ onNationalityChange }>
                        <option value="">{ t('key_all') || 'All' }</option>
                        { workerNationalities?.map((n) => <option key={ n.id } value={ n.id }>{ n.name }</option>) }
                    </select></div>
                </div>
                { exchange && (
                    <div className="field">
                        <label>{ t('key_contract_status') }</label>
                        <div className="select"><select className="input" value={ liveStatus } onChange={ onLiveStatusChange } data-filter="live-contract">
                            <option value="">{ t('key_all') || 'All' }</option>
                            <option value="none">{ t('key_inv_no_live_contract') }</option>
                            <option value="1">{ t('key_processing') }</option>
                            <option value="2">{ t('key_active') }</option>
                        </select></div>
                    </div>
                ) }
                <div className="field">
                    <label>{ t('key_worker_status') || 'Worker Status' }</label>
                    <div className="select"><select className="input" value={ statusId } onChange={ onStatusChange }>
                        <option value="">{ t('key_all') || 'All' }</option>
                        { statusOptions.map((s) => <option key={ s.id } value={ s.id }>{ s.name }</option>) }
                    </select></div>
                </div>
            </div>

            { status === 'loading' ? <CustomSpinner /> : (
                workersList?.length ? (
                    <table className="result-table">
                        <thead>
                            <tr>
                                <th aria-hidden="true" />
                                <th>{ t('key_worker') }</th>
                                <th>{ t('key_worker_type') || 'Worker Type' }</th>
                                <th>{ t('key_nationality') || 'Nationality' }</th>
                                <th>{ t('key_worker_status') || 'Worker Status' }</th>
                                { exchange && <th>{ t('key_contract') }</th> }
                            </tr>
                        </thead>
                        <tbody>
                            { workersList.map((w) => {
                                const sel = String(selectedId) === String(w.id);
                                const statusLabel = w.worker_status?.worker_status || w.profile_status_info?.name;
                                const held = heldBy(w);
                                return (
                                    <tr key={ w.id } className={ held ? 'disabled' : sel ? 'sel' : '' } aria-disabled={ held ? true : undefined }
                                        title={ held ? t('key_inv_worker_held_by_contract') : undefined } onClick={ held ? undefined : () => onRowSelect(w) }>
                                        <td><span className="radio">{ sel && <i className="ri-check-line" /> }</span></td>
                                        <td>
                                            <div className="pri">{ w.fullname || w.name }</div>
                                            <div className="mono muted">{ w.reference_id || '' }</div>
                                        </td>
                                        <td>{ typeLabel(w) }</td>
                                        <td>{ w.nationality_info?.name || w.nationality_name || '—' }</td>
                                        <td>{ statusLabel ? <span className="elig eligible">{ statusLabel }</span> : '—' }</td>
                                        { exchange && <td data-live-contract={ w.live_contract_number || undefined }>{ held || '—' }</td> }
                                    </tr>
                                );
                            }) }
                        </tbody>
                    </table>
                ) : <NotFoundMessage message={ translation('key_worker') } />
            ) }

            <PaginationBar
                entity={ paginationEntity }
                handlePrevClick={ handlePrevClick }
                handleNextClick={ handleNextClick }
                handlePerPageChange={ handlePerPageChange }
                handleRefresh={ handleRefresh }
                last_update={ lastUpdated }
                showDensePadding={ false }
            />
        </>
    );
};

WorkerResultTable.propTypes = {
    searchQueryText: PropTypes.string,
    handleSelectedCheckedRows: PropTypes.func,
    renewalEmployerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    /** the Exchange picker (INV-X2, #76): every worker, a contract-held one shown disabled */
    exchange: PropTypes.bool,
};

export default React.memo(WorkerResultTable);
