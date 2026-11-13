import React, { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import DataTable from "../../../../../components/ui/DataTable";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import routes from "../../../routes/routesConfig";
import { useLeaveManagementPermissions } from "../../../../../utils/permissions/leaveManagementPermissionUtils";
import { fetchLeavePolicyMaster } from "../../../../../redux/Slices/settings/leavePolicy/LeavePolicySlice";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import useSettingsList from "../useSettingsList";
import { buildSortedListPayload } from "../settingsListConfig";
import { DEFAULT_LEAVE_POLICY_FILTERS, LEAVE_POLICY_VIEW_STATE_KEY } from "../settingsNewUiConstants";
import { getLeavePolicyListColumns } from "./leavePolicyListColumns";
import LastRefresh from "../LastRefresh";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";

const selectLeavePolicyList = (state) => ({
    byId: state.leavePolicy.leavePolicyMaster,
    order: state.leavePolicy.leavePolicyMasterOrder,
    totalPages: state.leavePolicy.totalPages,
    total: state.leavePolicy.totalLeavePolicy,
    lastUpdated: state.leavePolicy.lastUpdated,
});

const addPolicyPath = () => `/${routes.addLeavePolicy}`;
const editPolicyPath = (row) => `/${routes.addLeavePolicy}?id=${encodeURIComponent(row?.id)}`;

const LeavePolicyList = () => {
    const navigate = useNavigate();
    const { permissionList } = useSelector((state) => state.users);
    const { canViewLeave, canEditLeave } = useLeaveManagementPermissions(permissionList);

    const fetchAction = useCallback((payload) => fetchLeavePolicyMaster(payload), []);
    const list = useSettingsList({
        viewStateKey: LEAVE_POLICY_VIEW_STATE_KEY,
        fetchAction,
        selectList: selectLeavePolicyList,
        defaultFilters: DEFAULT_LEAVE_POLICY_FILTERS,
        buildPayload: buildSortedListPayload,
    });

    const openEdit = useCallback((row) => {
        if (canEditLeave && row?.id != null) navigate(editPolicyPath(row));
    }, [canEditLeave, navigate]);

    const columns = useMemo(
        () => getLeavePolicyListColumns({ canEdit: Boolean(canEditLeave), onEdit: openEdit }),
        [canEditLeave, openEdit]
    );

    const goPrev = useCallback(() => list.setPage(list.pageInfo.currentPage - 1), [list]);
    const goNext = useCallback(() => list.setPage(list.pageInfo.currentPage + 1), [list]);

    if (!canViewLeave) {
        return <div className={shared.notAuthorized}>{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{headingCase(translation("key_leave_policy"))}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{headingCase(translation("key_leave_policy"))}</h1>
                    <LastRefresh value={list.lastUpdated} />
                </div>
                {canEditLeave && (
                    <div className={listStyles.pageHeaderActions}>
                        <Btn variant="primary" as={Link} to={addPolicyPath()}>
                            <Icon name="plus" size={14} /> {translation("key_add")} {translation("key_leave_policy")}
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
                unitLabel={translation("key_leave_policy").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={list.setSort}
                onRowClick={canEditLeave ? openEdit : undefined}
                onPrev={goPrev}
                onNext={goNext}
                onLimitChange={list.setLimit}
                onRetry={list.refresh}
            />
        </div>
    );
};

export default LeavePolicyList;
