import React, { useCallback } from "react";
import PropTypes from "prop-types";
import { Controller } from "react-hook-form";
import { useDispatch } from "react-redux";
import Btn from "../../../../../../components/ui/Btn";
import Icon from "../../../../../../components/Icon/Icon";
import { TextInput } from "../../../../../../components/ui/FormControls";
import { clearProfileLoading, setProfileLoading } from "../../../../../../redux/Slices/profile/ProfileSlice";
import { uploadFile } from "../../../../../../services/commonService";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import translation from "../../../../../../utils/translation";
import shared from "../../settings-newui.module.css";
import styles from "../Hrms.module.css";
import { PROFILE_DATE_FIELD, PROFILE_DATE_VALUE_LENGTH, PROFILE_DOCUMENT_ACCEPT, PROFILE_DOCUMENT_UPLOAD_FOLDERS, PROFILE_READONLY_FIELD } from "../../settingsNewUiConstants";

/** Legacy birth_date guard: trim a datetime string to its YYYY-MM-DD part. */
const toInputValue = (name, value) => {
    const inputValue = value ?? "";
    if (name === PROFILE_DATE_FIELD && typeof inputValue === "string" && inputValue.length > PROFILE_DATE_VALUE_LENGTH) {
        return inputValue.substring(0, PROFILE_DATE_VALUE_LENGTH);
    }
    return inputValue;
};

/** Ports ProfileInfoSection.js — a titled card of label/value rows, inline-editable, with PDF upload rows. */
const ProfileInfoSection = ({ title, isEditable = false, setIsEditable, fields, handleSave, handleCancel, control, errors, error, isEditIcon = true }) => {
    const dispatch = useDispatch();

    /* backend 349: each document uploads to its own allowed folder; backend 341: only that key is posted after the upload */
    const handleFileUploadChange = useCallback(async (event, onChange, fieldName) => {
        const file = event.target.files[0];
        if (!file) return;
        try {
            dispatch(setProfileLoading());
            const uploaded = await uploadFile([{ file, name: PROFILE_DOCUMENT_UPLOAD_FOLDERS[fieldName] }]);
            dispatch(clearProfileLoading());
            if (!uploaded?.url) { ShowToast("error", uploaded?.message || translation("key_failed_to_upload_file")); return; }
            onChange(uploaded.url);
            handleSave([fieldName]);
        } catch (err) {
            dispatch(clearProfileLoading());
            ShowToast("error", err.message);
        }
    }, [dispatch, handleSave]);

    return (
        <section className={styles.sectionCard}>
            <div className={styles.sectionCardHead}>
                <h2 className={shared.sectionEyebrow}>{title}</h2>
                {isEditIcon && (
                    isEditable ? (
                        <span className={shared.rowActions}>
                            {handleCancel && <Btn variant="secondary" type="button" onClick={handleCancel}>{translation("key_cancel")}</Btn>}
                            <Btn variant="primary" type="button" onClick={() => handleSave()}>{translation("key_save")}</Btn>
                        </span>
                    ) : (
                        <button type="button" className={shared.rowIconBtn} onClick={() => setIsEditable(true)} title={translation("key_edit")} aria-label={translation("key_edit")}>
                            <Icon name="edit" size={14} />
                        </button>
                    )
                )}
            </div>
            {error && <p className={styles.infoError} role="alert" data-mc-card-error="">{error}</p>}

            {fields.map((field) => (
                <div className={styles.infoRow} key={field.name}>
                    <label className={styles.infoLabel} htmlFor={`profile-${field.name}`}>{field.label}</label>
                    {field.isLink ? (
                        field.value ? (
                            <a href={field.value} target="_blank" rel="noreferrer" className={styles.fileLink} title={field.value}>
                                <Icon name="download" size={13} /> {field.value}
                            </a>
                        ) : (
                            <Controller name={field.name} control={control} render={({ field: { onChange } }) => (
                                <label className={styles.uploadLink}>
                                    <input type="file" className={styles.uploadInput} accept={PROFILE_DOCUMENT_ACCEPT} onChange={(event) => handleFileUploadChange(event, onChange, field.name)} />
                                    <Icon name="upload" size={13} /> {translation("key_click_to_upload")}
                                </label>
                            )} />
                        )
                    ) : isEditable && field.name !== PROFILE_READONLY_FIELD && !field.readOnly ? (
                        <div className={styles.infoEdit}>
                            <Controller name={field.name} control={control} render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput id={`profile-${field.name}`} type={field.dataType || "text"} maxLength={field.maxLength} value={toInputValue(field.name, value)} onChange={onChange} onBlur={onBlur} invalid={Boolean(errors[field.name])} />
                            )} />
                            {errors[field.name] && <span className={styles.infoError}>{errors[field.name].message}</span>}
                        </div>
                    ) : (
                        <span className={styles.infoValue} title={field.value || ""}>{field.value || translation("key_na")}</span>
                    )}
                </div>
            ))}
        </section>
    );
};

ProfileInfoSection.propTypes = {
    title: PropTypes.string.isRequired,
    isEditable: PropTypes.bool,
    setIsEditable: PropTypes.func,
    /* (fields?) → the card's own keys are posted; a document upload passes its single key */
    handleSave: PropTypes.func.isRequired,
    handleCancel: PropTypes.func,
    /* the server's refusal of this card's last Save */
    error: PropTypes.string,
    fields: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        dataType: PropTypes.string,
        maxLength: PropTypes.number,
        isLink: PropTypes.bool,
        /* HR02: a mapping attribute shown on the card but never editable (and never posted — keep it out of the card's save fields) */
        readOnly: PropTypes.bool,
    })).isRequired,
    control: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired,
    isEditIcon: PropTypes.bool,
};

export default ProfileInfoSection;
