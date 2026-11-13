import React, { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Btn from "../../../../../../components/ui/Btn";
import ConfirmModal from "../../../../../../components/ui/ConfirmModal";
import DataTable from "../../../../../../components/ui/DataTable";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../../../../utils/utils";
import routes from "../../../../routes/routesConfig";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import styles from "../Hrms.module.css";
import DateRangeFields from "../DateRangeFields";
import useTimeRequestList from "./useTimeRequestList";
import { getTimeRequestColumns } from "./timeRequestColumns";
import LastRefresh from "../../LastRefresh";

const editTimeRequestPath = (row) => `${absoluteRoute(routes.addTimeRequest)}?id=${encodeURIComponent(row?.id)}`;

/** Ports TimeRequests.js + TimeRequestFilter.js — my recent time requests. */
const TimeRequestList = () => {
    const navigate = useNavigate();
    const list = useTimeRequestList();

    const openEdit = useCallback((row) => { if (row?.id != null) navigate(editTimeRequestPath(row)); }, [navigate]);

    // Legacy always passed editTimeRequest = true (the raise permission gates the route, not the pencil)
    const columns = useMemo(() => getTimeRequestColumns({ canEdit: true, onEdit: openEdit, onWithdraw: list.requestWithdraw }), [openEdit, list.requestWithdraw]);

    return (
        <div className={listStyles.pageWrap}>
            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{headingCase(translation("key_my_recent_time_requests"))}</h1>
                    <LastRefresh value={list.lastUpdated} />
                </div>
                <div className={listStyles.pageHeaderActions}>
                    <Btn variant="primary" as={Link} to={absoluteRoute(routes.addTimeRequest)}>
                        <Icon name="plus" size={14} /> {translation("key_raise_time_request")}
                    </Btn>
                </div>
            </div>

            <div className={listStyles.filterBar}>
                <div className={`${listStyles.controlsRow} ${shared.filtersRow}`}>
                    <div className={listStyles.controlsSearch}>
                        <Icon name="search" size={14} />
                        <input
                            id="time-request-search"
                            type="search"
                            className={listStyles.controlsSearchInput}
                            placeholder={translation("key_search")}
                            value={list.searchQuery}
                            onChange={(event) => list.handleSearch(event.target.value)}
                            aria-label={translation("key_search")}
                            autoComplete="off"
                        />
                    </div>
                    <span className={styles.filterSpacer} />
                    <DateRangeFields id="time-requests" startDate={list.dateRange.startDate} endDate={list.dateRange.endDate} onChange={list.handleDateRangeChange} />
                </div>
            </div>

            <DataTable
                columns={columns}
                rows={list.rows}
                rowKey="id"
                isLoading={list.isLoading}
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

            {list.withdrawId != null && (
                <ConfirmModal
                    title={headingCase(translation("key_confirm_withdraw"))}
                    body={`${translation("key_are_you_sure_you_want_to_withdraw")}?`}
                    confirmLabel={translation("key_yes")}
                    cancelLabel={translation("key_no")}
                    danger
                    onConfirm={list.confirmWithdraw}
                    onClose={list.cancelWithdraw}
                />
            )}
        </div>
    );
};

export default TimeRequestList;
