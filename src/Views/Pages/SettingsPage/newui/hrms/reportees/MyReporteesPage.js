import React, { lazy, Suspense, useMemo, useState } from "react";
import { shallowEqual, useSelector } from "react-redux";
import translation from "../../../../../../utils/translation";
import { headingCase, toTitleCase } from "../../../../../../utils/utils";
import { useHrmsPermissions } from "../../../../../../utils/permissions/hrmsPermissionsUtils";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import LastRefresh from "../../LastRefresh";
import { MY_REPORTEES_TAB } from "../../settingsNewUiConstants";

const selectLastUpdated = (state) => ({
    [MY_REPORTEES_TAB.APPROVE_LEAVES]: state.leaves.repoteesLeavesLastUpdated,
    [MY_REPORTEES_TAB.APPROVE_TIME_REQUEST]: state.timeRequests.reporteesTimeRequestLastUpdated,
    [MY_REPORTEES_TAB.TIME_CREDIT]: state.timeRequests.managerApprovedTimeRequestLastUpdated,
});

const ReporteesLeavesTab = lazy(() => import("./ReporteesLeavesTab"));
const ReporteesTimeRequestsTab = lazy(() => import("./ReporteesTimeRequestsTab"));
const TimeCreditTab = lazy(() => import("./TimeCreditTab"));

/** Ports ApproveLeaves.js: Approve Leaves · Approve Time Request · Time Credit, permission-gated. */
const MyReporteesPage = () => {
    const { permissionList } = useSelector((state) => state.users);
    const {
        canApproveLeave,
        canApproveLeaveNonReportees,
        canEditApproveLeave,
        canApproveTimeRequest,
        canApproveTimeRequestNonReportees,
        canAddTimeCredit,
    } = useHrmsPermissions(permissionList);

    const initialTab = canApproveLeave
        ? MY_REPORTEES_TAB.APPROVE_LEAVES
        : canApproveTimeRequest ? MY_REPORTEES_TAB.APPROVE_TIME_REQUEST : MY_REPORTEES_TAB.TIME_CREDIT;
    const [activeTab, setActiveTab] = useState(initialTab);
    const lastUpdatedByTab = useSelector(selectLastUpdated, shallowEqual);

    const tabs = useMemo(() => {
        const result = [];
        if (canApproveLeave) result.push({ key: MY_REPORTEES_TAB.APPROVE_LEAVES, title: headingCase(translation("key_approve_leaves")) });
        if (canApproveTimeRequest) result.push({ key: MY_REPORTEES_TAB.APPROVE_TIME_REQUEST, title: headingCase(translation("key_approve_time_request")) });
        result.push({ key: MY_REPORTEES_TAB.TIME_CREDIT, title: headingCase(translation("key_time_credit")) });
        return result;
    }, [canApproveLeave, canApproveTimeRequest]);

    const renderTab = () => {
        switch (activeTab) {
            case MY_REPORTEES_TAB.APPROVE_LEAVES:
                return <ReporteesLeavesTab isApproveLeaveNonReportees={Boolean(canApproveLeaveNonReportees)} isEditApproveLeave={Boolean(canEditApproveLeave)} />;
            case MY_REPORTEES_TAB.APPROVE_TIME_REQUEST:
                return <ReporteesTimeRequestsTab isApproveTimeRequestNonReportees={Boolean(canApproveTimeRequestNonReportees)} />;
            default:
                return <TimeCreditTab canAddTimeCredit={Boolean(canAddTimeCredit)} />;
        }
    };

    return (
        <div className={listStyles.pageWrap}>
            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{toTitleCase(translation("key_my_reportees"))}</h1>
                    <LastRefresh value={lastUpdatedByTab[activeTab]} />
                </div>
            </div>

            <div className={shared.tabStrip} role="tablist">
                {tabs.map((tab) => {
                    const active = tab.key === activeTab;
                    return (
                        <button key={tab.key} type="button" role="tab" aria-selected={active} className={`${shared.tabStripItem} ${active ? shared.tabStripActive : ""}`} onClick={() => setActiveTab(tab.key)}>
                            {tab.title}
                        </button>
                    );
                })}
            </div>

            <Suspense fallback={<div className={shared.loadingState}>{translation("key_loading")}…</div>}>
                {renderTab()}
            </Suspense>
        </div>
    );
};

export default MyReporteesPage;
