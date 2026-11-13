import React, { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import DataTable from "../../../../../components/ui/DataTable";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import { useConfigurationPermissions } from "../../../../../utils/permissions/configurationPermissionUtils";
import { fetchHolidays } from "../../../../../redux/Slices/settings/holidays/HolidaySlice";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import useSettingsList from "../useSettingsList";
import { buildSortedListPayload } from "../settingsListConfig";
import { DEFAULT_HOLIDAY_FILTERS, HOLIDAY_VIEW_STATE_KEY } from "../settingsNewUiConstants";
import { getHolidayListColumns } from "./holidayListColumns";
import LastRefresh from "../LastRefresh";

const ViewHolidayModal = lazy(() => import("./ViewHolidayModal"));

const selectHolidayList = (state) => ({
    rows: state.holidays.holidays,
    totalPages: state.holidays.totalPages,
    total: state.holidays.totalHolidays,
    lastUpdated: state.holidays.lastUpdated,
});

const editHolidayPath = (row) => `${absoluteRoute(routes.addHoliday)}?id=${encodeURIComponent(row?.id)}`;

const HolidayList = () => {
    const navigate = useNavigate();
    const { permissionList } = useSelector((state) => state.users);
    const { canViewHoliday, canEditHoliday } = useConfigurationPermissions(permissionList);
    const [viewingId, setViewingId] = useState(null);

    const fetchAction = useCallback((payload) => fetchHolidays(payload), []);
    const list = useSettingsList({
        viewStateKey: HOLIDAY_VIEW_STATE_KEY,
        fetchAction,
        selectList: selectHolidayList,
        defaultFilters: DEFAULT_HOLIDAY_FILTERS,
        buildPayload: buildSortedListPayload,
    });

    const openEdit = useCallback((row) => {
        if (canEditHoliday && row?.id != null) navigate(editHolidayPath(row));
    }, [canEditHoliday, navigate]);

    /* Legacy: clicking a row opens the read-only holiday list popup. */
    const openView = useCallback((row) => { if (row?.id != null) setViewingId(row.id); }, []);

    const columns = useMemo(
        () => getHolidayListColumns({ canEdit: Boolean(canEditHoliday), onEdit: openEdit }),
        [canEditHoliday, openEdit]
    );

    const goPrev = useCallback(() => list.setPage(list.pageInfo.currentPage - 1), [list]);
    const goNext = useCallback(() => list.setPage(list.pageInfo.currentPage + 1), [list]);

    if (!canViewHoliday) {
        return <div className={shared.notAuthorized}>{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{headingCase(translation("key_holiday_list"))}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{headingCase(translation("key_holiday_list"))}</h1>
                    <LastRefresh value={list.lastUpdated} />
                </div>
                {canEditHoliday && (
                    <div className={listStyles.pageHeaderActions}>
                        <Btn variant="primary" as={Link} to={absoluteRoute(routes.addHoliday)}>
                            <Icon name="plus" size={14} /> {translation("key_add_holiday_list")}
                        </Btn>
                    </div>
                )}
            </div>

            <DataTable
                columns={columns}
                rows={list.rows}
                rowKey="id"
                isLoading={list.isLoading}
                error={list.error}
                sortBy={list.filters.sort_by}
                sortOrder={list.filters.sort_order}
                pageInfo={list.pageInfo}
                unitLabel={translation("key_holidays").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={list.setSort}
                onRowClick={openView}
                onPrev={goPrev}
                onNext={goNext}
                onLimitChange={list.setLimit}
                onRetry={list.refresh}
            />

            <Suspense fallback={null}>
                {viewingId != null && <ViewHolidayModal holidayListId={viewingId} onClose={() => setViewingId(null)} />}
            </Suspense>
        </div>
    );
};

export default HolidayList;
