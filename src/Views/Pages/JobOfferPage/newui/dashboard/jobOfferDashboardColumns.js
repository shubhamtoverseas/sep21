import React from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import EngagementIcon from "../../../../../components/ui/EngagementIcon";
import WgdIcon from "../../../WorkerPage/dashboard/WgdIcon";
import { getCurrentEngagementKind } from "../../../../../services/commonService";
import { getInitials } from "../../../../../utils/utils";
import joStageLabel from "../joStageLabel";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import empStyles from "../../../Employer/newui/EmployerDashboard.module.css";
import styles from "./JobOfferDashboard.module.css";
import JoStatusTag from "../JoStatusTag";
import {
    JO_DASH_CLOSED_STATUS, JO_DASH_COLUMN, JO_DASH_COPY, JO_DASH_PREPUBLISH_STATUSES, JO_DASH_STAGE_CELLS, JO_DASH_STAGE_EMPHASIS, JO_LIST_TRACKS, JO_RECORD_COPY, JO_STAGE,
} from "../../jobOfferConstants";
import { abbrevOwner, relativeActivity } from "./jobOfferDashboardConfig";

const Dash = () => <span className={ listStyles.mutedDash }>—</span>;
const Mono = ({ children }) => <span className={ styles.mono }>{ children }</span>;
Mono.propTypes = { children: PropTypes.node };

const prePublish = (row) => JO_DASH_PREPUBLISH_STATUSES.includes(Number(row?.status));

const NameCell = ({ row }) => {
    const english = row?.employer_fullname || row?.employer_name || '';
    const zh = row?.employer_chinese_name || row?.chinese_name || '';
    return (
        <span className={ empStyles.nameCell }>
            <EngagementIcon kind={ getCurrentEngagementKind(row) } />
            <span className={ `${ empStyles.nameText } mc-person-name` }>{ english || <Dash /> }{ english && zh ? <span className={ styles.zh }> · { zh }</span> : null }</span>
        </span>
    );
};

const RefCell = ({ row }) => (row?.reference_id ? <span className={ empStyles.codeText } data-mc-plain-job-offer-ref="true">{ row.reference_id }</span> : <Dash />);

const ActivityCell = ({ row }) => { const text = relativeActivity(row?.last_activity_at || row?.last_activity); return text ? <Mono>{ text }</Mono> : <Dash />; };

const OpenCell = ({ row }) => (prePublish(row) || row?.days_open == null ? <Dash /> : <Mono>{ row.days_open }d</Mono>);
const ViewsCell = ({ row }) => (row?.view_count == null || (prePublish(row) && !Number(row.view_count)) ? <Dash /> : <Mono>{ row.view_count }</Mono>);
const ApplyCell = ({ row }) => { const n = Number(row?.apply_percentage); return row?.apply_percentage == null || Number.isNaN(n) || n < 0 ? <Dash /> : <Mono>{ n }%</Mono>; };
const StartCell = ({ row }) => {
    if (row?.asap === 1) return <Mono>{ JO_RECORD_COPY.asap }</Mono>;
    return row?.start_date ? <Mono>{ dayjs(row.start_date).format('DD/MM/YYYY') }</Mono> : <Dash />;
};

const StagesCell = ({ row }) => {
    const cells = JO_DASH_STAGE_CELLS.filter((s) => Number(row?.[JO_STAGE[s.id].countKey]) > 0);
    if (!cells.length) return <Dash />;
    return (
        <span className={ styles.stagecells }>
            { cells.map((s) => (
                <span key={ s.id } className={ JO_DASH_STAGE_EMPHASIS.includes(s.id) ? styles.hi : undefined } title={ joStageLabel(s.id) }>
                    <WgdIcon name={ s.icon } size={ 9 } strokeWidth={ 1.8 } />{ row[JO_STAGE[s.id].countKey] }
                </span>
            )) }
        </span>
    );
};

/* CS Owner: initials + "Linda W."; Closed is the only non-owning state (em dash). The change-request affordance is a
   delivered flow the package does not describe (@migration-unspecified(job-offer)). */
const CsCell = ({ row, onCsRequest }) => {
    if (!row?.cs_name || Number(row?.status) === JO_DASH_CLOSED_STATUS) return <Dash />;
    return (
        <span className={ empStyles.csCell }>
            <span className={ empStyles.csAvatar } aria-hidden="true">{ getInitials(row.cs_name) }</span>
            <span className={ empStyles.csName } title={ row.cs_name }>{ abbrevOwner(row.cs_name) }</span>
            { row?.cs_change_reason && onCsRequest && (
                <button type="button" className={ styles.csRequest } title={ JO_DASH_COPY.csRequest } aria-label={ JO_DASH_COPY.csRequest } onClick={ (event) => { event.stopPropagation(); onCsRequest(row); } }>
                    <WgdIcon name="user" size={ 11 } />
                </button>
            ) }
        </span>
    );
};

/* a Job Offer whose Location is Macau renders an em dash in the Branch column (DASH §8.2; workbook row 4) */
const BranchCell = ({ row, branchesById, isMacau }) => {
    if (isMacau) return <Dash />;
    const name = row?.branch_display_name || row?.branch_name || branchesById?.[String(row?.branch_id ?? row?.office_location)]?.name;
    return name ? <span className={ empStyles.softCell }>{ name }</span> : <Dash />;
};

const rowProp = { row: PropTypes.object };
NameCell.propTypes = rowProp; RefCell.propTypes = rowProp; ActivityCell.propTypes = rowProp; OpenCell.propTypes = rowProp;
ViewsCell.propTypes = rowProp; ApplyCell.propTypes = rowProp; StartCell.propTypes = rowProp; StagesCell.propTypes = rowProp;
CsCell.propTypes = { ...rowProp, onCsRequest: PropTypes.func };
BranchCell.propTypes = { ...rowProp, branchesById: PropTypes.object, isMacau: PropTypes.bool };

export const JO_DASH_COLUMN_LABELS = () => ({
    [JO_DASH_COLUMN.EMPLOYER]: JO_DASH_COPY.employerName, [JO_DASH_COLUMN.REF]: JO_DASH_COPY.joRef, [JO_DASH_COLUMN.ACTIVITY]: JO_DASH_COPY.activity,
    [JO_DASH_COLUMN.STATUS]: JO_DASH_COPY.joStatus, [JO_DASH_COLUMN.OPEN]: JO_DASH_COPY.open, [JO_DASH_COLUMN.VIEWS]: JO_DASH_COPY.views,
    [JO_DASH_COLUMN.APPLY]: JO_DASH_COPY.apply, [JO_DASH_COLUMN.START]: JO_DASH_COPY.start, [JO_DASH_COLUMN.STAGES]: JO_DASH_COPY.stageDetails,
    [JO_DASH_COLUMN.CS]: JO_DASH_COPY.csOwner, [JO_DASH_COLUMN.BRANCH]: JO_DASH_COPY.branch,
});

export const getJobOfferDashboardColumns = ({ branchesById, onCsRequest, isMacau = false }) => {
    const labels = JO_DASH_COLUMN_LABELS();
    const col = (key, track, extra) => ({ key, label: labels[key], trackRole: track.role, trackWidth: track.width, ...extra });
    return [
        col(JO_DASH_COLUMN.EMPLOYER, JO_LIST_TRACKS.employer, { sortKey: JO_DASH_COLUMN.EMPLOYER, sticky: true, render: (row) => <NameCell row={ row } /> }),
        col(JO_DASH_COLUMN.REF, JO_LIST_TRACKS.ref, { sortKey: JO_DASH_COLUMN.REF, render: (row) => <RefCell row={ row } /> }),
        col(JO_DASH_COLUMN.ACTIVITY, JO_LIST_TRACKS.activity, { sortKey: JO_DASH_COLUMN.ACTIVITY, render: (row) => <ActivityCell row={ row } /> }),
        col(JO_DASH_COLUMN.STATUS, JO_LIST_TRACKS.status, { sortKey: JO_DASH_COLUMN.STATUS, render: (row) => <JoStatusTag status={ row?.status } /> }),
        col(JO_DASH_COLUMN.OPEN, JO_LIST_TRACKS.open, { sortKey: JO_DASH_COLUMN.OPEN, render: (row) => <OpenCell row={ row } /> }),
        col(JO_DASH_COLUMN.VIEWS, JO_LIST_TRACKS.views, { sortKey: JO_DASH_COLUMN.VIEWS, render: (row) => <ViewsCell row={ row } /> }),
        col(JO_DASH_COLUMN.APPLY, JO_LIST_TRACKS.apply, { sortKey: JO_DASH_COLUMN.APPLY, render: (row) => <ApplyCell row={ row } /> }),
        col(JO_DASH_COLUMN.START, JO_LIST_TRACKS.start, { sortKey: JO_DASH_COLUMN.START, render: (row) => <StartCell row={ row } /> }),
        col(JO_DASH_COLUMN.STAGES, JO_LIST_TRACKS.stages, { render: (row) => <StagesCell row={ row } /> }),
        col(JO_DASH_COLUMN.CS, JO_LIST_TRACKS.cs, { headerFilter: 'cs', render: (row) => <CsCell row={ row } onCsRequest={ onCsRequest } /> }),
        col(JO_DASH_COLUMN.BRANCH, JO_LIST_TRACKS.branch, { render: (row) => <BranchCell row={ row } branchesById={ branchesById } isMacau={ isMacau } /> }),
    ];
};

export const jobOfferRowOpenLabel = (row) => `${ JO_DASH_COPY.openRecord } ${ [row?.employer_fullname || row?.employer_name, row?.reference_id].filter(Boolean).join(' · ') }`;
