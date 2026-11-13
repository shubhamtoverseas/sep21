import React, { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import DataTable from "../../../../../components/ui/DataTable";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase, toTitleCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import { useConfigurationPermissions } from "../../../../../utils/permissions/configurationPermissionUtils";
import { fetchDoops } from "../../../../../redux/Slices/settings/doops/DoopSlice";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import useSettingsList from "../useSettingsList";
import { buildSortedListPayload } from "../settingsListConfig";
import { DEFAULT_DOOP_FILTERS, DOOP_VIEW_STATE_KEY } from "../settingsNewUiConstants";
import { getDoopListColumns } from "./doopListColumns";
import LastRefresh from "../LastRefresh";

const selectDoopList = (state) => ({
    byId: state.doops.doops,
    order: state.doops.doopsOrder,
    totalPages: state.doops.totalPages,
    total: state.doops.totalDoops,
    lastUpdated: state.doops.lastUpdated,
});

const editDoopPath = (row) => `${absoluteRoute(routes.addDaysOfOperation)}?id=${encodeURIComponent(row?.id)}`;

const DoopList = () => {
    const navigate = useNavigate();
    const { permissionList } = useSelector((state) => state.users);
    const { canViewDoop, canEditDoop } = useConfigurationPermissions(permissionList);

    const fetchAction = useCallback((payload) => fetchDoops(payload), []);
    const list = useSettingsList({
        viewStateKey: DOOP_VIEW_STATE_KEY,
        fetchAction,
        selectList: selectDoopList,
        defaultFilters: DEFAULT_DOOP_FILTERS,
        buildPayload: buildSortedListPayload,
    });

    const openEdit = useCallback((row) => {
        if (canEditDoop && row?.id != null) navigate(editDoopPath(row));
    }, [canEditDoop, navigate]);

    const columns = useMemo(
        () => getDoopListColumns({ canEdit: Boolean(canEditDoop), onEdit: openEdit }),
        [canEditDoop, openEdit]
    );

    const goPrev = useCallback(() => list.setPage(list.pageInfo.currentPage - 1), [list]);
    const goNext = useCallback(() => list.setPage(list.pageInfo.currentPage + 1), [list]);

    if (!canViewDoop) {
        return <div className={shared.notAuthorized}>{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{toTitleCase(translation("key_days_of_operation"))}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{toTitleCase(translation("key_days_of_operation"))}</h1>
                    <LastRefresh value={list.lastUpdated} />
                </div>
                {canEditDoop && (
                    <div className={listStyles.pageHeaderActions}>
                        <Btn variant="primary" as={Link} to={absoluteRoute(routes.addDaysOfOperation)}>
                            <Icon name="plus" size={14} /> {toTitleCase(translation("key_add_days_of_operation"))}
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
                unitLabel={translation("key_doop").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={list.setSort}
                onRowClick={canEditDoop ? openEdit : undefined}
                onPrev={goPrev}
                onNext={goNext}
                onLimitChange={list.setLimit}
                onRetry={list.refresh}
            />
        </div>
    );
};

export default DoopList;
