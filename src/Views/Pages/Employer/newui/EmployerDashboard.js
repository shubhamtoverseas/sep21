import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../components/ui/Btn";
import Icon from "../../../../components/Icon/Icon";
import { getPermissionValue, isAdminUser } from "../../../../services/commonService";
import translation from "../../../../utils/translation";
import { headingCase } from "../../../../utils/utils";
import routes from "../../routes/routesConfig";
import listStyles from "../../Invoice/InvoiceList.module.css";
import styles from "./EmployerDashboard.module.css";
import useEmployerDashboard from "./useEmployerDashboard";
import useEmployerFilterOptions from "./useEmployerFilterOptions";
import { getEmployerDashboardColumns, displayName, employerCode, employerRowOpenLabel } from "./employerDashboardColumns";
import EmployerDashboardFilters from "./EmployerDashboardFilters";
import EmployerDashboardTable from "./EmployerDashboardTable";
import { ADDED_TOAST_MS, EMPLOYER_SEARCH_ACCESS, EMPLOYER_SEARCH_COPY, EMPLOYER_RETURN_STATE_KEY } from "./employerNewUiConstants";
import { getEmployerGrants } from "./employerGrants";
import { buildDistrictOptions, isMacauOnlyLocation } from "./employerDashboardConfig";

/* SR-05: the opened row and scroll offset survive the record visit; focus returns to the ROW */
const saveReturnState = (rowId) => {
    try { sessionStorage.setItem(EMPLOYER_RETURN_STATE_KEY, JSON.stringify({ rowId: String(rowId), scrollY: window.scrollY })); } catch { /* storage unavailable */ }
};
const takeReturnState = () => {
    try {
        const raw = sessionStorage.getItem(EMPLOYER_RETURN_STATE_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(EMPLOYER_RETURN_STATE_KEY);
        return JSON.parse(raw);
    } catch { return null; }
};

const NewEmployerModal = lazy(() => import("./NewEmployerModal"));

const employerDetailsPath = (row) => routes.employerDetails.replace(":employer_id", row?.employer_id ?? row?.id);

const AddedToast = ({ employer, onView, onClose }) => (
    <div className={styles.addedToast} role="status">
        <span className={styles.addedToastIcon}><Icon name="check" size={13} strokeWidth={2.6} /></span>
        <span>
            {translation("key_employer_added_toast")} <b>{displayName(employer)}</b>
            {employerCode(employer) && <> <span className={styles.addedToastCode}>{employerCode(employer)}</span></>}
        </span>
        <span className={styles.addedToastSep} />
        <button type="button" className={styles.addedToastLink} onClick={onView}>{translation("key_view_employer")}</button>
        <button type="button" className={styles.addedToastClose} onClick={onClose} aria-label={translation("key_close")}>
            <Icon name="x" size={12} />
        </button>
    </div>
);

AddedToast.propTypes = {
    employer: PropTypes.object.isRequired,
    onView: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

const EmployerDashboard = () => {
    const navigate = useNavigate();
    const { permissionList } = useSelector((state) => state.users);
    const isAdmin = useMemo(() => isAdminUser(), []);
    const canAccess = useMemo(
        () => isAdmin || (getPermissionValue(permissionList?.data, "employer", "employer_access") === "y"
            && getPermissionValue(permissionList?.data, "employer", "employer_global_list") === "y"),
        [permissionList, isAdmin]
    );
    const canAdd = useMemo(
        () => isAdmin || getPermissionValue(permissionList?.data, "employer", "employer_add") === "y",
        [permissionList, isAdmin]
    );

    /* Employer Dashboard access alone does not grant search (DASH §7.1); contact columns follow Employer Contact Details — View */
    const grants = useMemo(() => getEmployerGrants(permissionList), [permissionList]);
    const searchEnabled = grants.searchAccess !== EMPLOYER_SEARCH_ACCESS.NONE && grants.searchAccess !== EMPLOYER_SEARCH_ACCESS.OFF;
    const isRestricted = grants.searchAccess === EMPLOYER_SEARCH_ACCESS.RESTRICTED;

    const dashboard = useEmployerDashboard({ searchEnabled, restricted: isRestricted });
    const referenceOptions = useEmployerFilterOptions(dashboard.filters.location, grants.accessLocations);

    /* DASH §3 exposure: District from the displayed rows; Location only when the actor's Access (Location) covers more than
       one location (audit L4); Branch only with Hong Kong branches to offer and never while the Location selection is Macau */
    const options = useMemo(() => {
        const allOption = referenceOptions.locationOptions[0];
        const districtRows = buildDistrictOptions(dashboard.rows, allOption);
        /* an applied District the rows no longer expose (empty result) still offers All, so it can be cleared */
        const districtOptions = districtRows.length || !dashboard.filters.district.length ? districtRows : [allOption];
        return {
            ...referenceOptions,
            districtOptions,
            showDistrict: districtOptions.length > 0 || dashboard.filters.district.length > 0,
            showLocation: referenceOptions.locationOptions.length > 2,
            showBranch: referenceOptions.branchOptions.length > 1 && !isMacauOnlyLocation(dashboard.filters.location),
        };
    }, [referenceOptions, dashboard.rows, dashboard.filters.district, dashboard.filters.location]);
    /* U-0419 (29 Oct, SPLIT): a remembered District is validated against the derived options — one the displayed rows do not
       expose is dropped instead of filtering invisibly (the empty-result case keeps the All fallback above) */
    useEffect(() => {
        if (dashboard.isLoading || !dashboard.filters.district.length) return;
        const offered = new Set(options.districtOptions.map((o) => String(o.value)).filter(Boolean));
        if (!offered.size) return;
        const kept = dashboard.filters.district.filter((d) => offered.has(String(d)));
        if (kept.length !== dashboard.filters.district.length) dashboard.setFilter("district", kept);
    }, [dashboard, options.districtOptions]);

    const [isNewEmployerOpen, setIsNewEmployerOpen] = useState(false);
    const [addedEmployer, setAddedEmployer] = useState(null);

    useEffect(() => {
        if (!addedEmployer) return undefined;
        const timer = setTimeout(() => setAddedEmployer(null), ADDED_TOAST_MS);
        return () => clearTimeout(timer);
    }, [addedEmployer]);

    const openEmployer = useCallback((row) => {
        const id = row?.employer_id ?? row?.id;
        if (!id) return;
        saveReturnState(id);
        navigate(employerDetailsPath(row));
    }, [navigate]);

    const returnState = useRef(takeReturnState());
    useEffect(() => {
        const state = returnState.current;
        if (!state || dashboard.isLoading || dashboard.rows.length === 0) return;
        returnState.current = null;
        window.scrollTo({ top: Number(state.scrollY) || 0 });
        const rowEl = document.querySelector(`[data-row-open="${ state.rowId }"]`);
        if (rowEl instanceof HTMLElement) rowEl.focus({ preventScroll: true });
    }, [dashboard.isLoading, dashboard.rows]);

    const handleAdded = useCallback((employer) => {
        setIsNewEmployerOpen(false);
        setAddedEmployer(employer || null);
        dashboard.refresh();
    }, [dashboard]);


    const columns = useMemo(
        () => getEmployerDashboardColumns({ branchesById: options.branchesById, contactView: grants.contactView }),
        [options.branchesById, grants.contactView]
    );

    const goPrev = useCallback(() => dashboard.setPage(dashboard.pageInfo.currentPage - 1), [dashboard]);
    const goNext = useCallback(() => dashboard.setPage(dashboard.pageInfo.currentPage + 1), [dashboard]);

    if (!canAccess) {
        return <div className="text-danger text-center py-4">{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={`${listStyles.pageWrap} ${styles.pageWrapEmd}`}>
            <div className={`${listStyles.pageHeader} ${styles.pageHead}`}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={styles.title}>{headingCase(translation("key_employers"))}</h1>
                    {dashboard.lastUpdated && (
                        <p className={`${listStyles.pageSubtitle} ${styles.lastRefresh}`}>
                            {translation("key_last_refresh")} <b>{dayjs(dashboard.lastUpdated).isValid() ? dayjs(dashboard.lastUpdated).format("DD/MM/YYYY · HH:mm") : dashboard.lastUpdated}</b>
                        </p>
                    )}
                </div>
                {canAdd && (
                    <div className={listStyles.pageHeaderActions}>
                        <Btn variant="primary" onClick={() => setIsNewEmployerOpen(true)}>
                            <Icon name="plus" size={14} /> {translation("key_new_employer")}
                        </Btn>
                    </div>
                )}
            </div>

            <EmployerDashboardFilters
                filters={dashboard.filters}
                searchInput={dashboard.searchInput}
                formatError={dashboard.formatError}
                searchEnabled={searchEnabled}
                searchDisabledTitle={EMPLOYER_SEARCH_COPY.disabledTitle}
                isFiltered={dashboard.isFiltered}
                options={options}
                onSearchChange={dashboard.onSearchChange}
                onFilterChange={dashboard.setFilter}
                onCustomRange={dashboard.setCustomCreatedRange}
                onClear={dashboard.clearFilters}
            />

            <EmployerDashboardTable
                columns={columns}
                rows={dashboard.rows}
                isLoading={dashboard.isLoading}
                error={dashboard.error}
                sortBy={dashboard.filters.sort_by}
                sortOrder={dashboard.filters.sort_order}
                pageInfo={dashboard.pageInfo}
                onSort={dashboard.setSort}
                onRowClick={openEmployer}
                rowOpenLabel={employerRowOpenLabel}
                onPrev={goPrev}
                onNext={goNext}
                onLimitChange={dashboard.setLimit}
                hidePerPage={isRestricted}
                footNote={dashboard.pageInfo.tooMany ? EMPLOYER_SEARCH_COPY.tooMany : ""}
                onRetry={dashboard.refresh}
            />

            <Suspense fallback={null}>
                {isNewEmployerOpen && (
                    <NewEmployerModal
                        onClose={() => setIsNewEmployerOpen(false)}
                        onAdded={handleAdded}
                        onOpenEmployer={openEmployer}
                    />
                )}
            </Suspense>

            {addedEmployer && (
                <AddedToast
                    employer={addedEmployer}
                    onView={() => openEmployer(addedEmployer)}
                    onClose={() => setAddedEmployer(null)}
                />
            )}
        </div>
    );
};

export default EmployerDashboard;
