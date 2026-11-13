import React from "react";
import PropTypes from "prop-types";
import constData from "../../../../components/ReusableComponents/constants";
import translation from "../../../../utils/translation";
import { getInitials } from "../../../../utils/utils";
import { getEngagementKind } from "../../../../services/commonService";
import EngagementIcon from "../../../../components/ui/EngagementIcon";
import listStyles from "../../Invoice/InvoiceList.module.css";
import styles from "./EmployerDashboard.module.css";
import { districtName } from "./employerDashboardConfig";
import { primaryLanguageLabel } from "./usePrimaryLanguages";
import { EMPLOYER_DASHBOARD_TRACKS } from "./employerNewUiConstants";

const fullName = (row) => [row?.name, row?.surname].filter(Boolean).join(" ").trim();

const displayName = (row) => {
    const english = fullName(row);
    return row?.chinese_name ? `${english} · ${row.chinese_name}` : english;
};

const employerCode = (row) => row?.reference_id || row?.employer_reference_id || "";

/* prototype rowLabel: "Open Employer Details — Name · Code" (audit L13) */
const employerRowOpenLabel = (row) =>
    `${translation("key_open")} ${translation("key_employer_details")} — ${[displayName(row), employerCode(row)].filter(Boolean).join(" · ")}`;

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

/* DASH §5: the leading glyph shows current engagement (App / Web / staff-assisted), not initials */
const NameCell = ({ row }) => (
    <span className={styles.nameCell}>
        <EngagementIcon kind={getEngagementKind(row)} />
        <span className={styles.nameText}>{displayName(row) || <Dash />}</span>
    </span>
);

/* DASH §6.1 / §7.5 (U-0029): Mobile and WhatsApp are masked for every viewer BY THE SERVER (`/get-employer-list`, admin API
   CHANGE_HISTORY 228 / 243) — the cell renders what the API gives ("+<cc> •••• 1234") and adds no mask of its own (backend
   22 Oct); no title, label, tooltip or copy path to a fuller value */
const dashPhone = (code, number) => {
    const cc = String(code || "").replace(/^\+/, "").trim();
    const shown = String(number ?? "").trim();
    return cc ? `+${ cc } ${ shown }` : shown;
};
const PhoneCell = ({ countryCode, number }) => {
    if (!number) return <Dash />;
    return <span className={styles.softCell}>{dashPhone(countryCode, number)}</span>;
};

/* own-record code: neutral text, no link treatment — the row opens the record */
const CodeCell = ({ row }) => {
    const code = employerCode(row);
    if (!code) return <Dash />;
    return <span className={styles.codeText}>{code}</span>;
};

/* DASH §1.2 / §14: the owner of the employer's current Job Offer, derived by the server (backend 375 `jo_cs_owner_name`,
   null when there is none or several differ) — an em dash otherwise (audit L6) */
const CsCell = ({ row }) => {
    const name = row?.jo_cs_owner_name;
    if (!name) return <Dash />;
    return (
        <span className={styles.csCell}>
            <span className={styles.csAvatar} aria-hidden="true">{getInitials(name)}</span>
            <span className={styles.csName}>{name}</span>
        </span>
    );
};

const TextCell = ({ value }) => (value ? <span className={styles.softCell}>{value}</span> : <Dash />);

const rowProp = { row: PropTypes.object };
NameCell.propTypes = rowProp;
PhoneCell.propTypes = {
    countryCode: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    number: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
CodeCell.propTypes = rowProp;
CsCell.propTypes = rowProp;
TextCell.propTypes = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };

/* `contactView` (U-0030): without Contact Details View both phone columns stay in the 8-column set and show an em dash */
export const getEmployerDashboardColumns = ({ branchesById, contactView = true }) => [
    {
        key: "name",
        label: translation("key_employer_name"),
        sortKey: constData.EMPLOYER_SORT_KEYS.NAME,
        trackRole: EMPLOYER_DASHBOARD_TRACKS.name.role,
        trackWidth: EMPLOYER_DASHBOARD_TRACKS.name.width,
        sticky: true,
        render: (row) => <NameCell row={row} />,
    },
    {
        key: "code",
        label: translation("key_employer_code"),
        sortKey: constData.EMPLOYER_SORT_KEYS.CODE,
        trackRole: EMPLOYER_DASHBOARD_TRACKS.code.role,
        trackWidth: EMPLOYER_DASHBOARD_TRACKS.code.width,
        render: (row) => <CodeCell row={row} />,
    },
    {
        key: "mobile",
        label: translation("key_mobile"),
        trackRole: EMPLOYER_DASHBOARD_TRACKS.mobile.role,
        trackWidth: EMPLOYER_DASHBOARD_TRACKS.mobile.width,
        render: (row) => (contactView ? <PhoneCell countryCode={row?.country_code} number={row?.mobile_number} /> : <Dash />),
    },
    {
        key: "whatsapp",
        label: translation("key_whatsapp"),
        trackRole: EMPLOYER_DASHBOARD_TRACKS.whatsapp.role,
        trackWidth: EMPLOYER_DASHBOARD_TRACKS.whatsapp.width,
        render: (row) => (contactView ? <PhoneCell countryCode={row?.whatsapp_country_code} number={row?.whatsapp_number} /> : <Dash />),
    },
    {
        key: "language",
        label: translation("key_primary_language"),
        trackRole: EMPLOYER_DASHBOARD_TRACKS.language.role,
        trackWidth: EMPLOYER_DASHBOARD_TRACKS.language.width,
        /* U-0039: the localized Primary Language, else the legacy value exactly as stored */
        render: (row) => <TextCell value={primaryLanguageLabel(row)} />,
    },
    {
        key: "district",
        label: translation("key_district"),
        trackRole: EMPLOYER_DASHBOARD_TRACKS.district.role,
        trackWidth: EMPLOYER_DASHBOARD_TRACKS.district.width,
        render: (row) => <TextCell value={districtName(row)} />,
    },
    {
        key: "cs",
        label: translation("key_cs_owner_jo"),
        trackRole: EMPLOYER_DASHBOARD_TRACKS.cs.role,
        trackWidth: EMPLOYER_DASHBOARD_TRACKS.cs.width,
        render: (row) => <CsCell row={row} />,
    },
    {
        key: "branch",
        label: translation("key_branch"),
        trackRole: EMPLOYER_DASHBOARD_TRACKS.branch.role,
        trackWidth: EMPLOYER_DASHBOARD_TRACKS.branch.width,
        render: (row) => (
            <TextCell value={row?.branch_display_name || row?.branch_name || branchesById[row?.office_location ?? row?.branch_id]?.branch_name} />
        ),
    },
];

export { displayName, employerCode, employerRowOpenLabel, fullName };
