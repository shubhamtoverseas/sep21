import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Icon from "../../../../components/Icon/Icon";
import translation from "../../../../utils/translation";
import { useSettingsPermissions } from "../../../../utils/permissions/settingsPermissionsUtils";
import { useConfigurationPermissions } from "../../../../utils/permissions/configurationPermissionUtils";
import { useUserPermissions } from "../../../../utils/permissions/userPermissionsUtils";
import { useShiftManagementPermissions } from "../../../../utils/permissions/shiftManagementPermissionUtils";
import { useLeaveManagementPermissions } from "../../../../utils/permissions/leaveManagementPermissionUtils";
import listStyles from "../../Invoice/InvoiceList.module.css";
import styles from "./SettingsHome.module.css";
import { SETTINGS_GROUPS, SETTINGS_PERMISSION_SCOPE } from "./settingsNewUiConstants";
import { headingCase } from "../../../../utils/utils";

const SettingsGroupCard = ({ titleKey, links }) => (
    <section className={styles.groupCard} aria-labelledby={`settings-group-${titleKey}`}>
        <h2 id={`settings-group-${titleKey}`} className={styles.groupTitle}>{headingCase(translation(titleKey))}</h2>
        <ul className={styles.linkList}>
            {links.map((item) => (
                <li key={item.id}>
                    <Link to={item.link} className={styles.link}>
                        <span>{item.label || translation(item.name)}</span>
                        <Icon name="chev_right" size={12} className={styles.linkChevron} />
                    </Link>
                </li>
            ))}
        </ul>
    </section>
);

SettingsGroupCard.propTypes = {
    titleKey: PropTypes.string.isRequired,
    links: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        link: PropTypes.string.isRequired,
    })).isRequired,
};

const SettingsHome = () => {
    const { permissionList } = useSelector((state) => state.users);

    const permissionsByScope = {
        [SETTINGS_PERMISSION_SCOPE.SETTINGS]: useSettingsPermissions(permissionList),
        [SETTINGS_PERMISSION_SCOPE.USERS]: useUserPermissions(permissionList),
        [SETTINGS_PERMISSION_SCOPE.LEAVE]: useLeaveManagementPermissions(permissionList),
        [SETTINGS_PERMISSION_SCOPE.SHIFT]: useShiftManagementPermissions(permissionList),
        [SETTINGS_PERMISSION_SCOPE.CONFIGURATION]: useConfigurationPermissions(permissionList),
    };

    const groups = useMemo(
        () => SETTINGS_GROUPS
            .map((group) => ({ ...group, links: group.getLinks(permissionsByScope[group.scope]).filter((item) => item.isPermitted) }))
            .filter((group) => group.links.length > 0),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [permissionList]
    );

    return (
        <div className={listStyles.pageWrap}>
            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{headingCase(translation("key_settings"))}</h1>
                </div>
            </div>

            <div className={styles.groups}>
                {groups.map((group) => (
                    <SettingsGroupCard key={group.id} titleKey={group.titleKey} links={group.links} />
                ))}
            </div>
        </div>
    );
};

export default SettingsHome;
