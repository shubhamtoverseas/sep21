import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/Icon/Icon";
import { fetchDuplicateJobs } from "../../../redux/Slices/job-offer/JobOfferSlice";
import { showErrorMessage } from "../../../services/commonService";
import translation from "../../../utils/translation";
import listStyles from "../Invoice/InvoiceList.module.css";
import empStyles from "../Employer/newui/EmployerDashboard.module.css";
import JobOfferDashboardTable from "./newui/dashboard/JobOfferDashboardTable";
import { getJobOfferDashboardColumns, jobOfferRowOpenLabel } from "./newui/dashboard/jobOfferDashboardColumns";
import { JO_DASH_PAGE_LIMIT, JO_FROM, jobOfferDetailsPath } from "./jobOfferConstants";

const JoCsRequestDialog = lazy(() => import("./newui/dashboard/JoCsRequestDialog"));

const JobOfferDuplicates = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { status, totalPages, totalJobOffers, duplicateJobs } = useSelector((state) => state.jobOffer);
    const { employerIDs } = useSelector((state) => state.employer);
    const [page, setPage] = useState(1);
    const [csRequestRow, setCsRequestRow] = useState(null);

    const load = useCallback(() => {
        dispatch(fetchDuplicateJobs({ page, employer_id: employerIDs, limit: JO_DASH_PAGE_LIMIT })).then((res) => { if (res?.error) showErrorMessage(res); });
    }, [dispatch, page, employerIDs]);
    useEffect(() => { load(); }, [load]);

    const columns = useMemo(() => getJobOfferDashboardColumns({ branchesById: {}, onCsRequest: setCsRequestRow }), []);
    const openJobOffer = useCallback((row) => navigate(jobOfferDetailsPath(row.id, JO_FROM.DASHBOARD), { state: { jobOfferObj: row } }), [navigate]);

    const total = Number(totalJobOffers) || 0;
    const pageInfo = useMemo(() => ({
        from: total ? (page - 1) * JO_DASH_PAGE_LIMIT + 1 : 0,
        to: total ? Math.min(page * JO_DASH_PAGE_LIMIT, total) : 0,
        total, currentPage: page, lastPage: Math.max(Number(totalPages) || 1, 1), limit: JO_DASH_PAGE_LIMIT,
    }), [total, page, totalPages]);

    return (
        <div className={ `${ listStyles.pageWrap } ${ empStyles.pageWrapEmd }` }>
            <div className={ `${ listStyles.pageHeader } ${ empStyles.pageHead }` }>
                <div className={ `${ listStyles.pageHeaderBody } ${ empStyles.dupHeader }` }>
                    <button type="button" className={ empStyles.backBtn } aria-label={ translation('key_back') } onClick={ () => navigate(-1) }><Icon name="chev_left" size={ 14 } /></button>
                    <h1 className={ empStyles.title }>{ translation('key_view_duplicate_job_offers') }</h1>
                </div>
            </div>
            <JobOfferDashboardTable
                columns={ columns }
                rows={ Array.isArray(duplicateJobs) ? duplicateJobs : [] }
                isLoading={ status === 'loading' }
                error={ null }
                pageInfo={ pageInfo }
                onSort={ () => {} }
                onRowClick={ openJobOffer }
                rowOpenLabel={ jobOfferRowOpenLabel }
                onPrev={ () => setPage((p) => Math.max(1, p - 1)) }
                onNext={ () => setPage((p) => Math.min(pageInfo.lastPage, p + 1)) }
                onRetry={ load }
            />
            <Suspense fallback={ null }>
                { csRequestRow && <JoCsRequestDialog requestedCsObj={ csRequestRow } onClose={ () => setCsRequestRow(null) } onRefreshList={ () => { setCsRequestRow(null); load(); } } /> }
            </Suspense>
        </div>
    );
};

export default JobOfferDuplicates;
