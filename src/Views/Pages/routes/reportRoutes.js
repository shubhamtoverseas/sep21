import { lazy } from "react";
import routes from "./routesConfig/index";

const ReportsPage = lazy(() => import("../reports/ReportsPage"));
const jobOfferReportPage = lazy(() => import("../reports/job-offer-report/JobOfferReportPage"));
const FeedbackReport = lazy(() => import("../reports/feedback-report/FeedbackReportPage"));
const InterviewReport = lazy(() => import("../reports/interview-report/InterviewReportPage"));
const InsuranceReport = lazy(() => import("../reports/insurance-report/InsuranceReportPage"));
const ContractReport = lazy(() => import("../reports/contract-report/ContractReportPage"));
const ConsolidatedLedgerReport = lazy(() => import("../reports/consolidated-ledger-report/ConsolidatedLedgerReportPage"));
const SessionHistoryReport = lazy(() => import("../reports/session-history-report/SessionHistoryReportPage"));
const ScheduleComplianceReport = lazy(() => import("../reports/schedule-compliance-report/ScheduleComplianceReportPage"));
const TimeRequestReport = lazy(() => import("../reports/time-request-report/TimeRequestReportPage"));
const LeaveHistoryReport = lazy(() => import("../reports/leave-history-report/LeaveHistoryReportPage"));
const TimeEntryReport = lazy(() => import("../reports/time-entry-report/TimerEntryReportPage"));

const reportRoutes = [
    { path: routes.reports, component: ReportsPage, moduleKey: "reports", permissionKey: "report_access"  },
    { path: routes.jobOfferReport, component: jobOfferReportPage,  moduleKey: "reports", permissionKey: "jo_report"  },
    { path: routes.feedbackReport, component: FeedbackReport,  moduleKey: "reports", permissionKey: "feedback_report"  },
    { path: routes.interviewReport, component: InterviewReport,  moduleKey: "reports", permissionKey: "interview_report"  },
    { path: routes.insuranceReport, component: InsuranceReport, moduleKey: "reports", permissionKey: "insurance_report" },
    { path: routes.contractReport, component: ContractReport, moduleKey: "reports", permissionKey: "contract_report" },
    { path: routes.consolidatedLedgerReport, component: ConsolidatedLedgerReport, moduleKey: "reports", permissionKey: "consolidated_ledger_report" },
    /* PK-01 P1-18 (HPM-012, B-108): the PERM §16 HRMS reports open on the key their hrms report endpoint checks */
    { path: routes.sessionHistoryReport, component: SessionHistoryReport, moduleKey: "hrms_report", permissionKey: "session_history_report" },
    { path: routes.scheduleComplianceReport, component: ScheduleComplianceReport, moduleKey: "hrms_report", permissionKey: "schedule_compliance_report" },
    { path: routes.timeRequestReport, component: TimeRequestReport, moduleKey: "hrms_report", permissionKey: "time_request_report" },
    { path: routes.leaveHistoryReport, component: LeaveHistoryReport, moduleKey: "hrms_report", permissionKey: "applied_leave_history_report" },
    { path: routes.timeEntryReport, component: TimeEntryReport, moduleKey: "hrms_report", permissionKey: "time_credit_report" },
];

export default reportRoutes;