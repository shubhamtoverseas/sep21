import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import { accrualLabel, capMaxLabel, formatExpiry } from "./leavePolicyConfig";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const NameCell = ({ value }) => (value ? <span className={shared.nameText}>{value}</span> : <Dash />);
const TextCell = ({ value }) => (value ? <span className={shared.softCell}>{value}</span> : <Dash />);
const NumCell = ({ value }) => (value === null || value === undefined || value === "" ? <Dash /> : <span className={shared.countCell}>{value}</span>);
const YesNoCell = ({ flag }) => <span className={shared.softCell}>{translation(Number(flag) === 1 ? "key_yes" : "key_no")}</span>;

const EditCell = ({ row, onEdit }) => (
    <button
        type="button"
        className={shared.rowIconBtn}
        onClick={(event) => { event.stopPropagation(); onEdit(row); }}
        title={translation("key_edit")}
        aria-label={translation("key_edit")}
    >
        <Icon name="edit" size={14} />
    </button>
);

const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
NameCell.propTypes = valueProp;
TextCell.propTypes = valueProp;
NumCell.propTypes = valueProp;
YesNoCell.propTypes = { flag: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
EditCell.propTypes = { row: PropTypes.object, onEdit: PropTypes.func.isRequired };

/** Columns of the local leave-type rows on Add / Edit Leave Policy (client-side, no server sort). */
export const getLeavePolicyRowColumns = ({ onEdit }) => [
    { key: "type", label: translation("key_leave_type"), minWidth: 180, sticky: true, render: (row) => <NameCell value={row?.leave_policy_type} /> },
    { key: "accrual", label: translation("key_accrual"), width: 110, render: (row) => <TextCell value={accrualLabel(row?.accrual_type)} /> },
    { key: "rate", label: translation("key_rate"), width: 90, align: "center", render: (row) => <NumCell value={row?.accrual_rate} /> },
    { key: "from_doh", label: translation("key_from_doh"), width: 100, align: "center", render: (row) => <NumCell value={row?.effective_from_date_of_hire} /> },
    { key: "expiry", label: translation("key_expiry"), width: 120, render: (row) => <TextCell value={formatExpiry(row?.expiry_value)} /> },
    { key: "carry_forward", label: translation("key_carry_forward"), width: 120, render: (row) => <YesNoCell flag={row?.carry_forward} /> },
    { key: "carry_forward_max", label: `${translation("key_carry_forward")} ${translation("key_max")}`, width: 140, align: "center", render: (row) => <NumCell value={capMaxLabel(row?.carry_forward, row?.carry_forward_limit, row?.carry_forward_max, row?.carry_forward_max_type)} /> },
    { key: "encashment", label: translation("key_encashment"), width: 110, render: (row) => <YesNoCell flag={row?.encashment} /> },
    { key: "encash_max", label: translation("key_encash_max"), width: 120, align: "center", render: (row) => <NumCell value={capMaxLabel(row?.encashment, row?.encashment_limit, row?.encashment_max, row?.encashment_max_type)} /> },
    { key: "threshold", label: translation("key_threshold"), width: 100, align: "center", render: (row) => <NumCell value={row?.threshold} /> },
    { key: "annual_total", label: translation("key_annual_total"), width: 120, align: "center", render: (row) => <NumCell value={row?.annual_total} /> },
    { key: "actions", label: "", width: 56, align: "center", render: (row) => <EditCell row={row} onEdit={onEdit} /> },
];
