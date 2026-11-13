import React, { useMemo } from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../../components/ui/Btn";
import ConfirmModal from "../../../../../../components/ui/ConfirmModal";
import DataTable from "../../../../../../components/ui/DataTable";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import styles from "../Hrms.module.css";
import useTimeCredit from "./useTimeCredit";
import { getTimeCreditColumns } from "./timeCreditColumns";
import ViewTimeCreditModal from "./ViewTimeCreditModal";
import AddTimeCreditForm from "./AddTimeCreditForm";
import { headingCase } from "../../../../../../utils/utils";

/** Ports ManageApproveTimeEntry.js — past time credits list, view, (never-enabled) delete, add sub-view. */
const TimeCreditTab = ({ canAddTimeCredit = false }) => {
    const credit = useTimeCredit();
    const columns = useMemo(() => getTimeCreditColumns({ onView: credit.openView, onDelete: credit.requestDelete }), [credit.openView, credit.requestDelete]);

    if (credit.isAddOpen) return <AddTimeCreditForm onBack={credit.closeAdd} />;

    return (
        <>
            <div className={styles.subHead}>
                {/* user 6 Nov: a proper section title, not the small eyebrow */}
                <h2 className={styles.sectionTitle}>{headingCase(translation("key_past_time_credit"))}</h2>
                <div className={styles.subHeadActions}>
                    {/* bug log #97 (fixed 2026-10-18): the legacy "View Full Report" button had no handler — removed */}
                    {canAddTimeCredit && (
                        <Btn variant="primary" type="button" onClick={credit.openAdd}>
                            <Icon name="plus" size={14} /> {translation("key_add_time_credit")}
                        </Btn>
                    )}
                </div>
            </div>

            <DataTable
                columns={columns}
                rows={credit.rows}
                rowKey="id"
                isLoading={credit.isLoading}
                error={credit.hasError}
                sortBy={credit.sort.sort}
                sortOrder={credit.sort.order.toLowerCase()}
                pageInfo={credit.pageInfo}
                unitLabel={translation("key_time_credit").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={credit.sortTable}
                onPrev={credit.handlePrevClick}
                onNext={credit.handleNextClick}
                onLimitChange={credit.handlePerPageChange}
                onRetry={credit.handleRefresh}
            />

            {credit.viewEntry && <ViewTimeCreditModal timeEntry={credit.viewEntry} onClose={credit.closeView} />}
            {credit.deleteId != null && (
                <ConfirmModal
                    title={headingCase(translation("key_confirm_delete"))}
                    body={`${translation("key_are_you_sure_you_want_to_delete_time_entry")}?`}
                    confirmLabel={translation("key_yes")}
                    cancelLabel={translation("key_no")}
                    danger
                    onConfirm={credit.confirmDelete}
                    onClose={credit.cancelDelete}
                />
            )}
        </>
    );
};

TimeCreditTab.propTypes = {
    canAddTimeCredit: PropTypes.bool,
};

export default React.memo(TimeCreditTab);
