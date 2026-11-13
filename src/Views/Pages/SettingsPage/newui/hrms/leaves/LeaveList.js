import React, { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Btn from "../../../../../../components/ui/Btn";
import ConfirmModal from "../../../../../../components/ui/ConfirmModal";
import DataTable from "../../../../../../components/ui/DataTable";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import { absoluteRoute, headingCase, toTitleCase } from "../../../../../../utils/utils";
import routes from "../../../../routes/routesConfig";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import useLeaveList from "./useLeaveList";
import { getLeaveListColumns } from "./leaveListColumns";
import LastRefresh from "../../LastRefresh";

const editLeavePath = (row) => `${absoluteRoute(routes.applyLeave)}?id=${encodeURIComponent(row?.id)}`;

/** Ports Leaves.js — my leaves list with Apply Leave, edit and withdraw. */
const LeaveList = () => {
    const navigate = useNavigate();
    const list = useLeaveList();

    const openEdit = useCallback((row) => { if (row?.id != null) navigate(editLeavePath(row)); }, [navigate]);

    const columns = useMemo(
        () => getLeaveListColumns({ canEdit: list.canEditLeave, onEdit: openEdit, onWithdraw: list.requestWithdraw }),
        [list.canEditLeave, openEdit, list.requestWithdraw]
    );

    return (
        <div className={listStyles.pageWrap}>
            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{toTitleCase(translation("key_leaves"))}</h1>
                    <LastRefresh value={list.lastUpdated} />
                </div>
                {list.canAddLeave && (
                    <div className={listStyles.pageHeaderActions}>
                        <Btn variant="primary" as={Link} to={absoluteRoute(routes.applyLeave)}>
                            <Icon name="plus" size={14} /> {translation("key_apply_leave")}
                        </Btn>
                    </div>
                )}
            </div>

            <DataTable
                columns={columns}
                rows={list.rows}
                rowKey="id"
                isLoading={list.isLoading}
                sortBy={list.sort.sort}
                sortOrder={list.sort.order.toLowerCase()}
                pageInfo={list.pageInfo}
                unitLabel={translation("key_leaves").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={list.sortTable}
                onPrev={list.handlePrevClick}
                onNext={list.handleNextClick}
                onLimitChange={list.handlePerPageChange}
                onRetry={list.handleRefresh}
            />

            {list.withdrawId != null && (
                <ConfirmModal
                    title={headingCase(translation("key_withdraw_leave"))}
                    body={`${translation("key_are_you_sure_you_want_to_withdraw_leave")} ${translation("key_if_yes_your_leave_will_be_cancelled_and_leave_balance_will_be_restored")}`}
                    confirmLabel={translation("key_yes")}
                    cancelLabel={translation("key_no")}
                    danger
                    busy={list.isWithdrawing}
                    onConfirm={list.confirmWithdraw}
                    onClose={list.cancelWithdraw}
                />
            )}
        </div>
    );
};

export default LeaveList;
