import React from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import translation from "../../../../../utils/translation";
import { ledgerDisplayType } from "../../../../../services/commonService";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "./LeaveLedger.module.css";
import { DATE_DISPLAY_FORMAT, LEDGER_ENTRY_TYPE, LEDGER_SORT_KEYS } from "../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const NameCell = ({ value }) => (value ? <span className={shared.nameText}>{value}</span> : <Dash />);
const TextCell = ({ value }) => (value ? <span className={shared.softCell}>{value}</span> : <Dash />);
const NumCell = ({ value }) => (value === null || value === undefined || value === "" ? <Dash /> : <span className={shared.countCell}>{value}</span>);

const DateCell = ({ value }) => (
    value && dayjs(value).isValid() ? <span className={shared.countCell}>{dayjs(value).format(DATE_DISPLAY_FORMAT)}</span> : <Dash />
);

const EntryTypeCell = ({ type }) => {
    if (!type) return <Dash />;
    const isDebit = type === LEDGER_ENTRY_TYPE.DEBIT;
    return (
        <span className={listStyles.statusTag} data-tone={isDebit ? "red" : "green"}>
            {ledgerDisplayType(type)}
        </span>
    );
};

const CountCell = ({ row }) => {
    if (row?.leave_count === null || row?.leave_count === undefined) return <Dash />;
    const isDebit = row?.type === LEDGER_ENTRY_TYPE.DEBIT;
    return (
        <span className={`${shared.countCell} ${isDebit ? styles.countDebit : styles.countCredit}`}>
            {isDebit ? "−" : "+"}{row.leave_count}
        </span>
    );
};

const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
NameCell.propTypes = valueProp;
TextCell.propTypes = valueProp;
NumCell.propTypes = valueProp;
DateCell.propTypes = valueProp;
EntryTypeCell.propTypes = { type: PropTypes.string };
CountCell.propTypes = { row: PropTypes.object };

export const getLeaveLedgerColumns = () => [
    { key: "leave_type", label: translation("key_leave_type"), sortKey: LEDGER_SORT_KEYS.LEAVE_TYPE, minWidth: 180, sticky: true, render: (row) => <NameCell value={row?.leave_type} /> },
    { key: "date", label: translation("key_date"), sortKey: LEDGER_SORT_KEYS.DATE, width: 120, render: (row) => <DateCell value={row?.created_at} /> },
    { key: "type", label: translation("key_type"), sortKey: LEDGER_SORT_KEYS.TYPE, width: 110, render: (row) => <EntryTypeCell type={row?.type} /> },
    { key: "method", label: translation("key_method"), sortKey: LEDGER_SORT_KEYS.METHOD, width: 160, render: (row) => <TextCell value={row?.display_method} /> },
    { key: "count", label: translation("key_count"), sortKey: LEDGER_SORT_KEYS.COUNT, width: 90, align: "center", render: (row) => <CountCell row={row} /> },
    { key: "balance", label: translation("key_balance"), sortKey: LEDGER_SORT_KEYS.BALANCE, width: 100, align: "center", render: (row) => <NumCell value={row?.balance} /> },
    { key: "comment", label: translation("key_comment"), sortKey: LEDGER_SORT_KEYS.COMMENT, minWidth: 220, render: (row) => <TextCell value={row?.comment} /> },
];
