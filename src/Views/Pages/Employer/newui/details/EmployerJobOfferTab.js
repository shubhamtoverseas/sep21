import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmployerJobOffers } from "../../../../../redux/Slices/employer/EmployerSlice";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import { getPermissionValue, isAdminUser } from "../../../../../services/commonService";
import { getJobOfferPermissions } from "../../../../../utils/permissions/jobPermissionsUtils";
import translation from "../../../../../utils/translation";
import EmployerJobOfferListing from "./EmployerJobOfferListing";
import { ACTIVE_EMPLOYER_STATUS } from "./employerDetailsConfig";
import { JO_STATUS_ALL, OPEN_JO_LIMIT, JOB_OFFER_ID_PARAM, MODE_PARAM, EDIT_MODE, CREATE_PARAM } from "../employerNewUiConstants";
import { JO_DASH_STATUS_FILTER_IDS, JO_EDIT_FROM, JO_FROM, jobOfferDetailsPath, jobOfferEditPath } from "../../../JobOfferPage/jobOfferConstants";
import { joStatusLabel } from "../../../JobOfferPage/newui/JoStatusTag";

const JobOfferAddPanel = lazy(() => import("../../../JobOfferPage/newui/editor/JobOfferAddPanel"));

const matchesSearch = (row, query, statusLabel) => {
    if (!query) return true;
    const haystack = `${ row?.reference_id || '' } ${ row?.cs_name || '' } ${ statusLabel || '' }`.toLowerCase();
    return haystack.includes(query);
};

const EmployerJobOfferTab = ({ employerId }) => {
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { empJobOffers, currentEmployer } = useSelector((state) => state.employer);
    const { permissionList, ownerOnboardingList } = useSelector((state) => state.users);

    const [statusFilter, setStatusFilter] = useState(JO_STATUS_ALL);
    const [search, setSearch] = useState('');
    const [isAddNewJobOffer, setIsAddNewJobOffer] = useState(false);
    /* audit D-03 / D-08: this list owns its request state — the shared slice `status` flips on every employer thunk */
    const [jobsRequest, setJobsRequest] = useState({ loading: true, error: false });
    const handledDeepLink = useRef('');

    const isAdmin = useMemo(() => isAdminUser(), []);
    /* U-0256: the list is always shown; a row opens only when the actor's Job Offer context (owner / non-owner, from `is_owner`) carries Details View */
    const canOpenRow = useCallback((row) => getJobOfferPermissions(permissionList, ownerOnboardingList, employerId, row?.is_owner === true || Number(row?.is_owner) === 1 ? true : (row?.is_owner === false || Number(row?.is_owner) === 0 ? false : undefined)).canViewDetails, [permissionList, ownerOnboardingList, employerId]);
    const canAddJobOffer = useMemo(() => {
        /* U-0257: the employer-hosted button reads the Employer grid grant (PERM §9.3) AND Job Offer module access */
        const permitted = isAdmin || (getPermissionValue(permissionList?.data, 'employer', 'employer_jo_add') === 'y' && getPermissionValue(permissionList?.data, 'jo', 'jo_access') === 'y');
        return permitted && currentEmployer?.no_inreview_open_expiring_jobs < OPEN_JO_LIMIT && currentEmployer?.status === ACTIVE_EMPLOYER_STATUS;
    }, [permissionList?.data, isAdmin, currentEmployer?.no_inreview_open_expiring_jobs, currentEmployer?.status]);

    /* JO Status options: the one JO_STATUS map (Draft, In Review, Open, Open - Expiring, On Hold, Closed) */
    const statusOptions = useMemo(() => [
        { value: JO_STATUS_ALL, label: translation('key_all') },
        ...JO_DASH_STATUS_FILTER_IDS.map((id) => ({ value: id, label: joStatusLabel(id) })),
    ], []);

    const loadJobOffers = useCallback(() => {
        setJobsRequest({ loading: true, error: false });
        return dispatch(fetchEmployerJobOffers({
            emp_id: employerId,
            status: statusFilter === JO_STATUS_ALL ? null : [statusFilter],
        })).then((res) => setJobsRequest({ loading: false, error: Boolean(res?.error) }));
    }, [dispatch, employerId, statusFilter]);

    useEffect(() => { loadJobOffers(); }, [loadJobOffers]);

    /* older arrivals: `?jobOfferId=` opens the standalone record, `&mode=edit` opens the editor route (R-26) */
    useEffect(() => {
        const jobOfferId = searchParams.get(JOB_OFFER_ID_PARAM);
        if (!jobOfferId) return;
        const wantsEdit = searchParams.get(MODE_PARAM) === EDIT_MODE;
        const found = Array.isArray(empJobOffers) ? empJobOffers.find((job) => String(job.id) === String(jobOfferId)) : null;
        if (wantsEdit) navigate(jobOfferEditPath(jobOfferId, JO_EDIT_FROM.RECORD), { replace: true });
        else navigate(jobOfferDetailsPath(jobOfferId, JO_FROM.EMPLOYER), { replace: true, state: found ? { jobOfferObj: found } : undefined });
    }, [searchParams, empJobOffers, navigate]);

    useEffect(() => {
        if (searchParams.get(CREATE_PARAM) !== '1' || !currentEmployer) return;
        const signature = `create|${ employerId }`;
        if (handledDeepLink.current === signature) return;
        handledDeepLink.current = signature;
        if (canAddJobOffer) setIsAddNewJobOffer(true);
        const next = new URLSearchParams(searchParams);
        next.delete(CREATE_PARAM);
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams, currentEmployer, canAddJobOffer, employerId]);

    /* older links that handed a row over in router state land on the standalone record */
    useEffect(() => {
        if (location.state?.viewJobOffer && location.state?.jobOfferObj) {
            navigate(jobOfferDetailsPath(location.state.jobOfferObj.id, JO_FROM.EMPLOYER), { replace: true, state: { jobOfferObj: location.state.jobOfferObj } });
        }
    }, [location.state, navigate]);

    const rows = useMemo(() => {
        const list = Array.isArray(empJobOffers) ? empJobOffers : [];
        const query = search.trim().toLowerCase();
        if (!query) return list;
        return list.filter((row) => matchesSearch(row, query, joStatusLabel(row.status)));
    }, [empJobOffers, search]);

    /* selecting a row opens Job Offer Details (E01 step 6); the tab keeps the listing and New */
    const openJobOffer = useCallback((row) => {
        navigate(jobOfferDetailsPath(row.id, JO_FROM.EMPLOYER), { state: { jobOfferObj: row } });
    }, [navigate]);

    if (searchParams.has(JOB_OFFER_ID_PARAM)) return <CustomSpinner />;

    return (
        <>
            <EmployerJobOfferListing
                rows={ rows }
                isLoading={ jobsRequest.loading }
                error={ jobsRequest.error }
                onRetry={ loadJobOffers }
                search={ search }
                onSearchChange={ setSearch }
                statusValue={ statusFilter }
                statusOptions={ statusOptions }
                onStatusChange={ setStatusFilter }
                onOpenJobOffer={ openJobOffer }
                canOpenRow={ canOpenRow }
                toolbarActions={ canAddJobOffer ? (
                    <Btn variant="primary" onClick={ () => setIsAddNewJobOffer(true) }>
                        <Icon name="plus" size={ 13 } /> { translation('key_new') }
                    </Btn>
                ) : null }
            />
            { isAddNewJobOffer && (
                <Suspense fallback={ null }>
                    <JobOfferAddPanel employer={ currentEmployer } moduleKey="employer" onClose={ () => setIsAddNewJobOffer(false) } />
                </Suspense>
            ) }
        </>
    );
};

EmployerJobOfferTab.propTypes = {
    employerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};

export default React.memo(EmployerJobOfferTab);
