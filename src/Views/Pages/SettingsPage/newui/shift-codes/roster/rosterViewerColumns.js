import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../../../utils/translation";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import styles from "./RosterViewer.module.css";
import { ROSTER_SORT_KEYS } from "../../settingsNewUiConstants";
import { formatRosterDate, formatRosterDay } from "./rosterViewerConfig";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const NameCell = ({ value }) => (value ? <span className={shared.nameText}>{value}</span> : <Dash />);
const TextCell = ({ value }) => (value ? <span className={shared.softCell}>{value}</span> : <Dash />);
const MonoCell = ({ value }) => (value ? <span className={shared.countCell}>{value}</span> : <Dash />);

const ShiftCodeCell = ({ row }) => {
    if (!row?.shift_code) return <Dash />;
    return (
        <span className={styles.codeCell}>
            <span className={shared.codeCell}>{row.shift_code}</span>
            {row?.shift_code_description && <span className={styles.codeDesc}>{row.shift_code_description}</span>}
        </span>
    );
};

const HolidayCell = ({ flag }) => (
    <span className={listStyles.statusTag} data-tone={flag ? "orange" : "neutral"}>
        {translation(flag ? "key_yes" : "key_no")}
    </span>
);

const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
NameCell.propTypes = valueProp;
TextCell.propTypes = valueProp;
MonoCell.propTypes = valueProp;
ShiftCodeCell.propTypes = { row: PropTypes.object };
HolidayCell.propTypes = { flag: PropTypes.oneOfType([PropTypes.bool, PropTypes.number]) };

export const getRosterViewerColumns = () => [
    { key: "username", label: translation("key_username"), sortKey: ROSTER_SORT_KEYS.USERNAME, minWidth: 200, sticky: true, render: (row) => <NameCell value={row?.username} /> },
    { key: "date", label: translation("key_date"), sortKey: ROSTER_SORT_KEYS.DATE, width: 120, render: (row) => <MonoCell value={formatRosterDate(row?.shift_date)} /> },
    { key: "day", label: translation("key_day"), width: 120, render: (row) => <TextCell value={formatRosterDay(row?.shift_date)} /> },
    { key: "start", label: translation("key_shift_start"), sortKey: ROSTER_SORT_KEYS.START, width: 120, render: (row) => <MonoCell value={row?.shift_start_time} /> },
    { key: "end", label: translation("key_shift_end"), sortKey: ROSTER_SORT_KEYS.END, width: 120, render: (row) => <MonoCell value={row?.shift_end_time} /> },
    { key: "code", label: translation("key_shift_code"), sortKey: ROSTER_SORT_KEYS.CODE, minWidth: 180, render: (row) => <ShiftCodeCell row={row} /> },
    { key: "holiday", label: translation("key_holiday"), sortKey: ROSTER_SORT_KEYS.HOLIDAY, width: 100, render: (row) => <HolidayCell flag={Boolean(row?.has_holiday ?? row?.is_holiday)} /> },
];
