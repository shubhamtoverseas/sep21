import React, { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { updateProfileData } from "../../../../../../redux/Slices/profile/ProfileSlice";
import { profileSchema } from "../../../my-profile/basic-information/profileSchema";
import { profileUpdate } from "../../../../../../components/ReusableComponents/form-states";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { showSuccessOrError } from "../../../../../../services/commonService";
import translation from "../../../../../../utils/translation";
import styles from "../Hrms.module.css";
import ProfileInfoSection from "./ProfileInfoSection";
import { PROFILE_CARD_FIELDS, PROFILE_JOINED_DATE_FORMAT, STAFF_TYPE } from "../../settingsNewUiConstants";
import { headingCase } from "../../../../../../utils/utils";

const sameValue = (a, b) => JSON.stringify(a ?? "") === JSON.stringify(b ?? "");
const pick = (values, fields) => fields.reduce((acc, field) => { acc[field] = values[field] ?? ""; return acc; }, {});
const failureMessage = (res) => res?.payload?.data?.data?.message || res?.payload?.data?.message || res?.payload?.message || "";
/* backend 341: a 403 duplicate names the field it collides with */
const duplicateField = (message) => (/mobile/i.test(message || "") ? "mobile_number" : null);

/** Ports BasicInfoOfMyProfile.js — four editable sections + documents (internal only). backend 341 (29 Oct): each card
 * posts ONLY its own keys; the record re-read after a save keeps the other cards' unsaved edits (by value); a server
 * refusal lands on the card that saved. */
const ProfileBasicInfoTab = ({ profileData, staffType = "" }) => {
    const dispatch = useDispatch();
    const [isOfficialInformation, setIsOfficialInformation] = useState(false);
    const [isEmergencyContact, setIsEmergencyContact] = useState(false);
    const [isPersonalInfo, setIsPersonalInfo] = useState(false);
    const [isBankInfo, setIsBankInfo] = useState(false);
    const [cardErrors, setCardErrors] = useState({});
    const loadedRef = useRef(null);
    const justSavedRef = useRef(null);

    const { control, formState: { errors }, setValue, getValues, trigger, setError, clearErrors } = useForm({
        resolver: yupResolver(profileSchema),
        defaultValues: profileUpdate,
    });

    useEffect(() => {
        if (!profileData) return;
        const keys = Object.keys(profileUpdate);
        const previous = loadedRef.current;
        const current = getValues();
        const saved = new Set(justSavedRef.current || []);
        keys.forEach((key) => {
            const edited = previous && !saved.has(key) && !sameValue(current[key], previous[key]);
            if (!edited) setValue(key, profileData[key] ?? "");
        });
        loadedRef.current = keys.reduce((acc, key) => { acc[key] = profileData[key] ?? ""; return acc; }, {});
        justSavedRef.current = null;
    }, [profileData, setValue, getValues]);

    /* bug log #103 (fixed 2026-10-18): the save is awaited, the API message is shown, the card closes only on success */
    const saveCard = useCallback(async (card, fields, close) => {
        const valid = await trigger(fields);
        if (!valid) return false;
        setCardErrors((prev) => ({ ...prev, [card]: "" }));
        try {
            const res = await dispatch(updateProfileData(pick(getValues(), fields)));
            showSuccessOrError(res);
            if (res?.error || res?.payload?.status === false) {
                const message = failureMessage(res);
                const field = duplicateField(message);
                if (field && fields.includes(field)) setError(field, { type: "server", message });
                else setCardErrors((prev) => ({ ...prev, [card]: message }));
                return false;
            }
            justSavedRef.current = fields;
            if (close) close(false);
            return true;
        } catch (error) {
            ShowToast("error", translation("key_failed_to_save_profile_data"));
            return false;
        }
    }, [dispatch, getValues, trigger, setError]);

    const cancelCard = useCallback((fields, close) => {
        fields.forEach((field) => setValue(field, loadedRef.current ? loadedRef.current[field] : profileUpdate[field]));
        clearErrors(fields);
        close(false);
    }, [setValue, clearErrors]);

    const common = { control, errors };
    const birthDate = profileData?.birth_date ? dayjs(String(profileData.birth_date).substring(0, 10)) : null;

    return (
        <div className={styles.sectionGrid}>
            <ProfileInfoSection
                {...common}
                title={headingCase(translation("key_official_information"))}
                isEditable={isOfficialInformation}
                setIsEditable={setIsOfficialInformation}
                handleSave={() => saveCard("official", PROFILE_CARD_FIELDS.official, setIsOfficialInformation)}
                handleCancel={() => cancelCard(PROFILE_CARD_FIELDS.official, setIsOfficialInformation)}
                error={cardErrors.official}
                fields={[
                    /* phone fields cap at 20 typed characters (stored values may carry "+" / spaces, so no digit strip) */
                    { label: translation("key_company_mobile"), value: profileData?.mobile_number, name: "mobile_number", maxLength: 20 },
                    { label: translation("key_email"), value: profileData?.email, name: "email" },
                    /* backend 341 §5: the date reads in the Joined Company format */
                    { label: translation("key_date_of_birth"), value: birthDate && birthDate.isValid() ? birthDate.format(PROFILE_JOINED_DATE_FORMAT) : "", name: "birth_date", dataType: "date" },
                    { label: translation("key_address"), value: profileData?.address1, name: "address1" },
                    /* HR02 (10 Nov package / Priyanka 11 Nov): the Agency / Branch mapping left the page header and
                       reads here, read-only — not in PROFILE_CARD_FIELDS.official, so a card save never posts them */
                    { label: translation("key_agency"), value: profileData?.agency_name, name: "agency_name", readOnly: true },
                    { label: translation("key_branch"), value: profileData?.branch_name, name: "branch_name", readOnly: true },
                ]}
            />
            <ProfileInfoSection
                {...common}
                title={headingCase(translation("key_emergency_contact"))}
                isEditable={isEmergencyContact}
                setIsEditable={setIsEmergencyContact}
                handleSave={() => saveCard("emergency", PROFILE_CARD_FIELDS.emergency, setIsEmergencyContact)}
                handleCancel={() => cancelCard(PROFILE_CARD_FIELDS.emergency, setIsEmergencyContact)}
                error={cardErrors.emergency}
                fields={[
                    { label: translation("key_name"), value: profileData?.emergency_contact_name, name: "emergency_contact_name" },
                    { label: translation("key_relationship"), value: profileData?.emergency_contact_relationship, name: "emergency_contact_relationship" },
                    { label: translation("key_phone"), value: profileData?.emergency_contact_phone, name: "emergency_contact_phone", maxLength: 20 },
                ]}
            />
            <ProfileInfoSection
                {...common}
                title={headingCase(translation("key_personal_contact_details"))}
                isEditable={isPersonalInfo}
                setIsEditable={setIsPersonalInfo}
                handleSave={() => saveCard("personal", PROFILE_CARD_FIELDS.personal, setIsPersonalInfo)}
                handleCancel={() => cancelCard(PROFILE_CARD_FIELDS.personal, setIsPersonalInfo)}
                error={cardErrors.personal}
                fields={[
                    { label: translation("key_whatsapp"), value: profileData?.whatsapp, name: "whatsapp", maxLength: 20 },
                    { label: translation("key_telephone"), value: profileData?.telephone, name: "telephone", maxLength: 20 },
                    { label: translation("key_email"), value: profileData?.personal_email, name: "personal_email" },
                    { label: translation("key_skype"), value: profileData?.skype, name: "skype" },
                    { label: translation("key_facebook"), value: profileData?.facebook, name: "facebook" },
                    { label: translation("key_instagram"), value: profileData?.instagram, name: "instagram" },
                    { label: translation("key_airtable"), value: profileData?.airtable, name: "airtable" },
                ]}
            />
            <ProfileInfoSection
                {...common}
                title={headingCase(translation("key_bank_information"))}
                isEditable={isBankInfo}
                setIsEditable={setIsBankInfo}
                handleSave={() => saveCard("bank", PROFILE_CARD_FIELDS.bank, setIsBankInfo)}
                handleCancel={() => cancelCard(PROFILE_CARD_FIELDS.bank, setIsBankInfo)}
                error={cardErrors.bank}
                fields={[
                    { label: translation("key_bank_name"), value: profileData?.bank_name, name: "bank_name" },
                    { label: translation("key_bank_account_number"), value: profileData?.bank_account_number, name: "bank_account_number" },
                    { label: translation("key_bank_account_name"), value: profileData?.bank_account_name, name: "bank_account_name" },
                    { label: translation("key_bank_branch_code"), value: profileData?.bank_branch_code, name: "bank_branch_code" },
                    { label: translation("key_remarks"), value: profileData?.bank_remarks, name: "bank_remarks" },
                ]}
            />
            {staffType !== STAFF_TYPE.PARTNER && (
                <ProfileInfoSection
                    {...common}
                    title={headingCase(translation("key_documents_other"))}
                    isEditIcon={false}
                    /* an uploaded document posts only its own key (backend 341 / 349) */
                    handleSave={(fields) => saveCard("documents", fields, null)}
                    error={cardErrors.documents}
                    fields={[
                        { label: translation("key_hkid_copy"), value: profileData?.bank_hkid_copy, name: "bank_hkid_copy", isLink: true },
                        { label: translation("key_bank_copy"), value: profileData?.bank_copy, name: "bank_copy", isLink: true },
                        { label: translation("key_employment_contract_copy"), value: profileData?.bank_employment_contract, name: "bank_employment_contract", isLink: true },
                    ]}
                />
            )}
        </div>
    );
};

ProfileBasicInfoTab.propTypes = {
    profileData: PropTypes.object,
    staffType: PropTypes.string,
};

export default ProfileBasicInfoTab;
