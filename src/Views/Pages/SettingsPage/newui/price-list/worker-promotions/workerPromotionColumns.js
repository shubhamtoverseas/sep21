import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import { formatDisplayDate, interviewModeLabel } from "../priceListConfig";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const TextCell = ({ value }) => (value ? <span className={shared.softCell}>{value}</span> : <Dash />);
TextCell.propTypes = { value: PropTypes.node };

const EditCell = ({ row, onEdit }) => (
    <button
        type="button"
        className={shared.rowIconBtn}
        onClick={(event) => { event.stopPropagation(); onEdit(row); }}
        aria-label={translation("key_edit_icon")}
        title={translation("key_edit")}
    >
        <Icon name="edit" size={14} />
    </button>
);
EditCell.propTypes = { row: PropTypes.object.isRequired, onEdit: PropTypes.func.isRequired };

/** Ports WorkerPromotionTableColumns.js (same sort keys). */
/* bug log #67 (fixed 2026-10-06): the edit pencil follows edit_worker_promotion like the Add button */
export const getWorkerPromotionColumns = ({ canEdit = true, onEdit }) => [
    { key: "agency", label: translation("key_agency"), sortKey: "agency", sticky: true, minWidth: 180, render: (row) => <span className={shared.nameText}>{row?.agencyModel?.agency_name || ""}</span> },
    { key: "agency_category", label: translation("key_agency_category"), sortKey: "agency_category", render: (row) => <TextCell value={row?.agencyModel?.agency_category} /> },
    { key: "interview_mode", label: translation("key_interview_mode"), sortKey: "interview_mode", render: (row) => <TextCell value={interviewModeLabel(row?.interview_mode)} /> },
    { key: "start_date", label: translation("key_start_date"), sortKey: "start_date", render: (row) => <span className={shared.countCell}>{formatDisplayDate(row?.start_date)}</span> },
    { key: "end_date", label: translation("key_end_date"), sortKey: "end_date", render: (row) => (row?.end_date ? <span className={shared.countCell}>{formatDisplayDate(row.end_date)}</span> : <TextCell value={translation("key_indefinite")} />) },
    { key: "no_of_items", label: translation("key_no_of_items"), sortKey: "no_of_items", align: "center", render: (row) => <span className={shared.countCell}>{row?.workerPromotionItemModel?.length}</span> },
    ...(canEdit ? [{ key: "actions", label: "", width: 56, align: "center", render: (row) => <EditCell row={row} onEdit={onEdit} /> }] : []),
];
