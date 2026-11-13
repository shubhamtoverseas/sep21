import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../../components/ui/Btn";
import Icon from "../../../../../../components/Icon/Icon";
import { Checkbox } from "../../../../../../components/ui/FormControls";
import translation from "../../../../../../utils/translation";
import debounce from "../../../../../../utils/debounce";
import { SEARCH_DEBOUNCE_MS } from "../../../../../../components/ReusableComponents/constants";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import styles from "../Hrms.module.css";
import DateRangeFields from "../DateRangeFields";
import ReporteesTimeRequestsTable from "./ReporteesTimeRequestsTable";
import { REPORTEE_TIME_REQUEST_TAB } from "../../settingsNewUiConstants";
import { headingCase } from "../../../../../../utils/utils";

/* Shubham 6 Nov (supersedes U-0446's unfiltered default): the range opens on the LAST 1 MONTH, and the dates
   apply through Go — typing a date no longer refetches on its own */
/* U-0446 (10 Nov package, supersedes the 6 Nov last-month default): the queue opens UNFILTERED */
const emptyRange = () => ({ startDate: null, endDate: null });

/** Ports ApproveTimeRequest.js: pending / actioned / all segment, search, date range + Go, non-reportees.
 *  U-0432 flip (10 Nov package) + Priyanka 11 Nov: the search box is back and real — `search_text` on
 *  reportees-list (name partial, email exact, request number TRxxxxxx); cleared, the param is not sent. */
const ReporteesTimeRequestsTab = ({ isApproveTimeRequestNonReportees = false }) => {
    const [activeTab, setActiveTab] = useState(REPORTEE_TIME_REQUEST_TAB.PENDING);
    const [draftRange, setDraftRange] = useState(emptyRange);
    const [dateRange, setDateRange] = useState(draftRange);
    const [showNonReportees, setShowNonReportees] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const debouncedSearch = useMemo(() => debounce((value) => setSearch(value.trim()), SEARCH_DEBOUNCE_MS), []);
    useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);
    const handleSearchChange = useCallback((event) => {
        setSearchInput(event.target.value);
        debouncedSearch(event.target.value);
    }, [debouncedSearch]);

    const tabs = useMemo(() => [
        { key: REPORTEE_TIME_REQUEST_TAB.PENDING, title: headingCase(translation("key_pending")) },
        { key: REPORTEE_TIME_REQUEST_TAB.ACTIONED, title: headingCase(translation("key_actioned")) },
        { key: REPORTEE_TIME_REQUEST_TAB.ALL, title: headingCase(translation("key_all")) },
    ], []);

    const handleDateRangeChange = useCallback((range) => setDraftRange({ startDate: range.startDate, endDate: range.endDate }), []);
    const applyDates = useCallback(() => setDateRange((prev) => ({ ...prev, ...draftRange })), [draftRange]);
    const handleNonReporteesChange = useCallback((event) => setShowNonReportees(event.target.checked), []);

    return (
        <>
            <div className={listStyles.filterBar}>
                <div className={`${listStyles.controlsRow} ${shared.filtersRow}`}>
                    {/* Shubham 6 Nov (blue + red arrows): dates + Go + Non-Reportees sit LEFT, the Pending/Actioned/All segment RIGHT */}
                    <div className={listStyles.controlsSearch}>
                        <Icon name="search" size={14} />
                        <input
                            id="reportee-time-requests-search"
                            type="search"
                            className={listStyles.controlsSearchInput}
                            placeholder={translation("key_search")}
                            value={searchInput}
                            onChange={handleSearchChange}
                            aria-label={translation("key_search")}
                            autoComplete="off"
                        />
                    </div>
                    <DateRangeFields id="reportee-time-requests" startDate={draftRange.startDate} endDate={draftRange.endDate} onChange={handleDateRangeChange} />
                    <Btn variant="primary" type="button" onClick={applyDates}>{translation("key_go")}</Btn>
                    {isApproveTimeRequestNonReportees && (
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

            <ReporteesTimeRequestsTable key={activeTab} type={activeTab} dateRange={dateRange} showNonReportees={showNonReportees} search={search} />
        </>
    );
};

ReporteesTimeRequestsTab.propTypes = {
    isApproveTimeRequestNonReportees: PropTypes.bool,
};

export default React.memo(ReporteesTimeRequestsTab);
