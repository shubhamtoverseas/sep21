import React, { useMemo } from "react";
import PropTypes from "prop-types";
import DataTable from "../../../../../../components/ui/DataTable";
import translation from "../../../../../../utils/translation";
import useReporteesTimeRequests from "./useReporteesTimeRequests";
import { getReporteesTimeRequestColumns } from "./reporteesTimeRequestColumns";
import ViewTimeRequestModal from "./ViewTimeRequestModal";
import TimeApproveRequestModal from "./TimeApproveRequestModal";

/** Ports approve-time-request/TimeRequests.js — one table per type + view / take-action modals. */
const ReporteesTimeRequestsTable = ({ type, dateRange, showNonReportees, search }) => {
    const list = useReporteesTimeRequests({ type, dateRange, showNonReportees, search });
    const columns = useMemo(() => getReporteesTimeRequestColumns({ onView: list.openView, onAction: list.openAction }), [list.openView, list.openAction]);

    return (
        <>
            <DataTable
                columns={columns}
                rows={list.rows}
                rowKey="id"
                isLoading={list.isLoading}
                error={list.hasError}
                sortBy={list.sort.sort}
                sortOrder={list.sort.order.toLowerCase()}
                pageInfo={list.pageInfo}
                unitLabel={translation("key_time_request").toLowerCase()}
                emptyText={translation("key_no_time_request_list_added")}
                onSort={list.sortTable}
                onPrev={list.handlePrevClick}
                onNext={list.handleNextClick}
                onLimitChange={list.handlePerPageChange}
                onRetry={list.handleRefresh}
            />

            {list.viewRequest && <ViewTimeRequestModal data={list.viewRequest} onClose={list.closeView} />}
            {list.actionRequest && <TimeApproveRequestModal data={list.actionRequest} onClose={list.closeAction} onRefresh={list.handleRefresh} />}
        </>
    );
};

ReporteesTimeRequestsTable.propTypes = {
    type: PropTypes.string.isRequired,
    dateRange: PropTypes.shape({ startDate: PropTypes.instanceOf(Date), endDate: PropTypes.instanceOf(Date) }),
    showNonReportees: PropTypes.bool,
    search: PropTypes.string,
};

export default React.memo(ReporteesTimeRequestsTable);
