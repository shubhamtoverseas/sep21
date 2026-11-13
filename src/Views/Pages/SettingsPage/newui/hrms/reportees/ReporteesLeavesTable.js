import React, { useMemo } from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../../components/ui/Btn";
import ConfirmModal from "../../../../../../components/ui/ConfirmModal";
import DataTable from "../../../../../../components/ui/DataTable";
import translation from "../../../../../../utils/translation";
import styles from "../Hrms.module.css";
import useReporteesLeaves from "./useReporteesLeaves";
import { getReporteesLeaveColumns } from "./reporteesLeaveColumns";
import { headingCase } from "../../../../../../utils/utils";

/** Ports ReporteesLeaves.js — one table per status with bulk (pending) or per-row (actioned) actions. */
const ReporteesLeavesTable = ({ status, dateRange, showNonReportees, isEditApproveLeave = false }) => {
    const list = useReporteesLeaves({ status, dateRange, showNonReportees });

    const columns = useMemo(() => getReporteesLeaveColumns({
        isPending: list.isPending,
        selectedIds: list.selectedLeaveIds,
        onToggleSelect: list.toggleSelect,
        canEdit: isEditApproveLeave,
        statusChangeRowId: list.statusChangeRowId,
        onShowStatusChange: list.showStatusChangeButtons,
        onRowAction: list.openRowAction,
    }), [list.isPending, list.selectedLeaveIds, list.toggleSelect, isEditApproveLeave, list.statusChangeRowId, list.showStatusChangeButtons, list.openRowAction]);

    return (
        <>
            {list.isPending && list.selectedLeaveIds.length > 0 && (
                <div className={styles.bulkBar}>
                    <span>{list.selectedLeaveIds.length} {translation("key_leaves").toLowerCase()}</span>
                    <span className={styles.bulkBarActions}>
                        <Btn variant="secondary" type="button" onClick={list.openBulkReject}>{translation("key_reject")}</Btn>
                        <Btn variant="primary" type="button" onClick={list.openBulkApprove}>{translation("key_approve")}</Btn>
                    </span>
                </div>
            )}

            <DataTable
                columns={columns}
                rows={list.rows}
                rowKey="id"
                isLoading={list.isLoading}
                error={list.hasError}
                sortBy={list.sort.sort}
                sortOrder={list.sort.order.toLowerCase()}
                pageInfo={list.pageInfo}
                unitLabel={translation("key_leaves").toLowerCase()}
                emptyText={translation("key_no_reportees_leave_added")}
                onSort={list.sortTable}
                onPrev={list.handlePrevClick}
                onNext={list.handleNextClick}
                onLimitChange={list.handlePerPageChange}
                onRetry={list.handleRefresh}
            />

            {list.isConfirmOpen && (
                <ConfirmModal
                    title={headingCase(translation("key_confirm_status_change"))}
                    body={`${translation("key_are_you_sure_you_want_to_change_the_status")}?`}
                    confirmLabel={translation("key_yes")}
                    cancelLabel={translation("key_no")}
                    onConfirm={list.confirm}
                    onClose={list.closeConfirm}
                />
            )}
        </>
    );
};

ReporteesLeavesTable.propTypes = {
    status: PropTypes.string.isRequired,
    dateRange: PropTypes.shape({ startDate: PropTypes.instanceOf(Date), endDate: PropTypes.instanceOf(Date) }),
    showNonReportees: PropTypes.bool,
    isEditApproveLeave: PropTypes.bool,
};

export default React.memo(ReporteesLeavesTable);
