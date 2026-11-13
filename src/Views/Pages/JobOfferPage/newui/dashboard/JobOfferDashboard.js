import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { COLUMN_VIEW_STATE_KEYS } from "../../../../../components/ReusableComponents/constants";
import { getPermissionValue, isAdminUser, loadColumnKeys, saveColumnKeys } from "../../../../../services/commonService";
import { getJobOfferPermissions } from "../../../../../utils/permissions/jobPermissionsUtils";
import { headingCase } from "../../../../../utils/utils";
import translation from "../../../../../utils/translation";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import empStyles from "../../../Employer/newui/EmployerDashboard.module.css";
import styles from "./JobOfferDashboard.module.css";
import useJobOfferDashboard from "./useJobOfferDashboard";
import useJobOfferFilterOptions from "./useJobOfferFilterOptions";
import JobOfferStatusCards from "./JobOfferStatusCards";
import JobOfferDashboardFilters from "./JobOfferDashboardFilters";
import JobOfferDashboardTable from "./JobOfferDashboardTable";
import { getJobOfferDashboardColumns, JO_DASH_COLUMN_LABELS, jobOfferRowOpenLabel } from "./jobOfferDashboardColumns";
import { isMacauLocation } from "./jobOfferDashboardConfig";
import { JO_DASH_COLUMN_ORDER, JO_DASH_COPY, JO_DASH_MANDATORY_COLUMNS, JO_FROM, JO_SEARCH_ACCESS, jobOfferDetailsPath } from "../../jobOfferConstants";

const NewEmployerModal = lazy(() => import("../../../Employer/newui/NewEmployerModal"));
const JobOfferAddPanel = lazy(() => import("../editor/JobOfferAddPanel"));
const JoCsRequestDialog = lazy(() => import("./JoCsRequestDialog"));

const JobOfferDashboard = () => {
    const navigate = useNavigate();
    const { permissionList, ownerOnboardingList } = useSelector((state) => state.users);
    const isAdmin = useMemo(() => isAdminUser(), []);
    const canAdd = isAdmin || getPermissionValue(permissionList?.data, 'jo', 'jo_add') === 'y';
    const { searchAccess } = getJobOfferPermissions(permissionList, ownerOnboardingList, null);
    const searchEnabled = searchAccess !== JO_SEARCH_ACCESS.NONE && searchAccess !== JO_SEARCH_ACCESS.OFF;
    const isRestricted = searchAccess === JO_SEARCH_ACCESS.RESTRICTED;
    const canChooseColumns = isAdmin || getPermissionValue(permissionList?.data, 'jo', 'jo_select_fields_to_display') === 'y';

    const dashboard = useJobOfferDashboard({ searchEnabled, restricted: isRestricted });
    const options = useJobOfferFilterOptions(dashboard.filters.location);

    /* U-0252: without Select Fields to Display the listing is the fixed system set — saved preferences are not read */
    const [columnKeys, setColumnKeys] = useState(() => (canChooseColumns ? loadColumnKeys(COLUMN_VIEW_STATE_KEYS.jobOffers, JO_DASH_COLUMN_ORDER, JO_DASH_COLUMN_ORDER, JO_DASH_MANDATORY_COLUMNS) : [...JO_DASH_COLUMN_ORDER]));
    const toggleColumn = useCallback((key) => {
        setColumnKeys((prev) => {
            const next = prev.includes(key) ? prev.filter((k) => k !== key) : JO_DASH_COLUMN_ORDER.filter((k) => prev.includes(k) || k === key);
            saveColumnKeys(COLUMN_VIEW_STATE_KEYS.jobOffers, next);
            return next;
        });
    }, []);

    const [isAddEmployer, setIsAddEmployer] = useState(false);
    const [isAddJobOffer, setIsAddJobOffer] = useState(false);
    const [savedEmployer, setSavedEmployer] = useState({});
    const continueWithEmployer = useCallback((employer) => {
        if (!employer) { setIsAddEmployer(false); return; }
        setSavedEmployer(employer);
        setIsAddEmployer(false);
        setIsAddJobOffer(true);
    }, []);
    const [csRequestRow, setCsRequestRow] = useState(null);

    const openJobOffer = useCallback((row) => {
        const { canViewDetails } = getJobOfferPermissions(permissionList, ownerOnboardingList, row?.employer_id, typeof row?.is_owner === 'boolean' ? row.is_owner : undefined);
        if (!canViewDetails) { ShowToast('error', `${ JO_DASH_COPY.deniedTitle } — ${ JO_DASH_COPY.deniedText }`); return; }
        dashboard.rememberOpenedRow(row.id);
        navigate(jobOfferDetailsPath(row.id, JO_FROM.DASHBOARD), { state: { jobOfferObj: row } });
    }, [permissionList, ownerOnboardingList, dashboard, navigate]);

    const restored = useRef(false);
    useEffect(() => {
        if (restored.current || dashboard.isLoading || dashboard.rows.length === 0) return;
        restored.current = true;
        const { rowId, scrollY } = dashboard.takeReturnRow();
        if (!rowId) return;
        window.scrollTo({ top: Number(scrollY) || 0 });
        const rowEl = document.querySelector(`[data-row-open="${ rowId }"]`);
        if (rowEl instanceof HTMLElement) { rowEl.classList.add(styles.rowReturned); rowEl.focus({ preventScroll: true }); }
    }, [dashboard]);

    const isMacau = isMacauLocation(dashboard.filters.location);
    const columns = useMemo(
        () => getJobOfferDashboardColumns({ branchesById: options.branchesById, onCsRequest: setCsRequestRow, isMacau }).filter((c) => columnKeys.includes(c.key)),
        [options.branchesById, columnKeys, isMacau]
    );
    const columnLabels = useMemo(() => JO_DASH_COLUMN_LABELS(), []);
    const csFilter = useMemo(() => (options.showCsFilter ? { options: options.csOptions, value: dashboard.filters.cs_owner_id, onChange: (value) => dashboard.setFilter('cs_owner_id', value) } : null), [options.showCsFilter, options.csOptions, dashboard]);
    const activeStatusId = dashboard.filters.status.length === 1 ? dashboard.filters.status[0] : null;

    const goPrev = useCallback(() => dashboard.setPage(dashboard.pageInfo.currentPage - 1), [dashboard]);
    const goNext = useCallback(() => dashboard.setPage(dashboard.pageInfo.currentPage + 1), [dashboard]);
    const closeCsRequest = useCallback(() => setCsRequestRow(null), []);
    const refreshAfterCsRequest = useCallback(() => { setCsRequestRow(null); dashboard.refresh(); }, [dashboard]);

    return (
        <div className={ `${ listStyles.pageWrap } ${ empStyles.pageWrapEmd } ${ styles.page }` }>
            <div className={ `${ listStyles.pageHeader } ${ empStyles.pageHead }` }>
                <div className={ listStyles.pageHeaderBody }>
                    <h1 className={ empStyles.title }>{ headingCase(JO_DASH_COPY.title) }</h1>
                    { dashboard.lastUpdated && (
                        <p className={ `${ listStyles.pageSubtitle } ${ empStyles.lastRefresh }` }>
                            { JO_DASH_COPY.lastRefresh } <b>{ dayjs(dashboard.lastUpdated).isValid() ? dayjs(dashboard.lastUpdated).format('HH:mm') : dashboard.lastUpdated }</b>
                        </p>
                    ) }
                </div>
                { /* Add New Job Offer unchecked → the button is hidden (PERM §4.10) */ }
                { canAdd && (
                    <div className={ listStyles.pageHeaderActions }>
                        <Btn variant="primary" onClick={ () => setIsAddEmployer(true) }>
                            <Icon name="plus" size={ 16 } strokeWidth={ 1.6 } /> { JO_DASH_COPY.newJobOffer }
                        </Btn>
                    </div>
                ) }
            </div>

            <JobOfferStatusCards activeStatusId={ activeStatusId } counts={ dashboard.statusCounts } allowedStatusIds={ options.allowedStatusIds } isAdmin={ isAdmin } onToggle={ dashboard.toggleStatusCard } />

            <JobOfferDashboardFilters
                filters={ dashboard.filters }
                searchInput={ dashboard.searchInput }
                searchEnabled={ searchEnabled }
                searchDisabledTitle={ JO_DASH_COPY.searchDisabledTitle }
                isFiltered={ dashboard.isFiltered }
                options={ options }
                columnKeys={ columnKeys }
                columnLabels={ columnLabels }
                showColumns={ canChooseColumns }
                onSearchChange={ dashboard.onSearchChange }
                onFilterChange={ dashboard.setFilter }
                onSortChange={ dashboard.setSortKey }
                onCustomRange={ dashboard.setCustomCreatedRange }
                onClear={ dashboard.clearFilters }
                onToggleColumn={ toggleColumn }
            />

            <JobOfferDashboardTable
                columns={ columns }
                rows={ dashboard.rows }
                isLoading={ dashboard.isLoading }
                error={ dashboard.error }
                sortBy={ dashboard.filters.sort_by }
                sortOrder={ dashboard.filters.sort_order }
                pageInfo={ dashboard.pageInfo }
                csFilter={ csFilter }
                onSort={ dashboard.toggleSort }
                onRowClick={ openJobOffer }
                rowOpenLabel={ jobOfferRowOpenLabel }
                onPrev={ goPrev }
                onNext={ goNext }
                onRetry={ dashboard.refresh }
            />

            <Suspense fallback={ null }>
                { isAddEmployer && (
                    <NewEmployerModal
                        onClose={ () => setIsAddEmployer(false) }
                        onAdded={ continueWithEmployer }
                        onOpenEmployer={ continueWithEmployer }
                        matchLabel={ translation('key_select') }
                    />
                ) }
                { isAddJobOffer && (
                    <JobOfferAddPanel employer={ savedEmployer } moduleKey="jo" onClose={ () => setIsAddJobOffer(false) } onSaved={ dashboard.refresh } />
                ) }
                { csRequestRow && (
                    <JoCsRequestDialog requestedCsObj={ csRequestRow } onClose={ closeCsRequest } onRefreshList={ refreshAfterCsRequest } />
                ) }
            </Suspense>
        </div>
    );
};

export default JobOfferDashboard;
