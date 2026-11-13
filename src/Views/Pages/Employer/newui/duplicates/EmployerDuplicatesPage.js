import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import { fetchDuplicatesEmployer, fetchDuplicatesJobsCount } from "../../../../../redux/Slices/employer/EmployerSlice";
import { formatHKIDForDisplay, getPermissionValue, isAdminUser } from "../../../../../services/commonService";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import translation from "../../../../../utils/translation";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import styles from "../EmployerDashboard.module.css";
import EmployerDashboardTable from "../EmployerDashboardTable";
import { displayName, employerRowOpenLabel } from "../employerDashboardColumns";
import JoStatusTag from "../../../JobOfferPage/newui/JoStatusTag";
import { getInitials, headingCase } from "../../../../../utils/utils";
import EngagementIcon from "../../../../../components/ui/EngagementIcon";
import { getEngagementKind } from "../../../../../services/commonService";
import { DEFAULT_PAGE_LIMIT } from "../employerNewUiConstants";
import { getEmployerGrants } from "../employerGrants";

const Dash = () => <span className={ listStyles.mutedDash }>—</span>;

const text = (value) => (value ? <span className={ listStyles.typeCell }>{ value }</span> : <Dash />);
const mono = (value) => (value ? <span className={ listStyles.refCell }>{ value }</span> : <Dash />);

const latestContractStatus = (row) => {
    try {
        if (row?.latest_contract && typeof row.latest_contract === 'string') {
            return JSON.parse(row.latest_contract)?.display_status || null;
        }
    } catch {
        return null;
    }
    return null;
};

/* `contactView` (U-0030): the Mobile and Email columns stay; an em dash without Contact Details View. The mobile number
   arrives already masked from the chat service (ClickUp masking ticket, 2026-10-23), so it is shown as given. */
const buildColumns = (contactView) => [
    {
        key: 'name', label: translation('key_employer_name'), minWidth: 190,
        render: (row) => (
            <span className={ styles.nameCell }>
                <EngagementIcon kind={ getEngagementKind(row) } />
                <span className={ styles.nameText }>{ displayName(row) || <Dash /> }</span>
            </span>
        ),
    },
    { key: 'hkid', label: translation('key_hkid'), width: 120, render: (row) => mono(formatHKIDForDisplay(row?.hk_id) || null) },
    /* Mobile/WhatsApp masking (DASH §6–§7, ClickUp masking ticket): /global/get-duplicate-employers returns the number
       masked (`•••• 1234`) for every viewer, superseding the U-0041 recommendation of full numbers here. The phone match
       itself is still made on the full number server-side and is shown in the Duplicate reason column. */
    { key: 'mobile', label: translation('key_mobile'), width: 130, render: (row) => mono(contactView ? row?.mobile_number : null) },
    { key: 'email', label: translation('key_email'), width: 180, render: (row) => text(contactView ? row?.email : null) },
    { key: 'latest_jo', label: translation('key_latest_job_offer'), width: 130, render: (row) => mono(row?.latest_jo) },
    {
        key: 'jo_status', label: translation('key_jo_status'), width: 130,
        render: (row) => (row?.latest_jo_status ? <JoStatusTag status={ row.latest_jo_status } /> : null),
    },
    { key: 'latest_contract', label: translation('key_latest_contract'), width: 130, render: (row) => text(latestContractStatus(row)) },
    {
        key: 'cs', label: translation('key_cs'), width: 130,
        render: (row) => (row?.cs_name ? (
            <span className={ listStyles.staffCell }>
                <span className={ `${ listStyles.csAvatar } ${ listStyles.hueAzure }` } aria-hidden="true">{ getInitials(row.cs_name) }</span>
                <span className={ listStyles.staffName }>{ row.cs_name }</span>
            </span>
        ) : null),
    },
    {
        key: 'reason', label: translation('key_duplicate_reason'), minWidth: 160,
        render: (row) => (row?.matched_columns ? <span className={ styles.reasonCell }>{ row.matched_columns }</span> : <Dash />),
    },
];

const EmployerDuplicatesPage = () => {
    const { user_id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const {
        duplicateEmployers, currentPage, totalPages, totalEmployers, perPage, duplicateJobsCount, employerIDs,
    } = useSelector((state) => state.employer);
    const { permissionList } = useSelector((state) => state.users);

    const isAdmin = useMemo(() => isAdminUser(), []);
    /* PERM §9.2: Global Screen only hides the navigation entry; this page is reached by a cross-link from the record */
    const canAccess = isAdmin || getPermissionValue(permissionList?.data, 'employer', 'employer_access') === 'y';
    const grants = useMemo(() => getEmployerGrants(permissionList), [permissionList]);

    const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const load = useCallback((page, pageLimit = limit) => {
        setIsLoading(true);
        setLoadError(false);
        dispatch(fetchDuplicatesEmployer({ page, limit: pageLimit, user_id }))
            .unwrap()
            .catch((err) => {
                setLoadError(true);
                const message = err?.data?.data?.message;
                if (message) ShowToast('error', message);
            })
            .finally(() => setIsLoading(false));
    }, [dispatch, user_id, limit]);

    useEffect(() => { load(1, DEFAULT_PAGE_LIMIT); }, [dispatch, user_id]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (employerIDs?.length) dispatch(fetchDuplicatesJobsCount({ employer_id: employerIDs }));
    }, [dispatch, employerIDs]);

    const columns = useMemo(
        () => buildColumns(grants.contactView),
        [grants.contactView]
    );
    const rows = useMemo(() => (Array.isArray(duplicateEmployers) ? duplicateEmployers : []), [duplicateEmployers]);

    const pageInfo = useMemo(() => {
        const total = Number(totalEmployers) || 0;
        const page = parseInt(currentPage) || 1;
        const size = Number(perPage) || limit;
        return {
            from: total ? (page - 1) * size + 1 : 0,
            to: total ? Math.min(page * size, total) : 0,
            total,
            currentPage: page,
            lastPage: Math.max(Number(totalPages) || 1, 1),
            limit,
        };
    }, [totalEmployers, currentPage, totalPages, perPage, limit]);

    const openEmployer = useCallback((row) => {
        const id = row?.employer_id ?? row?.id;
        if (id) navigate(routes.employerDetails.replace(':employer_id', id));
    }, [navigate]);

    const onLimitChange = useCallback((next) => {
        setLimit(next);
        load(1, next);
    }, [load]);

    if (!canAccess) {
        return <div className="text-danger text-center py-4">{ translation('key_you_are_not_authorized_to_access_this_page') }</div>;
    }

    return (
        <div className={ listStyles.pageWrap }>
            <div className={ listStyles.pageHeader }>
                <div className={ `${ listStyles.pageHeaderBody } ${ styles.dupHeader }` }>
                    <button type="button" className={ styles.backBtn } aria-label={ translation('key_back') } onClick={ () => navigate(-1) }>
                        <Icon name="chev_left" size={ 16 } />
                    </button>
                    <h1 className={ listStyles.pageTitle }>{ headingCase(translation('key_view_duplicate_employers')) }</h1>
                </div>
                { duplicateJobsCount > 0 && (
                    <div className={ listStyles.pageHeaderActions }>
                        <Btn variant="secondary" onClick={ () => navigate(routes.jobOffersDuplicate) }>
                            <Icon name="alert" size={ 13 } />
                            { `${ translation('key_we_have_found') } ${ duplicateJobsCount } ${ translation('key_potential_duplicate') }${ duplicateJobsCount === 1 ? '' : 's' } ${ translation('key_of_this_employer') }` }
                        </Btn>
                    </div>
                ) }
            </div>

            <EmployerDashboardTable
                columns={ columns }
                rows={ rows }
                isLoading={ isLoading }
                error={ loadError }
                sortBy=""
                sortOrder=""
                pageInfo={ pageInfo }
                onSort={ () => {} }
                onRowClick={ openEmployer }
                rowOpenLabel={ employerRowOpenLabel }
                onPrev={ () => load(pageInfo.currentPage - 1) }
                onNext={ () => load(pageInfo.currentPage + 1) }
                onLimitChange={ onLimitChange }
                emptyText={ translation('key_no_records_found') }
                onRetry={ () => load(pageInfo.currentPage) }
            />
        </div>
    );
};

export default EmployerDuplicatesPage;
