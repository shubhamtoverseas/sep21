import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Btn from "../../../../../../components/ui/Btn";
import { Switch } from "../../../../../../components/ui/FormControls";
import ChangePasswordPopup from "../../../../../../components/Layout/popups/my-profile/ChangePasswordPopup";
import { updateProfileData } from "../../../../../../redux/Slices/profile/ProfileSlice";
import translation from "../../../../../../utils/translation";
import shared from "../../settings-newui.module.css";
import styles from "../Hrms.module.css";

/** Ports SecurityFormOfMyProfile.js — MFA toggle (saves whole profile) + hosted legacy change-password popup. */
const ProfileSecurityTab = ({ profileData }) => {
    const dispatch = useDispatch();
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [isMfaEnabled, setIsMfaEnabled] = useState(Boolean(profileData?.multifactor_email_authentication));

    const handleToggleMfa = useCallback(() => {
        setIsMfaEnabled(!isMfaEnabled);
        dispatch(updateProfileData({ ...profileData, multifactor_email_authentication: !isMfaEnabled }));
    }, [dispatch, isMfaEnabled, profileData]);

    return (
        <>
            <div className={styles.securityCard}>
                <div className={styles.securityText}>
                    <p className={styles.securityTitle}>{translation("key_multi_factor_authentication_email_based_otp")}</p>
                </div>
                <Switch id="multifactor_email_authentication" checked={isMfaEnabled} onChange={handleToggleMfa} />
            </div>

            <div className={styles.securityCard}>
                <div className={styles.securityText}>
                    <p className={styles.securityTitle}>{translation("key_password")}</p>
                    <p className={styles.securityHint}>{translation("key_last_modified_6_months_ago")}</p>
                </div>
                <Btn variant="secondary" type="button" onClick={() => setIsChangePasswordOpen(true)}>{translation("key_change_password")}</Btn>
            </div>

            {isChangePasswordOpen && (
                <div className={shared.legacyModalHost}>
                    <ChangePasswordPopup onClose={() => setIsChangePasswordOpen(false)} />
                </div>
            )}
        </>
    );
};

ProfileSecurityTab.propTypes = {
    profileData: PropTypes.object,
};

export default ProfileSecurityTab;
