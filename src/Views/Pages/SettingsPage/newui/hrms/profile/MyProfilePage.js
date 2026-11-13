import React from "react";
import dayjs from "dayjs";
import Icon from "../../../../../../components/Icon/Icon";
import ProfilePhotoDialog from "./ProfilePhotoDialog";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import userThumbnail from "../../../../../../assets/img/nouser.jpeg";
import translation from "../../../../../../utils/translation";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import styles from "../Hrms.module.css";
import useMyProfile from "./useMyProfile";
import ProfileBasicInfoTab from "./ProfileBasicInfoTab";
import ProfileSalaryTab from "./ProfileSalaryTab";
import ProfileSecurityTab from "./ProfileSecurityTab";
import { PROFILE_JOINED_DATE_FORMAT, PROFILE_TAB } from "../../settingsNewUiConstants";
import { headingCase } from "../../../../../../utils/utils";

/** Ports MyProfile.js — identity header + stats, tabs (Basic · Salary & Benefits · Security). */
const MyProfilePage = () => {
    const profile = useMyProfile();
    const { profileData, currentUser } = profile;

    if (!profile.isAuthorized) {
        ShowToast("error", translation("key_you_are_not_authorized_to_access_this_page"));
        return null;
    }

    const fullName = `${currentUser?.staff?.first_name ?? ""} ${currentUser?.staff?.last_name ?? ""}`.trim();
    const roleValue = profile.isPartner ? translation("key_partner") : (profileData?.role_name || translation("key_na"));
    const joinedValue = profileData?.date_of_joining ? dayjs(profileData.date_of_joining).format(PROFILE_JOINED_DATE_FORMAT) : translation("key_na");

    const renderTab = () => {
        switch (profile.activeTab) {
            case PROFILE_TAB.SALARY:
                return <ProfileSalaryTab profileData={profileData} />;
            case PROFILE_TAB.SECURITY:
                return <ProfileSecurityTab profileData={profileData} />;
            default:
                return <ProfileBasicInfoTab profileData={profileData} staffType={profile.staffType} />;
        }
    };

    return (
        <div className={listStyles.pageWrap}>
            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{headingCase(translation("key_my_profile"))}</h1>
                </div>
            </div>

            {profile.isLoading ? (
                <div className={shared.loadingState}>{translation("key_loading")}…</div>
            ) : (
                <>
                    <div className={styles.profileHead}>
                        <div className={styles.avatarWrap}>
                            <img src={profile.profileImage || userThumbnail} className={styles.avatar} alt="" loading="lazy" width={64} height={64} />
                            <button type="button" className={styles.avatarEdit} onClick={profile.openPhotoPopup} title={translation("key_update_profile_photo")} aria-label={translation("key_update_profile_photo")}>
                                <Icon name="edit" size={11} />
                            </button>
                        </div>
                        <div className={styles.profileIdentity}>
                            <p className={styles.profileName}>{fullName}</p>
                            <p className={styles.profileRole}>{currentUser?.role?.name ?? translation("key_na")}</p>
                        </div>
                        {/* HR02 (10 Nov package, settles U-0434): the header is Role · Joined Company · Direct Manager —
                            Agency and Branch leave the header; the actual mapping lives read-only in the details section.
                            Direct Manager shows the honest em dash until GET /hrms/profile carries it (backend ask). */}
                        <div className={styles.profileStats} data-mc-profile-stats="3">
                            <div className={styles.profileStat}>
                                <p className={styles.profileStatLabel}>{translation("key_role")}</p>
                                <p className={styles.profileStatValue}>{roleValue}</p>
                            </div>
                            <div className={styles.profileStat}>
                                <p className={styles.profileStatLabel}>{translation("key_joined_company")}</p>
                                <p className={styles.profileStatValue}>{joinedValue}</p>
                            </div>
                            <div className={styles.profileStat}>
                                <p className={styles.profileStatLabel}>{translation("key_direct_manager")}</p>
                                <p className={styles.profileStatValue}>{profileData?.direct_manager_name || profileData?.manager_name || "—"}</p>
                            </div>
                        </div>
                    </div>

                    <div className={shared.tabStrip} role="tablist">
                        {profile.tabs.map((tab) => {
                            const active = tab.key === profile.activeTab;
                            return (
                                <button key={tab.key} type="button" role="tab" aria-selected={active} className={`${shared.tabStripItem} ${active ? shared.tabStripActive : ""}`} onClick={() => profile.setActiveTab(tab.key)}>
                                    {translation(tab.labelKey)}
                                </button>
                            );
                        })}
                    </div>

                    {renderTab()}
                </>
            )}

            {profile.isPhotoPopupOpen && (
                <ProfilePhotoDialog onClose={profile.closePhotoPopup} onRefresh={profile.onPhotoUploaded} existingImageUrl={profile.profileImage} />
            )}
        </div>
    );
};

export default MyProfilePage;
