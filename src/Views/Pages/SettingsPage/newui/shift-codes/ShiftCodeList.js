import React, { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import DataTable from "../../../../../components/ui/DataTable";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase, toTitleCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import { useShiftManagementPermissions } from "../../../../../utils/permissions/shiftManagementPermissionUtils";
import { fetchShiftCodes } from "../../../../../redux/Slices/settings/shift-code/ShiftCodeSlice";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import useSettingsList from "../useSettingsList";
import { buildSortedListPayload } from "../settingsListConfig";
import { DEFAULT_SHIFT_CODE_FILTERS, SHIFT_CODE_VIEW_STATE_KEY } from "../settingsNewUiConstants";
import { getShiftCodeListColumns } from "./shiftCodeListColumns";
import LastRefresh from "../LastRefresh";

const EditShiftCodeModal = lazy(() => import("./EditShiftCodeModal"));

const selectShiftCodeList = (state) => ({
    byId: state.shiftCodes.shiftCodes,
    order: state.shiftCodes.shiftCodesOrder,
    totalPages: state.shiftCodes.totalPages,
    total: state.shiftCodes.totalShiftCodes,
    lastUpdated: state.shiftCodes.lastUpdated,
});

const ShiftCodeList = () => {
    const { permissionList } = useSelector((state) => state.users);
    const { canViewShiftCode, canEditShiftCode, canImportShiftCode, canViewShiftRoster } = useShiftManagementPermissions(permissionList);
    const [editing, setEditing] = useState(null);

    const fetchAction = useCallback((payload) => fetchShiftCodes(payload), []);
    const list = useSettingsList({
        viewStateKey: SHIFT_CODE_VIEW_STATE_KEY,
        fetchAction,
        selectList: selectShiftCodeList,
        defaultFilters: DEFAULT_SHIFT_CODE_FILTERS,
        buildPayload: buildSortedListPayload,
    });

    const openEdit = useCallback((row) => { if (canEditShiftCode && row) setEditing(row); }, [canEditShiftCode]);

    const closeEdit = useCallback(({ isRefreshList } = {}) => {
        setEditing(null);
        if (isRefreshList) list.refresh();
    }, [list]);

    const columns = useMemo(
        () => getShiftCodeListColumns({ canEdit: Boolean(canEditShiftCode), onEdit: openEdit }),
        [canEditShiftCode, openEdit]
    );

    const goPrev = useCallback(() => list.setPage(list.pageInfo.currentPage - 1), [list]);
    const goNext = useCallback(() => list.setPage(list.pageInfo.currentPage + 1), [list]);

    if (!canViewShiftCode) {
        return <div className={shared.notAuthorized}>{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{toTitleCase(translation("key_shift_codes"))}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{toTitleCase(translation("key_shift_codes"))}</h1>
                    <LastRefresh value={list.lastUpdated} />
                </div>
                <div className={listStyles.pageHeaderActions}>
                    {canViewShiftRoster && (
                        <Btn variant="secondary" as={Link} to={absoluteRoute(routes.rosterViewer)}>
                            <Icon name="calendar" size={14} /> {translation("key_roster_viewer")}
                        </Btn>
                    )}
                    {canImportShiftCode && (
                        <Btn variant="secondary" as={Link} to={absoluteRoute(routes.importShiftRoster)}>
                            <Icon name="upload" size={14} /> {translation("key_import_shift_roster")}
                        </Btn>
                    )}
                    {canEditShiftCode && (
                        <Btn variant="primary" as={Link} to={absoluteRoute(routes.addShiftCode)}>
                            <Icon name="plus" size={14} /> {toTitleCase(translation("key_add_shift_codes"))}
                        </Btn>
                    )}
                </div>
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
                unitLabel={translation("key_shift_codes").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={list.setSort}
                onRowClick={canEditShiftCode ? openEdit : undefined}
                onPrev={goPrev}
                onNext={goNext}
                onLimitChange={list.setLimit}
                onRetry={list.refresh}
            />

            <Suspense fallback={null}>
                {editing && <EditShiftCodeModal shiftCode={editing} onClose={closeEdit} />}
            </Suspense>
        </div>
    );
};

export default ShiftCodeList;
