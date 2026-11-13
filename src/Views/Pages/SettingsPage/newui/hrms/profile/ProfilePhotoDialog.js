import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Cropper from "react-easy-crop";
import { useDispatch } from "react-redux";
import Modal from "../../../../../../components/ui/Modal";
import Btn from "../../../../../../components/ui/Btn";
import Icon from "../../../../../../components/Icon/Icon";
import CustomSpinner from "../../../../../../components/ReusableComponents/CustomSpinner";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { showSuccessOrError, uploadFile } from "../../../../../../services/commonService";
import { uploadProfileImage } from "../../../../../../redux/Slices/profile/ProfileSlice";
import translation from "../../../../../../utils/translation";
import { headingCase } from "../../../../../../utils/utils";
import { PROFILE_PHOTO } from "../../settingsNewUiConstants";
import styles from "./ProfilePhotoDialog.module.css";

/*
 * Update Profile Photo (My Profile) on the kit Modal. UI only — the legacy UpdateProfilePhotoPopup's logic as it was:
 * the existing photo loads into the cropper (cache-busted, canvas fallback), a chosen JPG / PNG ≤ 5 MB uploads to
 * `user-profile/full-length` at once, the square crop renders to a ≤ 96 px JPEG uploaded to `user-profile/cropped`, and
 * `uploadProfileImage { file_path, cropped_file_path }` saves both; the caller re-reads the profile (`onRefresh`).
 */
const ProfilePhotoDialog = ({ onClose, onRefresh, existingImageUrl }) => {
    const dispatch = useDispatch();
    const fileInputRef = useRef(null);
    const [originalImage, setOriginalImage] = useState(null);
    const [originalImageUrl, setOriginalImageUrl] = useState("");
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);

    const loadExistingImage = useCallback(async () => {
        try {
            setInitialLoading(true);
            const img = new Image();
            img.crossOrigin = "anonymous";
            const imageUrl = `${ existingImageUrl }${ existingImageUrl.includes("?") ? "&" : "?" }_t=${ Date.now() }`;
            img.onload = () => { setOriginalImage(imageUrl); setOriginalImageUrl(existingImageUrl); setInitialLoading(false); };
            img.onerror = async () => {
                try {
                    const proxyImg = new Image();
                    proxyImg.crossOrigin = "anonymous";
                    proxyImg.src = imageUrl;
                    await new Promise((resolve, reject) => { proxyImg.onload = resolve; proxyImg.onerror = reject; });
                    const canvas = document.createElement("canvas");
                    canvas.width = proxyImg.naturalWidth; canvas.height = proxyImg.naturalHeight;
                    canvas.getContext("2d").drawImage(proxyImg, 0, 0);
                    setOriginalImage(canvas.toDataURL("image/jpeg", PROFILE_PHOTO.FALLBACK_QUALITY));
                    setOriginalImageUrl(existingImageUrl);
                } catch (fallbackError) {
                    ShowToast("warning", translation("key_existing_image_may_be_unavailable"));
                } finally {
                    setInitialLoading(false);
                }
            };
            img.src = imageUrl;
        } catch (error) {
            setInitialLoading(false);
            ShowToast("warning", translation("key_could_not_load_existing_image"));
        }
    }, [existingImageUrl]);

    useEffect(() => { if (existingImageUrl) loadExistingImage(); }, [existingImageUrl, loadExistingImage]);
    useEffect(() => () => { if (originalImage?.startsWith("blob:")) URL.revokeObjectURL(originalImage); }, [originalImage]);

    const handleFileSelect = useCallback(async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > PROFILE_PHOTO.MAX_BYTES) { ShowToast("error", translation("key_please_smaller_file")); return; }
        if (!PROFILE_PHOTO.TYPES.includes(file.type)) { ShowToast("error", translation("key_invalid_image_file_type")); return; }
        try {
            setUploadLoading(true);
            const reader = new FileReader();
            reader.onload = (e) => setOriginalImage(e.target.result);
            reader.readAsDataURL(file);
            const uploaded = await uploadFile([{ file, name: PROFILE_PHOTO.FOLDER_FULL }]);
            setOriginalImageUrl(uploaded?.url);
            setUploadLoading(false);
        } catch (error) {
            setUploadLoading(false);
            ShowToast("error", translation("key_failed_to_upload_image"));
        }
    }, []);

    const onCropComplete = useCallback((area, areaPixels) => setCroppedAreaPixels(areaPixels), []);

    const createImage = useCallback((url, useCors = false) => new Promise((resolve, reject) => {
        const image = new Image();
        if (useCors) image.crossOrigin = "anonymous";
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", (error) => reject(error));
        image.src = useCors && !url.startsWith("data:") ? `${ url }${ url.includes("?") ? "&" : "?" }_t=${ Date.now() }` : url;
    }), []);

    const createCroppedImage = useCallback(async () => {
        const isDataUrl = originalImage.startsWith("data:");
        const imageElement = await createImage(originalImage, !isDataUrl);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const srcW = croppedAreaPixels.width;
        const srcH = croppedAreaPixels.height;
        const scale = Math.min(PROFILE_PHOTO.CROP_MAX_PX / srcW, PROFILE_PHOTO.CROP_MAX_PX / srcH, 1);
        canvas.width = Math.round(srcW * scale);
        canvas.height = Math.round(srcH * scale);
        ctx.drawImage(imageElement, croppedAreaPixels.x, croppedAreaPixels.y, srcW, srcH, 0, 0, canvas.width, canvas.height);
        return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/jpeg", PROFILE_PHOTO.CROP_QUALITY));
    }, [originalImage, croppedAreaPixels, createImage]);

    const handleSubmit = useCallback(async () => {
        if (!originalImage || !croppedAreaPixels) { ShowToast("error", translation("key_please_upload_and_crop_an_image_first")); return; }
        try {
            setSubmitLoading(true);
            const croppedBlob = await createCroppedImage();
            if (!croppedBlob) throw new Error("Failed to create cropped image");
            const croppedFile = new File([croppedBlob], `profile-cropped-${ Date.now() }.jpg`, { type: "image/jpeg" });
            const croppedUploaded = await uploadFile([{ file: croppedFile, name: PROFILE_PHOTO.FOLDER_CROPPED }]);
            const isNewUpload = originalImage.startsWith("data:");
            const res = await dispatch(uploadProfileImage({ file_path: isNewUpload ? originalImageUrl : existingImageUrl, cropped_file_path: croppedUploaded?.url }));
            showSuccessOrError(res);
            if (!res.error) { onClose(); onRefresh?.(); }
        } catch (error) {
            ShowToast("error", translation("key_failed_to_update_profile_photo"));
        } finally {
            setSubmitLoading(false);
        }
    }, [originalImage, croppedAreaPixels, createCroppedImage, originalImageUrl, existingImageUrl, dispatch, onClose, onRefresh]);

    const pickFile = useCallback(() => fileInputRef.current?.click(), []);
    const hasImage = Boolean(originalImage);
    const busy = submitLoading;
    const footer = (
        <>
            { hasImage && !uploadLoading && !initialLoading && (
                <Btn variant="secondary" type="button" onClick={ pickFile } disabled={ busy }>
                    { existingImageUrl ? `${ translation("key_upload") } ${ translation("key_new") } ${ translation("key_photo") }` : translation("key_upload_again") }
                </Btn>
            ) }
            <span className={ styles.grow } />
            <Btn variant="secondary" type="button" onClick={ onClose } disabled={ busy }>{ translation("key_cancel") }</Btn>
            <Btn variant="primary" type="button" onClick={ handleSubmit } disabled={ !hasImage || busy || !croppedAreaPixels }>{ submitLoading ? `${ translation("key_saving") }…` : translation("key_save") }</Btn>
        </>
    );

    return (
        <Modal title={ headingCase(translation("key_update_profile_photo")) } width={ 900 } onClose={ onClose } footer={ footer } busy={ busy } closeLabel={ translation("key_close") }>
            <input ref={ fileInputRef } type="file" className={ styles.fileInput } accept={ PROFILE_PHOTO.ACCEPT } onChange={ handleFileSelect } aria-hidden="true" tabIndex={ -1 } />
            { (uploadLoading || initialLoading) ? (
                <div className={ styles.center }><CustomSpinner /></div>
            ) : !hasImage ? (
                <div className={ styles.empty }>
                    <Icon name="upload" size={ 40 } strokeWidth={ 1.4 } />
                    <p className={ styles.emptyTitle }>{ translation("key_upload_photo") }</p>
                    <Btn variant="primary" type="button" onClick={ pickFile }>{ `${ translation("key_choose") } ${ translation("key_photo") }` }</Btn>
                    <p className={ styles.emptyHint }>{ translation("key_supported_formats") }</p>
                </div>
            ) : (
                <div className={ styles.panes }>
                    <section className={ styles.pane }>
                        <h3 className={ styles.paneTitle }>{ existingImageUrl && originalImageUrl === existingImageUrl ? `${ translation("key_current") } ${ translation("key_photo") }` : `${ translation("key_uploaded") } ${ translation("key_photo") }` }</h3>
                        <div className={ styles.original }><img src={ originalImage } alt={ translation("key_original") } /></div>
                    </section>
                    <section className={ styles.pane }>
                        <h3 className={ styles.paneTitle }>{ `${ translation("key_cropped") } ${ translation("key_photo") }` }</h3>
                        <div className={ styles.cropArea }>
                            <Cropper image={ originalImage } crop={ crop } zoom={ zoom } aspect={ 1 } onCropChange={ setCrop } onCropComplete={ onCropComplete } onZoomChange={ setZoom } cropShape="rect" showGrid />
                        </div>
                        <label className={ styles.zoom }>
                            <span>{ translation("key_wkr_photo_zoom") }</span>
                            <input type="range" value={ zoom } min={ PROFILE_PHOTO.ZOOM_MIN } max={ PROFILE_PHOTO.ZOOM_MAX } step={ PROFILE_PHOTO.ZOOM_STEP } onChange={ (e) => setZoom(Number(e.target.value)) } />
                        </label>
                    </section>
                </div>
            ) }
        </Modal>
    );
};

ProfilePhotoDialog.propTypes = {
    onClose: PropTypes.func.isRequired,
    onRefresh: PropTypes.func,
    existingImageUrl: PropTypes.string,
};

export default ProfilePhotoDialog;
