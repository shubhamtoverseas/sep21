import React, { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import DataTable from "../../../../../components/ui/DataTable";
import FilterSelect from "../../../../../components/ui/FilterSelect";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import routes from "../../../routes/routesConfig";
import { useUserPermissions } from "../../../../../utils/permissions/userPermissionsUtils";
import { fetchUsers } from "../../../../../redux/Slices/settings/users/UsersSlice";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import useSettingsList from "../useSettingsList";
import SettingsListFilters from "../SettingsListFilters";
import { buildStatusListPayload } from "../settingsListConfig";
import { DEFAULT_USER_LIST_FILTERS, STAFF_TYPE_OPTIONS, USER_VIEW_STATE_KEY, userPermissionsPath } from "../settingsNewUiConstants";
import { getUserListColumns } from "./userListColumns";
import LastRefresh from "../LastRefresh";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";

const selectUserList = (state) => ({
    byId: state.users.users,
    order: state.users.usersOrder,
    totalPages: state.users.totalPages,
    total: state.users.totalUsers,
    lastUpdated: state.users.lastUpdated,
});

/* Legacy /users contract: staff_type (array) only when chosen. */
const buildUserListPayload = (filters) => {
    const payload = buildStatusListPayload(filters);
    if (filters.staff_type?.length) payload.staff_type = filters.staff_type;
    return payload;
};

const addUserPath = () => `/${routes.addUser}`;
const editUserPath = (row) => `/${routes.addUser}?id=${encodeURIComponent(row?.id)}`;
const permissionsPath = (row) => userPermissionsPath(row?.id);   /* U-0357: its own page */

const UserList = () => {
    const navigate = useNavigate();
    const { permissionList } = useSelector((state) => state.users);
    const { canViewUser, canEditUser } = useUserPermissions(permissionList);

    const fetchAction = useCallback((payload) => fetchUsers(payload), []);
    const list = useSettingsList({
        viewStateKey: USER_VIEW_STATE_KEY,
        fetchAction,
        selectList: selectUserList,
        defaultFilters: DEFAULT_USER_LIST_FILTERS,
        buildPayload: buildUserListPayload,
    });

    const staffTypeOptions = useMemo(
        () => [{ value: "", label: translation("key_all") }, ...STAFF_TYPE_OPTIONS.map((option) => ({ value: option.value, label: translation(option.key) }))],
        []
    );

    const openEdit = useCallback((row) => {
        if (canEditUser && row?.id != null) navigate(editUserPath(row));
    }, [canEditUser, navigate]);

    const openPermissions = useCallback((row) => {
        if (canEditUser && row?.id != null) navigate(permissionsPath(row));
    }, [canEditUser, navigate]);

    const columns = useMemo(
        () => getUserListColumns({ canEdit: Boolean(canEditUser), onEdit: openEdit, onPermissions: openPermissions }),
        [canEditUser, openEdit, openPermissions]
    );

    const goPrev = useCallback(() => list.setPage(list.pageInfo.currentPage - 1), [list]);
    const goNext = useCallback(() => list.setPage(list.pageInfo.currentPage + 1), [list]);

    if (!canViewUser) {
        return <div className={shared.notAuthorized}>{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{headingCase(translation("key_users"))}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{headingCase(translation("key_users"))}</h1>
                    <LastRefresh value={list.lastUpdated} />
                </div>
                {canEditUser && (
                    <div className={listStyles.pageHeaderActions}>
                        <Btn variant="primary" as={Link} to={addUserPath()}>
                            <Icon name="plus" size={14} /> {translation("key_add_user")}
                        </Btn>
                    </div>
                )}
            </div>

            <SettingsListFilters
                id="user"
                filters={list.filters}
                searchInput={list.searchInput}
                isFiltered={list.isFiltered}
                onSearchChange={list.onSearchChange}
                onFilterChange={list.setFilter}
                onClear={list.clearFilters}
            >
                <FilterSelect
                    id="user-filter-staff-type"
                    label={translation("key_staff_type")}
                    value={list.filters.staff_type}
                    options={staffTypeOptions}
                    multiple
                    menuWidth={170}
                    onChange={(value) => list.setFilter("staff_type", value)}
                />
            </SettingsListFilters>

            <DataTable
                columns={columns}
                rows={list.rows}
                rowKey="id"
                isLoading={list.isLoading}
                error={list.error}
                sortBy={list.filters.sort_by}
                sortOrder={list.filters.sort_order}
                pageInfo={list.pageInfo}
                unitLabel={translation("key_users").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={list.setSort}
                onRowClick={canEditUser ? openEdit : undefined}
                onPrev={goPrev}
                onNext={goNext}
                onLimitChange={list.setLimit}
                onRetry={list.refresh}
            />
        </div>
    );
};

export default UserList;
