import { useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { fetchProfileData } from "../../../../../../redux/Slices/profile/ProfileSlice";
import { setUserProfile } from "../../../../../../redux/Slices/settings/users/UsersSlice";
import { getCurrentUser } from "../../../../../../services/commonService";
import { useHrmsPermissions } from "../../../../../../utils/permissions/hrmsPermissionsUtils";
import { HRMS_LOADING_STATUS, PROFILE_IMAGE_FIELD, PROFILE_REFRESH_ACTION, PROFILE_TAB, PROFILE_TABS, STAFF_TYPE } from "../../settingsNewUiConstants";

const selectProfile = (state) => ({
    profileData: state.profile.profileData,
    status: state.profile.status,
});

/** Ports MyProfile.js: profile fetch/refresh, photo popup, tab set (partner has no salary tab). */
const useMyProfile = () => {
    const dispatch = useDispatch();
    const slice = useSelector(selectProfile, shallowEqual);
    const { permissionList } = useSelector((state) => state.users);
    const { canViewMyProfile } = useHrmsPermissions(permissionList);
    const currentUser = useMemo(() => getCurrentUser()?.data, []);
    const staffType = useMemo(() => currentUser?.staff?.staff_type, [currentUser]);
    const [isPhotoPopupOpen, setIsPhotoPopupOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(PROFILE_TAB.BASIC);

    const handleRefreshProfile = useCallback((action) => {
        dispatch(fetchProfileData()).then((res) => {
            if (!res.error && action === PROFILE_REFRESH_ACTION.UPLOAD_PHOTO) {
                dispatch(setUserProfile(res?.payload?.data?.[PROFILE_IMAGE_FIELD] || ""));
            }
        });
    }, [dispatch]);

    useEffect(() => {
        handleRefreshProfile(PROFILE_REFRESH_ACTION.LIST);
    }, [handleRefreshProfile]);

    const tabs = useMemo(
        () => (staffType === STAFF_TYPE.PARTNER ? PROFILE_TABS.filter((tab) => tab.key !== PROFILE_TAB.SALARY) : PROFILE_TABS),
        [staffType]
    );

    const openPhotoPopup = useCallback(() => setIsPhotoPopupOpen(true), []);
    const closePhotoPopup = useCallback(() => setIsPhotoPopupOpen(false), []);
    const onPhotoUploaded = useCallback(() => handleRefreshProfile(PROFILE_REFRESH_ACTION.UPLOAD_PHOTO), [handleRefreshProfile]);

    return {
        isAuthorized: Boolean(canViewMyProfile) || staffType === STAFF_TYPE.PARTNER,
        isLoading: slice.status === HRMS_LOADING_STATUS,
        profileData: slice.profileData,
        currentUser,
        staffType,
        isPartner: staffType === STAFF_TYPE.PARTNER,
        tabs,
        activeTab,
        setActiveTab,
        isPhotoPopupOpen,
        openPhotoPopup,
        closePhotoPopup,
        onPhotoUploaded,
        profileImage: slice.profileData?.[PROFILE_IMAGE_FIELD],
    };
};

export default useMyProfile;
