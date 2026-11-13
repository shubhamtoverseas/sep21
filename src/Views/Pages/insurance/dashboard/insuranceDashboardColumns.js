import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import configData from "../../../../components/ReusableComponents/app-configs";
import routes from "../../routes/routesConfig";
import { getInitials } from "../../../../utils/utils";
import StaffAccountCue from "../../../../components/ui/StaffAccountCue";
import listStyles from "../../Invoice/InvoiceList.module.css";
import styles from "./InsuranceDashboard.module.css";
import {
    COVERAGE_TONE, coverageDetail, coverageLabel, fmtDateShort, fmtDateTime, relTime, translation,
} from "./insuranceDashboardConfig";
import DiscloseValue from "./DiscloseValue";
import InsuranceWorkTags from "../shared/InsuranceWorkTags";

/* Cell grammar per register #82–#85 and the consolidated prototype (dashboard.js); column ids are the stable app-config ids (F-1). */

const Dash = () => <span className={styles.muted}>—</span>;

const stop = (event) => event.stopPropagation();

/* Worker Name: the name only — the Worker Code stays searchable and on the record (register #83) */
const WorkerCell = ({ row }) => (
    row.worker?.name ? <span className={styles.name} title={row.worker.name}>{row.worker.name}</span> : <Dash />
);

/* Employer Name: "English · Chinese" on one line in the same primary-name treatment, no code (register #83) */
const EmployerCell = ({ row }) => {
    const full = [row.employer?.name, row.employer?.zh].filter(Boolean).join(" · ");
    if (!full) return <Dash />;
    return <span className={styles.employer} title={full} aria-label={full}>{full}</span>;
};

/* Relative time; the exact dd/mm/yy HH:MM (Hong Kong) disclosed on hover and on keyboard focus (ACT #80) */
const ActivityCell = ({ row }) => {
    if (!row.lastActivityAt) return <Dash />;
    return (
        <DiscloseValue className={styles.mono} full={fmtDateTime(row.lastActivityAt)} label={translation("key_ins_col_activity")}>
            {relTime(row.lastActivityAt)}
        </DiscloseValue>
    );
};

const PolicyPeriodCell = ({ row }) => {
    if (!row.policyPeriod) return <Dash />;
    return (
        <span className={styles.stack}>
            <span className={styles.mono}>{`${fmtDateShort(row.policyPeriod.effective)} – ${fmtDateShort(row.policyPeriod.expiry)}`}</span>
            {row.policyPeriod.plan && <span className={styles.sub} title={row.policyPeriod.plan}>{row.policyPeriod.plan}</span>}
        </span>
    );
};

/* Coverage status: the coverage tag only; its detail is the tag's title (register #84) */
const CoverageCell = ({ row }) => {
    const cv = row.coverage || {};
    const detail = coverageDetail(cv);
    return (
        <span
            className={`${listStyles.statusTag} ${cv.legacy ? styles.pillLegacy : ""}`}
            data-tone={COVERAGE_TONE[cv.label] || "neutral"}
            title={detail || undefined}
        >
            {coverageLabel(cv.label)}
        </span>
    );
};

/* Open requests: one tag per open request (oldest first) and the Needs attention note (count); else "—" (dashboard.js case 'work') */
const OpenRequestsCell = ({ row }) => (
    <span className={styles.workCell}>
        <InsuranceWorkTags openRequests={row.work?.openRequests || []} attention={row.work?.attention || 0} empty={<Dash />} />
    </span>
);

/* CS Owner is current responsibility: the normal name and avatar, plus the shared cue only for an explicitly inactive
   account (UI Correction C3; Q-21: staffs.status 0). Unknown status shows nothing. */
const OwnerCell = ({ row }) => {
    if (!row.owner?.name) return <Dash />;
    return (
        <span className={styles.owner}>
            <span className={styles.ownerAvatar} aria-hidden="true">{getInitials(row.owner.name)}</span>
            <StaffAccountCue active={row.owner.active} />
            <span className={styles.soft}>{row.owner.name}</span>
        </span>
    );
};

/* Contract: the word "Contract", an ordinary link that opens only the contract when the viewer can open that Contract record,
   plain text otherwise; else "Standalone" — never the number (register #85; PROMPT 6) */
const ContractCell = ({ row, canOpen }) => {
    if (!row.contract) return <span>{translation("key_ins_standalone")}</span>;
    if (!canOpen?.(row.contract.id)) return <span data-contract-link="none">{translation("key_contract")}</span>;
    return (
        <Link className={styles.contractLink} to={routes.processingDetails.replace(":contract_id", row.contract.id)} onClick={stop}>
            {translation("key_contract")}
        </Link>
    );
};

const rowShape = { row: PropTypes.object.isRequired };
WorkerCell.propTypes = rowShape;
EmployerCell.propTypes = rowShape;
ActivityCell.propTypes = rowShape;
PolicyPeriodCell.propTypes = rowShape;
CoverageCell.propTypes = rowShape;
OpenRequestsCell.propTypes = rowShape;
OwnerCell.propTypes = rowShape;
ContractCell.propTypes = { ...rowShape, canOpen: PropTypes.func };

/* id → { sortKey (server R1 key; absent = not sortable), divider, render } */
const COLUMN_DEFS = {
    workerName: { sortKey: "worker", render: (row) => <WorkerCell row={row} /> },
    insuranceRef: { sortKey: "ref", divider: true, render: (row) => <span className={styles.code}>{row.ref}</span> },
    employerName: { sortKey: "employer", render: (row) => <EmployerCell row={row} /> },
    activity: { sortKey: "lastActivity", render: (row) => <ActivityCell row={row} /> },
    policyPeriod: { sortKey: "coverage", render: (row) => <PolicyPeriodCell row={row} /> },
    coverageStatus: { sortKey: "condition", render: (row) => <CoverageCell row={row} /> },
    openRequests: { render: (row) => <OpenRequestsCell row={row} /> },
    csOwner: { sortKey: "owner", render: (row) => <OwnerCell row={row} /> },
    branch: { render: (row) => (row.branch?.name ? <span className={styles.soft}>{row.branch.name}</span> : <Dash />) },
    expiry: { sortKey: "expiry", render: (row) => (row.expiry ? <span className={styles.mono}>{fmtDateShort(row.expiry)}</span> : <Dash />) },
    qbePolicyNumber: { render: (row) => (row.carrierRef ? <span className={styles.code}>{row.carrierRef}</span> : <Dash />) },
    contract: {},   /* render set in getInsuranceColumns: it needs canOpenContract */
    /* Submitted by is historical attribution: no staff-account cue (C3) */
    submittedBy: { render: (row) => (row.submittedBy ? <span className={styles.soft}>{row.submittedBy}</span> : <Dash />) },
};

/* Visible columns in the spec's fixed order, whatever order the selection was stored in. `canOpenContract(id)` decides
   whether the Contract column links (absent: it never links). */
export const getInsuranceColumns = (visibleIds, { canOpenContract } = {}) => {
    const labels = configData.insuranceColumnLabels({ t: translation });
    return configData.insuranceColumnsConfigTranslate({ translation })
        .map((option) => option.value)
        .filter((id) => visibleIds.includes(id))
        .map((id) => ({
            key: id,
            label: labels[id],
            ...COLUMN_DEFS[id],
            ...(id === "contract" && { render: (row) => <ContractCell row={row} canOpen={canOpenContract} /> }),
        }));
};

export const insuranceRowLabel = (row) => `${row.worker?.name || ""} ${row.ref || ""}`.trim();
