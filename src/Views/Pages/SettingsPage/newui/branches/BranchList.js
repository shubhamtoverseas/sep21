import React, { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import DataTable from "../../../../../components/ui/DataTable";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase, toTitleCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import { useSettingsPermissions } from "../../../../../utils/permissions/settingsPermissionsUtils";
import { fetchBranches } from "../../../../../redux/Slices/settings/branches/BranchesSlice";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import useSettingsList from "../useSettingsList";
import SettingsListFilters from "../SettingsListFilters";
import { BRANCH_VIEW_STATE_KEY } from "../settingsNewUiConstants";
import { getBranchListColumns } from "./branchListColumns";
import LastRefresh from "../LastRefresh";

const selectBranchList = (state) => ({
    byId: state.branches.branches,
    order: state.branches.branchesOrder,
    totalPages: state.branches.totalPages,
    total: state.branches.totalBranches,
    lastUpdated: state.branches.lastUpdated,
});

const addBranchPath = () => `/${routes.addBranch}`;
const editBranchPath = (row) => `/${routes.addBranch}?id=${encodeURIComponent(row?.id)}`;

const BranchList = () => {
    const navigate = useNavigate();
    const { permissionList } = useSelector((state) => state.users);
    const { canEditBranch, canViewBranch } = useSettingsPermissions(permissionList);

    const fetchAction = useCallback((payload) => fetchBranches(payload), []);
    const list = useSettingsList({ viewStateKey: BRANCH_VIEW_STATE_KEY, fetchAction, selectList: selectBranchList });

    const openEdit = useCallback((row) => {
        if (canEditBranch && row?.id != null) navigate(editBranchPath(row));
    }, [canEditBranch, navigate]);

    const columns = useMemo(
        () => getBranchListColumns({ canEdit: Boolean(canEditBranch), onEdit: openEdit }),
        [canEditBranch, openEdit]
    );

    const goPrev = useCallback(() => list.setPage(list.pageInfo.currentPage - 1), [list]);
    const goNext = useCallback(() => list.setPage(list.pageInfo.currentPage + 1), [list]);

    if (!canViewBranch) {
        return <div className={shared.notAuthorized}>{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{toTitleCase(translation("key_branches"))}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{toTitleCase(translation("key_branches"))}</h1>
                    <LastRefresh value={list.lastUpdated} />
                </div>
                {canEditBranch && (
                    <div className={listStyles.pageHeaderActions}>
                        <Btn variant="primary" as={Link} to={addBranchPath()}>
                            <Icon name="plus" size={14} /> {translation("key_add_branch")}
                        </Btn>
                    </div>
                )}
            </div>

            <SettingsListFilters
                id="branch"
                filters={list.filters}
                searchInput={list.searchInput}
                isFiltered={list.isFiltered}
                onSearchChange={list.onSearchChange}
                onFilterChange={list.setFilter}
                onClear={list.clearFilters}
            />

            <DataTable
                columns={columns}
                rows={list.rows}
                rowKey="id"
                isLoading={list.isLoading}
                error={list.error}
                sortBy={list.filters.sort_by}
                sortOrder={list.filters.sort_order}
                pageInfo={list.pageInfo}
                unitLabel={translation("key_branches").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={list.setSort}
                onRowClick={canEditBranch ? openEdit : undefined}
                onPrev={goPrev}
                onNext={goNext}
                onLimitChange={list.setLimit}
                onRetry={list.refresh}
            />
        </div>
    );
};

export default BranchList;
