import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import { SHIFT_CODE_SORT_KEYS } from "../settingsNewUiConstants";
import { formatDurationLabel } from "./shiftCodeConfig";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const CodeCell = ({ value }) => (value ? <span className={shared.codeCell}>{value}</span> : <Dash />);
const TimeCell = ({ value }) => (value ? <span className={shared.countCell}>{value}</span> : <Dash />);
const TextCell = ({ value }) => (value ? <span className={shared.softCell}>{value}</span> : <Dash />);

const EditCell = ({ row, canEdit, onEdit }) => (
    <button
        type="button"
        className={shared.rowIconBtn}
        disabled={!canEdit}
        onClick={(event) => { event.stopPropagation(); onEdit(row); }}
        title={translation("key_edit_shift_code")}
        aria-label={translation("key_edit_shift_code")}
    >
        <Icon name="edit" size={14} />
    </button>
);

const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
CodeCell.propTypes = valueProp;
TimeCell.propTypes = valueProp;
TextCell.propTypes = valueProp;
EditCell.propTypes = { row: PropTypes.object, canEdit: PropTypes.bool, onEdit: PropTypes.func.isRequired };

export const getShiftCodeListColumns = ({ canEdit, onEdit }) => [
    {
        key: "code",
        label: translation("key_shift_code"),
        sortKey: SHIFT_CODE_SORT_KEYS.CODE,
        minWidth: 180,
        sticky: true,
        render: (row) => <CodeCell value={row?.shift_code} />,
    },
    {
        key: "duration",
        label: translation("key_duration").trim(),
        width: 140,
        render: (row) => <TextCell value={formatDurationLabel(row?.duration)} />,
    },
    {
        key: "start",
        label: translation("key_shift_start"),
        sortKey: SHIFT_CODE_SORT_KEYS.START,
        width: 130,
        render: (row) => <TimeCell value={row?.shift_start_time} />,
    },
    {
        key: "end",
        label: translation("key_shift_end"),
        sortKey: SHIFT_CODE_SORT_KEYS.END,
        width: 130,
        render: (row) => <TimeCell value={row?.shift_end_time} />,
    },
    {
        key: "actions",
        label: "",
        width: 56,
        align: "center",
        render: (row) => <EditCell row={row} canEdit={canEdit} onEdit={onEdit} />,
    },
];
