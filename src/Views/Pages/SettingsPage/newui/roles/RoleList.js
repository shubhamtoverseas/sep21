import React, { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import DataTable from "../../../../../components/ui/DataTable";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase, toTitleCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import { useUserPermissions } from "../../../../../utils/permissions/userPermissionsUtils";
import { fetchRoles } from "../../../../../redux/Slices/settings/roles/RolesSlice";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import useSettingsList from "../useSettingsList";
import SettingsListFilters from "../SettingsListFilters";
import { ROLE_VIEW_STATE_KEY } from "../settingsNewUiConstants";
import { getRoleListColumns } from "./roleListColumns";
import LastRefresh from "../LastRefresh";

const selectRoleList = (state) => ({
    byId: state.roles.roles,
    order: state.roles.rolesOrder,
    totalPages: state.roles.totalPages,
    total: state.roles.totalRoles,
    lastUpdated: state.roles.lastUpdated,
});

const addRolePath = () => `/${routes.addRole}`;
const editRolePath = (row) => `/${routes.addRole}?id=${encodeURIComponent(row?.id)}`;

const RoleList = () => {
    const navigate = useNavigate();
    const { permissionList } = useSelector((state) => state.users);
    const { canViewRole, canEditRole } = useUserPermissions(permissionList);

    const fetchAction = useCallback((payload) => fetchRoles(payload), []);
    const list = useSettingsList({ viewStateKey: ROLE_VIEW_STATE_KEY, fetchAction, selectList: selectRoleList });

    const openEdit = useCallback((row) => {
        if (canEditRole && row?.id != null) navigate(editRolePath(row));
    }, [canEditRole, navigate]);

    const columns = useMemo(
        () => getRoleListColumns({ canEdit: Boolean(canEditRole), onEdit: openEdit }),
        [canEditRole, openEdit]
    );

    const goPrev = useCallback(() => list.setPage(list.pageInfo.currentPage - 1), [list]);
    const goNext = useCallback(() => list.setPage(list.pageInfo.currentPage + 1), [list]);

    if (!canViewRole) {
        return <div className={shared.notAuthorized}>{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{toTitleCase(translation("key_roles"))}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{toTitleCase(translation("key_roles"))}</h1>
                    <LastRefresh value={list.lastUpdated} />
                </div>
                {canEditRole && (
                    <div className={listStyles.pageHeaderActions}>
                        <Btn variant="primary" as={Link} to={addRolePath()}>
                            <Icon name="plus" size={14} /> {toTitleCase(translation("key_add_role"))}
                        </Btn>
                    </div>
                )}
            </div>

            <SettingsListFilters
                id="role"
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
                unitLabel={translation("key_roles").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={list.setSort}
                onRowClick={canEditRole ? openEdit : undefined}
                onPrev={goPrev}
                onNext={goNext}
                onLimitChange={list.setLimit}
                onRetry={list.refresh}
            />
        </div>
    );
};

export default RoleList;
