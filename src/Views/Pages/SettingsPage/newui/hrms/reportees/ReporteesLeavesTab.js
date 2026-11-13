import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../../components/ui/Btn";
import { Checkbox } from "../../../../../../components/ui/FormControls";
import translation from "../../../../../../utils/translation";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import styles from "../Hrms.module.css";
import DateRangeFields from "../DateRangeFields";
import ReporteesLeavesTable from "./ReporteesLeavesTable";
import { REPORTEE_LEAVE_TAB } from "../../settingsNewUiConstants";
import { headingCase } from "../../../../../../utils/utils";

/* U-0446 (10 Nov package, supersedes the 6 Nov last-month default): the queue opens UNFILTERED — no default
   range may hide older pending requests; dates still apply deliberately through Go */
const emptyRange = () => ({ startDate: null, endDate: null });

/** Ports ApprovedLeaveContent.js: pending / actioned segment, date range + Go, non-reportees toggle. */
const ReporteesLeavesTab = ({ isApproveLeaveNonReportees = false, isEditApproveLeave = false }) => {
    const [draftRange, setDraftRange] = useState(emptyRange);
    const [dateRange, setDateRange] = useState(draftRange);
    const [activeTab, setActiveTab] = useState(REPORTEE_LEAVE_TAB.PENDING);
    const [showNonReportees, setShowNonReportees] = useState(false);

    const tabs = useMemo(() => [
        { key: REPORTEE_LEAVE_TAB.PENDING, title: headingCase(translation("key_pending_leaves")) },
        { key: REPORTEE_LEAVE_TAB.ACTIONED, title: headingCase(translation("key_actioned_leaves")) },
    ], []);

    const handleDateRangeChange = useCallback((range) => setDraftRange({ startDate: range.startDate, endDate: range.endDate }), []);
    const applyDates = useCallback(() => setDateRange((prev) => ({ ...prev, ...draftRange })), [draftRange]);
    const handleNonReporteesChange = useCallback((event) => setShowNonReportees(event.target.checked), []);

    return (
        <>
            <div className={listStyles.filterBar}>
                <div className={`${listStyles.controlsRow} ${shared.filtersRow}`}>
                    {/* Shubham 6 Nov (blue + red arrows): dates + Go + Non-Reportees sit LEFT, the Pending/Actioned segment RIGHT */}
                    <DateRangeFields id="reportee-leaves" startDate={draftRange.startDate} endDate={draftRange.endDate} onChange={handleDateRangeChange} />
                    <Btn variant="primary" type="button" onClick={applyDates}>{translation("key_go")}</Btn>
                    {isApproveLeaveNonReportees && (
                        <div className={styles.filterCheck}>
                            <Checkbox label={translation("key_view_non_repoortees")} checked={showNonReportees} onChange={handleNonReporteesChange} />
                        </div>
                    )}
                    <span className={styles.filterSpacer} />
                    <div className={shared.segment} role="tablist">
                        {tabs.map((tab) => {
                            const active = tab.key === activeTab;
                            return (
                                <button key={tab.key} type="button" role="tab" aria-selected={active} className={`${shared.segmentItem} ${active ? shared.segmentActive : ""}`} onClick={() => setActiveTab(tab.key)}>
                                    {tab.title}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <ReporteesLeavesTable
                key={activeTab}
                status={activeTab}
                dateRange={dateRange}
                showNonReportees={showNonReportees}
                isEditApproveLeave={activeTab === REPORTEE_LEAVE_TAB.ACTIONED ? isEditApproveLeave : false}
            />
        </>
    );
};

ReporteesLeavesTab.propTypes = {
    isApproveLeaveNonReportees: PropTypes.bool,
    isEditApproveLeave: PropTypes.bool,
};

export default React.memo(ReporteesLeavesTab);
