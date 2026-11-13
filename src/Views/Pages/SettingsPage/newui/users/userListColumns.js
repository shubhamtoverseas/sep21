import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { toTitleCase } from "../../../../../utils/utils";
import { timeSince } from "../../../../../services/commonService";
import userThumbnail from "../../../../../assets/img/nouser.jpeg";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "./UserForm.module.css";
import { USER_SORT_KEYS } from "../settingsNewUiConstants";

const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const NameCell = ({ row }) => (
    <span className={styles.userCell}>
        <img
            src={row?.full_final_image || userThumbnail}
            className={styles.userAvatar}
            alt=""
            width={26}
            height={26}
            loading="lazy"
        />
        <span className={shared.nameText}>{row?.name || <Dash />}</span>
    </span>
);

const TextCell = ({ value }) => (value ? <span className={shared.softCell}>{value}</span> : <Dash />);

const ActivityCell = ({ value }) => (
    value ? <span className={shared.countCell}>{timeSince(new Date(value))}</span> : <Dash />
);

const EditCell = ({ row, canEdit, onEdit }) => (
    <button
        type="button"
        className={shared.rowIconBtn}
        disabled={!canEdit}
        onClick={(event) => { event.stopPropagation(); onEdit(row); }}
        title={toTitleCase(translation("key_edit_user"))}
        aria-label={toTitleCase(translation("key_edit_user"))}
    >
        <Icon name="edit" size={14} />
    </button>
);

/* Settings → People → Users → user → Permissions (client preview 22 Oct 2026): opens the account on its Permissions tab */
const PermissionsCell = ({ row, canEdit, onPermissions }) => (
    <button
        type="button"
        className={shared.rowIconBtn}
        disabled={!canEdit}
        onClick={(event) => { event.stopPropagation(); onPermissions(row); }}
        title={toTitleCase(translation("key_permissions"))}
        aria-label={toTitleCase(translation("key_permissions"))}
    >
        <Icon name="shield" size={14} />
    </button>
);

const valueProp = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };
NameCell.propTypes = { row: PropTypes.object };
TextCell.propTypes = valueProp;
ActivityCell.propTypes = valueProp;
EditCell.propTypes = { row: PropTypes.object, canEdit: PropTypes.bool, onEdit: PropTypes.func.isRequired };
PermissionsCell.propTypes = { row: PropTypes.object, canEdit: PropTypes.bool, onPermissions: PropTypes.func.isRequired };

export const getUserListColumns = ({ canEdit, onEdit, onPermissions }) => [
    {
        key: "name",
        label: translation("key_name"),
        sortKey: USER_SORT_KEYS.NAME,
        minWidth: 220,
        sticky: true,
        render: (row) => <NameCell row={row} />,
    },
    {
        key: "staff_type",
        label: translation("key_staff_type"),
        sortKey: USER_SORT_KEYS.STAFF_TYPE,
        width: 120,
        render: (row) => <TextCell value={row?.staff_type ? toTitleCase(row.staff_type) : ""} />,
    },
    {
        key: "email",
        label: translation("key_email"),
        sortKey: USER_SORT_KEYS.EMAIL,
        minWidth: 220,
        render: (row) => <TextCell value={row?.email} />,
    },
    {
        key: "role",
        label: translation("key_role"),
        sortKey: USER_SORT_KEYS.ROLE,
        width: 160,
        render: (row) => <TextCell value={row?.role} />,
    },
    {
        key: "activity",
        label: translation("key_recent_activity"),
        sortKey: USER_SORT_KEYS.ACTIVITY,
        width: 150,
        render: (row) => <ActivityCell value={row?.last_activity_at} />,
    },
    {
        key: "manager",
        label: translation("key_direct_manager"),
        sortKey: USER_SORT_KEYS.MANAGER,
        width: 170,
        render: (row) => <TextCell value={row?.manager_name} />,
    },
    {
        key: "permissions",
        label: "",
        width: 56,
        align: "center",
        render: (row) => <PermissionsCell row={row} canEdit={canEdit} onPermissions={onPermissions} />,
    },
    {
        key: "actions",
        label: "",
        width: 56,
        align: "center",
        render: (row) => <EditCell row={row} canEdit={canEdit} onEdit={onEdit} />,
    },
];
