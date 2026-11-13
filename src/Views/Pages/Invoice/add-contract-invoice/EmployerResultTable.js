import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { fetchEmployers } from "../../../../redux/Slices/employer/EmployerSlice";
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import { dispatchWithHandling } from "../../../../utils/dispatchHandler";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import NotFoundMessage from "../../../../components/ReusableComponents/NotFoundMessage";
import translation from "../../../../utils/translation";

const fmtHKID = (hkId) => {
    const isBlank = !hkId || hkId === "''" || hkId === '""' || hkId === "''''''";
    if (isBlank) return '—';
    const f = hkId.replace(/\s|\(|\)/g, '').toUpperCase();
    return `${ f.slice(0, -1) }(${ f.slice(-1) })`;
};

/**
 * Bundle-styled "result-table" for selecting an employer in the invoice flow.
 * Reuses the same redux state + fetchEmployers thunk + PaginationBar as EmployerTable;
 * only the row rendering (radio single-select) differs. No API/redux changes.
 */
const EmployerResultTable = ({ searchQuery, handleSelectedRows, selectedId }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [pageLimit, setPageLimit] = useState(10);
    const { employers, currentPage, totalPages, totalEmployers, lastUpdated, perPage, status } = useSelector((state) => state.employer);

    useEffect(() => {
        dispatch(fetchEmployers({ context: 'list' }));
    }, [dispatch]);

    const handlePrevClick = useCallback(() => {
        if (parseInt(currentPage) > 1) {
            dispatchWithHandling(dispatch, fetchEmployers({ page: parseInt(currentPage) - 1, search_text: searchQuery, limit: pageLimit, context: 'list' }));
        }
    }, [dispatch, currentPage, searchQuery, pageLimit]);

    const handleNextClick = useCallback(() => {
        if (parseInt(currentPage) < totalPages) {
            dispatchWithHandling(dispatch, fetchEmployers({ page: parseInt(currentPage) + 1, search_text: searchQuery, limit: pageLimit, context: 'list' }));
        }
    }, [dispatch, currentPage, totalPages, searchQuery, pageLimit]);

    const handlePerPageChange = useCallback((perPageVal) => {
        setPageLimit(perPageVal);
        dispatchWithHandling(dispatch, fetchEmployers({ limit: perPageVal, page: parseInt(currentPage), search_text: searchQuery, context: 'list' }));
    }, [dispatch, currentPage, searchQuery]);

    const handleRefresh = useCallback(() => {
        dispatchWithHandling(dispatch, fetchEmployers({ page: parseInt(currentPage), search_text: searchQuery, limit: pageLimit, context: 'list' }));
    }, [dispatch, currentPage, searchQuery, pageLimit]);

    const paginationEntity = useMemo(() => ({
        total: totalEmployers,
        current_page: parseInt(currentPage),
        prev_page_url: parseInt(currentPage) > 1 ? `?page=${ parseInt(currentPage) - 1 }` : null,
        next_page_url: parseInt(currentPage) < totalPages ? `?page=${ parseInt(currentPage) + 1 }` : null,
        last_page: totalPages,
        per_page: perPage,
    }), [totalEmployers, currentPage, totalPages, perPage]);

    if (status && status === 'loading') {
        return <CustomSpinner />;
    }

    return (
        <>
            { employers?.length ? (
                <table className="result-table">
                    <thead>
                        <tr>
                            <th aria-hidden="true" />
                            <th>{ t('key_employer') }</th>
                            <th>{ t('key_hkid') }</th>
                            <th>{ t('key_mobile') }</th>
                            <th>{ t('key_email') }</th>
                            <th>{ t('key_branch') } · { t('key_cs') }</th>
                            <th>{ t('key_latest_job_offer') }</th>
                        </tr>
                    </thead>
                    <tbody>
                        { employers.map((e) => {
                            const id = e.employer_id;
                            const sel = String(selectedId) === String(id);
                            return (
                                <tr key={ id } className={ sel ? 'sel' : '' } onClick={ () => handleSelectedRows([e]) }>
                                    <td><span className="radio">{ sel && <i className="ri-check-line" /> }</span></td>
                                    <td>
                                        <div className="pri">{ e.name }{ e.chinese_name && <span> { e.chinese_name }</span> }</div>
                                        <div className="mono muted">{ e.reference_id || e.employer_reference_id || '' }</div>
                                    </td>
                                    <td className="mono">{ fmtHKID(e.hk_id) }</td>
                                    <td className="mono">{ e.mobile_number || '—' }</td>
                                    <td>{ e.email || '—' }</td>
                                    <td>{ !e.branch_name && !e.cs_name ? '—' : (<>{ e.branch_name && <div>{ e.branch_name }</div> }{ e.cs_name && <div className="muted">{ e.cs_name }</div> }</>) }</td>
                                    <td className="mono">{ e.latest_jo || '—' }</td>
                                </tr>
                            );
                        }) }
                    </tbody>
                </table>
            ) : <NotFoundMessage message={ translation('key_employer') } /> }

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

EmployerResultTable.propTypes = {
    searchQuery: PropTypes.string,
    handleSelectedRows: PropTypes.func,
    selectedId: PropTypes.any,
};

export default React.memo(EmployerResultTable);
