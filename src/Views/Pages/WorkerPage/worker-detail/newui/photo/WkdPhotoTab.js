import React, { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import "../wkd-biodata.css";
import "../wkd-photo.css";
import WkdStatusChip from "../WkdStatusChip";
import { BioCard, BioStatusPop } from "../../profile-tab/biodata-tab/BioCard";
import CustomSpinner from "../../../../../../components/ReusableComponents/CustomSpinner";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { IMAGE_UPLOAD_EXTENSIONS, FILE_UPLOAD_SIZE_LIMIT } from "../../../../../../components/ReusableComponents/constants";
import { uploadProfileCustomFolder } from "../../../../../../redux/Slices/UploadProfile";
import { saveWorkerValidateStatus, updateWorkerProfileImage } from "../../../../../../redux/Slices/worker/WorkerSlice";
import { isPartnerUser } from "../../../../../../services/permissionService";
import translation from "../../../../../../utils/translation";
import { getStatusTransitionError, sectionStatusOptions } from "../../statusTransition";
import {
    DOC_STATUS_META, WKD_PHOTO_ACTIVITY_LIMIT, WKD_PHOTO_COPY, WKD_PHOTO_DATE_FORMAT, WKD_PHOTO_DEFAULT_CROP, WKD_PHOTO_FOLDERS, WKD_PHOTO_TEMPLATE,
} from "../../../workerModuleConstants";
import WkdPhotoCard, { FullPhoto, Headshot, VisTag } from "./WkdPhotoCard";
import { actorSource, cropLabel, dimsLabel, formatBytes, photoRecords, withSource } from "./photoModel";
import { photoActivityEntries } from "./photoActivity";
import { readPhotoFile, renderHeadshot } from "./cropImage";
import { SEND_SITE } from "../../../../SettingsPage/newui/templates/templateConfiguration";

const WkdPhotoViewModal = lazy(() => import("../WkdPhotoViewModal"));
const WkdPhotoCropModal = lazy(() => import("./WkdPhotoCropModal"));
const WkdSendTemplateModal = lazy(() => import("../WkdSendTemplateModal"));

const selectPhotoState = (state) => ({
    info: state.worker.workerPhotoInfo,
    status: state.worker.status,
    allStatusList: state.worker.allStatusList,
    activityLogList: state.worker.activityLogList,
});
const fmtWhen = (v) => (v && dayjs(v).isValid() ? dayjs(v).format(WKD_PHOTO_DATE_FORMAT) : null);

/*
 * Photo (WORKER.md §16.5–§16.10; CR SR-04 / W-04; prototype photoPaneHTML + v28 store pane). One card: head with the
 * section chip (what employers currently see), the upload control and Change Status; the published pair and / or the
 * pending submission as records (full photo + headshot = two views of one record, both open the full-sized original);
 * Adjust crop writes coordinates only; Change Status acts on the pending item; Action Required opens the shared Send
 * Template modal with the Photo context. No background removal, no previous-submission folder, no standalone Send
 * Template. Partners get the plain uploader only (W-04): no crop, no host activity, no approver / submission metadata.
 *
 * @migration-unspecified(worker): today's `/update-profile-image` still stores a headshot FILE beside the original and
 * has no crop-coordinate field; the headshot PNG is derived from the chosen crop and the coordinates are sent
 * additively (`crop`). Verification of a replacement publishes it through the same call before `/validate-status`
 * (legacy "Select New Submission → Approve" path) until the backend publishes atomically on Verified.
 */
const WkdPhotoTab = ({ onRefreshStatus, isWorkerPermissionAccessInfo, isAdmin }) => {
    const dispatch = useDispatch();
    const { info, status, allStatusList, activityLogList } = useSelector(selectPhotoState, shallowEqual);
    const isPartner = isPartnerUser();
    const perms = isWorkerPermissionAccessInfo?.worker_worker_photo;
    const canEdit = (Array.isArray(perms) && perms.includes('edit')) || isAdmin;
    const canChangeStatus = !isPartner && ((Array.isArray(perms) && perms.includes('change_status')) || isAdmin);
    /* PERM §5.9.3: Action Required opens Send Template — offered only with the section's send_template sub-verb */
    const canSendTemplate = !isPartner && ((Array.isArray(perms) && perms.includes('send_template')) || isAdmin);
    const canCrop = !isPartner && canEdit;

    const { current, pending, status: itemStatus } = useMemo(() => photoRecords(info), [info]);
    const sectionMeta = current ? DOC_STATUS_META.verified : (DOC_STATUS_META[itemStatus] || DOC_STATUS_META.in_complete);

    const [draft, setDraft] = useState(null);
    const [busy, setBusy] = useState('');
    const [viewer, setViewer] = useState(null);
    const [cropTarget, setCropTarget] = useState(null);
    const [sendTemplate, setSendTemplate] = useState(false);
    const [singleNat, setSingleNat] = useState(null);   /* natural size of the single record's original, for the File row (backend 286: size is not stored) */
    const fileRef = useRef(null);

    const refresh = useCallback(() => onRefreshStatus('photo'), [onRefreshStatus]);

    const onPickFile = useCallback(async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        /* U-0212 (today's rule): JPG / PNG up to 2 MB — the extension check ignores case (.JPG is a JPG) */
        const extension = String(file.name.split('.').pop() || '').toLowerCase();
        if (!IMAGE_UPLOAD_EXTENSIONS.includes(extension)) { ShowToast('error', translation('key_please_upload_valid_image')); return; }
        if (file.size > FILE_UPLOAD_SIZE_LIMIT) { ShowToast('error', WKD_PHOTO_COPY.tooLarge); return; }
        const read = await readPhotoFile(file);
        if (!read) { ShowToast('error', WKD_PHOTO_COPY.couldNotRead); return; }
        /* W-04: a partner upload carries no crop — the host sets the headshot */
        setDraft({ ...read, crop: isPartner ? null : WKD_PHOTO_DEFAULT_CROP });
    }, [isPartner]);

    const uploadTo = useCallback((file, folder) => dispatch(uploadProfileCustomFolder({ file, folder })).unwrap().then((r) => r?.response), [dispatch]);

    const saveImage = useCallback(async ({ originalKey, originalSrc, crop, imageId, withoutBgKey }) => {
        let headshotKey = null;
        if (crop) {
            /* Priyanka 7 Nov: a failed render (image load or a CORS-tainted canvas on an S3 original) must stop the
               save with its own message — never fall through to a stale or null headshot, never a bare "Server error" */
            const blob = await renderHeadshot(originalSrc, crop).catch(() => { throw new Error(WKD_PHOTO_COPY.couldNotRead); });
            const headshot = await uploadTo(new File([blob], 'headshot.png', { type: 'image/png' }), WKD_PHOTO_FOLDERS.headshot);
            if (!headshot?.filename) throw new Error(translation('key_please_upload_valid_image'));
            headshotKey = headshot.filename;
        }
        const payload = {
            worker_id: info?.id,
            original_image_path: originalKey,
            cropped_image_path: headshotKey,
            final_image_path: headshotKey,
            without_bg_image_path: withoutBgKey ?? null,
            crop: crop || null,
            ...(imageId ? { image_id: imageId } : {}),
        };
        const res = await dispatch(updateWorkerProfileImage(payload));
        if (!res?.payload?.status) throw new Error(res?.payload?.message || translation('key_server_error'));
        return res.payload;
    }, [dispatch, info?.id, uploadTo]);

    const saveDraft = useCallback(async () => {
        if (!draft || busy) return;
        try {
            setBusy(WKD_PHOTO_COPY.uploadingOriginal);
            const original = await uploadTo(draft.file, WKD_PHOTO_FOLDERS.original);
            if (!original?.filename) throw new Error(translation('key_please_upload_valid_image'));
            setBusy(WKD_PHOTO_COPY.saving);
            const result = await saveImage({ originalKey: original.filename, originalSrc: draft.src, crop: draft.crop });
            ShowToast('success', result.message);
            setDraft(null);
            refresh();
        } catch (e) {
            ShowToast('error', e?.message || translation('key_server_error'));
        } finally {
            setBusy('');
        }
    }, [draft, busy, uploadTo, saveImage, refresh]);

    const applyCrop = useCallback(async (crop) => {
        const target = cropTarget;
        setCropTarget(null);
        if (target === 'draft') { setDraft((d) => (d ? { ...d, crop } : d)); return; }
        if (!target?.original) return;
        try {
            setBusy(WKD_PHOTO_COPY.saving);
            await saveImage({ originalKey: target.originalKey, originalSrc: target.original, crop, imageId: target.id, withoutBgKey: target.withoutBgKey });
            ShowToast('success', WKD_PHOTO_COPY.cropApplied);
            refresh();
        } catch (e) {
            ShowToast('error', e?.message || translation('key_server_error'));
        } finally {
            setBusy('');
        }
    }, [cropTarget, saveImage, refresh]);

    const statusTarget = pending ? itemStatus : (current ? 'verified' : itemStatus);
    const statusOptions = useMemo(
        () => sectionStatusOptions(allStatusList, statusTarget).filter((o) => canSendTemplate || o.id !== 'action_required'),
        [allStatusList, statusTarget, canSendTemplate]
    );
    const handleChangeStatus = useCallback(async (id) => {
        const transitionError = getStatusTransitionError(statusTarget, id);
        if (transitionError) { ShowToast('error', translation(transitionError)); return; }
        if (id === 'action_required') { if (canSendTemplate) setSendTemplate(true); return; }
        try {
            if (id === 'verified' && pending) {
                if (!pending.headshot && !pending.crop) { ShowToast('error', `${ WKD_PHOTO_COPY.cropRequiredTitle }: ${ WKD_PHOTO_COPY.cropRequired }`); return; }
                if (current) {
                    setBusy(WKD_PHOTO_COPY.saving);
                    if (pending.crop) {
                        /* Priyanka 6 Nov (worker 234, row 730): the approve builds the headshot FROM THE PENDING IMAGE —
                           a stored pending.headshotKey can carry the previous default's crop (app uploads), which put an
                           old face on the header. renderHeadshot failing stops the approve with its error. */
                        await saveImage({ originalKey: pending.originalKey, originalSrc: pending.original, crop: pending.crop, imageId: current.id, withoutBgKey: pending.withoutBgKey });
                    } else {
                        /* no crop recorded: the pending item's own headshot is all there is (partner plain upload, W-04) */
                        const res = await dispatch(updateWorkerProfileImage({
                            worker_id: info?.id,
                            original_image_path: pending.originalKey,
                            cropped_image_path: pending.headshotKey,
                            final_image_path: pending.headshotKey,
                            without_bg_image_path: pending.withoutBgKey ?? null,
                            crop: null,
                            image_id: current.id,
                        }));
                        if (!res?.payload?.status) throw new Error(res?.payload?.message || translation('key_server_error'));
                    }
                }
            }
            /* P5 S7: the verify names the pending item it decides on, so a replacement that arrived meanwhile is refused server-side */
            const res = await dispatch(saveWorkerValidateStatus({ worker_id: info?.id, type: WKD_PHOTO_TEMPLATE.type, status_key: id, ...(pending?.id ? { image_id: pending.id } : {}) }));
            if (!res?.payload?.status) throw new Error(res?.payload?.message || translation('key_server_error'));
            ShowToast('success', res.payload.message);
            refresh();
        } catch (e) {
            ShowToast('error', e?.message || translation('key_server_error'));
        } finally {
            setBusy('');
        }
    }, [statusTarget, pending, current, canSendTemplate, dispatch, info?.id, refresh, saveImage]);

    const openViewer = useCallback((rec) => setViewer({ rec, published: rec.kind === 'current' }), []);

    /* the head's upload control keeps one label per state; while a new original is open the panel below owns Replace / Cancel, so the head control steps aside (tester 16 Oct: label swap + width jump + duplicate Replace) */
    const uploadLabel = pending ? WKD_PHOTO_COPY.replacePending : current ? WKD_PHOTO_COPY.uploadNewOriginal : WKD_PHOTO_COPY.uploadPhoto;
    const both = Boolean(current && pending);
    const headNote = pending && !isPartner ? `${ both ? WKD_PHOTO_COPY.replacementSubmitted : WKD_PHOTO_COPY.originalUploaded }${ pending.uploadedAt ? ` ${ fmtWhen(pending.uploadedAt) }` : '' }` : null;

    const extraHead = (
        <>
            { canEdit && !draft && (
                <label className="bio-btn wkd-ph-upload">
                    <input ref={ fileRef } type="file" accept="image/jpeg,image/png" onChange={ onPickFile } disabled={ Boolean(busy) } />
                    { uploadLabel }
                </label>
            ) }
            { canChangeStatus && (current || pending) && (
                <BioStatusPop current={ statusTarget } options={ statusOptions } onPick={ handleChangeStatus } />
            ) }
        </>
    );

    const draftCard = draft && (
        <div className="wkd-ph-draft" data-mc-photo-draft="1">
            <img src={ draft.src } alt={ `${ translation('key_preview') } · ${ draft.file.name }` } />
            <div className="wkd-ph-draft-body">
                <div className="t">{ WKD_PHOTO_COPY.newOriginal }</div>
                <div className="wkd-pv-row"><span className="l">{ WKD_PHOTO_COPY.file }</span><span className="v">{ draft.file.name } · { draft.width } x { draft.height } · { formatBytes(draft.bytes) }</span></div>
                { !isPartner && <div className="wkd-pv-row"><span className="l">{ WKD_PHOTO_COPY.headshotCrop }</span><span className="v mono">{ cropLabel(draft.crop) || WKD_PHOTO_COPY.cropNotSet }</span></div> }
                <div className="wkd-pv-row"><span className="l">{ WKD_PHOTO_COPY.onSave }</span><span className="v wrap">{ pending ? WKD_PHOTO_COPY.onSaveReplace : WKD_PHOTO_COPY.onSaveNew }</span></div>
                <div className="wkd-ph-draft-actions">
                    <button type="button" className="g2-button primary" disabled={ Boolean(busy) } onClick={ saveDraft }>{ busy || translation('key_save') }</button>
                    { canCrop && <button type="button" className="g2-button" disabled={ Boolean(busy) } onClick={ () => setCropTarget('draft') }>{ WKD_PHOTO_COPY.setCrop }</button> }
                    <label className="g2-button wkd-ph-upload"><input type="file" accept="image/jpeg,image/png" onChange={ onPickFile } disabled={ Boolean(busy) } />{ WKD_PHOTO_COPY.replace }</label>
                    <button type="button" className="g2-button" disabled={ Boolean(busy) } onClick={ () => setDraft(null) }>{ translation('key_cancel') }</button>
                </div>
            </div>
        </div>
    );

    /* U-0338 / W-04 (21 Oct): a partner gets upload / replace and the current approved photo only — never the pending pair,
       host crop, verification meta or activity; the approved photo stays public while a replacement is pending */
    let body;
    if (status === 'loading' && !info) body = <CustomSpinner />;
    else if (both && !isPartner) {
        body = (
            <div className="wkd-ph-pair">
                <WkdPhotoCard rec={ current } heading={ translation('key_current') } published actionable onOpen={ openViewer } showMeta={ !isPartner } />
                <WkdPhotoCard rec={ pending } heading={ translation('key_replacement') } pending status={ itemStatus } actionable={ !isPartner } canCrop={ canCrop } onOpen={ openViewer } onCrop={ setCropTarget } withCurrent showMeta={ !isPartner } />
            </div>
        );
    } else if (current || (pending && !isPartner)) {
        const rec = current || pending;
        const published = Boolean(current);
        const meta = published ? DOC_STATUS_META.verified : (DOC_STATUS_META[itemStatus] || DOC_STATUS_META.in_review);
        body = (
            <div className="wkd-ph-single" data-mc-photo-card={ published ? 'current' : 'pending' }>
                <div>
                    <div className="l">{ WKD_PHOTO_COPY.fullPhoto }</div>
                    <SingleFull rec={ rec } actionable={ published || !isPartner } onOpen={ openViewer } onNatural={ setSingleNat } />
                </div>
                <div className="wkd-ph-single-side">
                    <div className="wkd-ph-single-head">
                        <SingleHeadshot rec={ rec } actionable={ published || !isPartner } onOpen={ openViewer } />
                        <div className="wkd-ph-single-cap">
                            <div className="l">{ WKD_PHOTO_COPY.headshotCrop }</div>
                            <div className="mono">{ cropLabel(rec.crop) || WKD_PHOTO_COPY.cropNotSet }</div>
                            <div className="wkd-ph-tags"><WkdStatusChip label={ translation(meta.key) } tone={ meta.tone } /><VisTag on={ published } /></div>
                        </div>
                    </div>
                    { !isPartner && (
                        <div className="wkd-ph-meta">
                            { published && <Row label={ WKD_PHOTO_COPY.approvedOn } value={ fmtWhen(rec.approvedAt) } /> }
                            { published && <Row label={ WKD_PHOTO_COPY.approvedBy } value={ withSource(rec.approvedBy, WKD_PHOTO_COPY.sourceStaff) } /> }
                            <Row label={ published ? WKD_PHOTO_COPY.uploadedOn : WKD_PHOTO_COPY.submittedOn } value={ fmtWhen(rec.uploadedAt) } />
                            <Row label={ published ? WKD_PHOTO_COPY.uploadedBy : WKD_PHOTO_COPY.submittedBy } value={ withSource(rec.uploadedBy, actorSource(rec.uploadedByRole)) } />
                            <Row label={ WKD_PHOTO_COPY.file } value={ [rec.fileName, singleNat?.url === rec.original ? dimsLabel(singleNat) : null, formatBytes(rec.fileSize) || null].filter(Boolean).join(' · ') } sourced />
                        </div>
                    ) }
                    { !published && canCrop && (
                        <div className="wkd-ph-card-actions start">
                            <button type="button" className="g2-button" disabled={ Boolean(busy) } onClick={ () => setCropTarget(rec) }>{ rec.crop || rec.headshot ? WKD_PHOTO_COPY.adjustCrop : WKD_PHOTO_COPY.setCrop }</button>
                        </div>
                    ) }
                    { !published && canCrop && !rec.crop && !rec.headshot && <div className="wkd-ph-warn" data-mc-photo-verify-blocked="no-crop">{ WKD_PHOTO_COPY.noCropWarn }</div> }
                </div>
            </div>
        );
    } else {
        body = (
            <div className="wkd-ph-empty" data-mc-photo-empty="1">
                <span className="av" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="4" /><path d="M4 20c1-4 4-6 8-6s7 2 8 6" /></svg></span>
                { WKD_PHOTO_COPY.noPhoto }{ canEdit ? ` ${ WKD_PHOTO_COPY.noPhotoEdit }` : '' }
            </div>
        );
    }

    /* host activity is not part of the partner surface (W-04); backend 287: uploads, removals and crop adjustments beside the status changes */
    const activity = useMemo(() => (!isPartner && Array.isArray(activityLogList) ? photoActivityEntries(activityLogList).slice(0, WKD_PHOTO_ACTIVITY_LIMIT) : []), [isPartner, activityLogList]);

    return (
        <div className="wkd-ph" data-mc-profile-section="photo">
            <BioCard
                title={ translation('key_photo') }
                chip={ <WkdStatusChip label={ translation(sectionMeta.key) } tone={ sectionMeta.tone } /> }
                updated={ headNote }
                extraHead={ extraHead }
                dataSection="photo"
            >
                { draftCard }
                { body }
                { activity.length > 0 && (
                    <div className="wkd-ph-activity">
                        <div className="wkd-actflat" data-mc-photo-activity={ activity.length }>
                            { activity.map((line) => (
                                <div key={ line.id } className="wkd-actflat-item">
                                    <span className={ `wkd-actflat-dot ${ line.dot }` } />
                                    <div>
                                        <div className="wkd-actflat-t">{ line.text }</div>
                                        { (line.by || line.when) && (
                                            <div className="wkd-actflat-m">
                                                { line.by ? `${ translation('key_by') } ${ line.by }` : '' }{ line.by && line.when ? ' · ' : '' }{ line.when && <span className="wkd-actflat-when">{ line.when }</span> }
                                            </div>
                                        ) }
                                    </div>
                                </div>
                            )) }
                        </div>
                    </div>
                ) }
            </BioCard>

            <Suspense fallback={ null }>
                { viewer && (
                    <WkdPhotoViewModal
                        photo={ { url: viewer.rec.original, file_name: viewer.rec.fileName, file_size: viewer.rec.fileSize, crop: viewer.rec.crop, approved_at: viewer.published ? viewer.rec.approvedAt : viewer.rec.uploadedAt } }
                        published={ viewer.published }
                        onClose={ () => setViewer(null) }
                    />
                ) }
                { cropTarget && (
                    <WkdPhotoCropModal
                        src={ cropTarget === 'draft' ? draft?.src : cropTarget.original }
                        fileName={ cropTarget === 'draft' ? draft?.file?.name : cropTarget.fileName }
                        crop={ cropTarget === 'draft' ? draft?.crop : cropTarget.crop }
                        setBy={ cropTarget === 'draft' ? null : cropTarget.uploadedBy }
                        title={ both && cropTarget !== 'draft' ? WKD_PHOTO_COPY.adjustReplacementCrop : (cropTarget === 'draft' ? WKD_PHOTO_COPY.setCrop : WKD_PHOTO_COPY.adjustCrop) }
                        onApply={ applyCrop }
                        onClose={ () => setCropTarget(null) }
                    />
                ) }
                { sendTemplate && (
                    <WkdSendTemplateModal
                        onClose={ () => setSendTemplate(false) }
                        site={ SEND_SITE.WORKER_PHOTO_AR }
                        context={ { worker_id: info?.id } }
                        userType="worker"
                        slug={ WKD_PHOTO_TEMPLATE.slug }
                        parties={ { worker: { name: info?.fullname || "" } } }
                        title={ WKD_PHOTO_TEMPLATE.title }
                        status_key="action_required"
                        actionStatusType={ WKD_PHOTO_TEMPLATE.type }
                        handleRefreshProfile={ () => { setSendTemplate(false); refresh(); } }
                        contextLabel={ translation('key_photo') }
                        allowSelfTools={ false }
                    />
                ) }
            </Suspense>
        </div>
    );
};

const Row = ({ label, value, sourced }) => (
    <div className="wkd-pv-row">
        <span className="l">{ label }</span>
        { value
            ? <span className="v">{ value }</span>
            : <span className="v mc-unavailable" data-mc-honest={ sourced ? undefined : 'deferred' } title={ sourced ? undefined : WKD_PHOTO_COPY.notSourced }>—</span> }
    </div>
);
Row.propTypes = { label: PropTypes.node, value: PropTypes.node, sourced: PropTypes.bool };

const SingleFull = ({ rec, actionable, onOpen, onNatural }) => <div className="wkd-ph-single-full"><FullPhoto rec={ rec } actionable={ actionable } onOpen={ onOpen } onNatural={ onNatural } /></div>;
SingleFull.propTypes = { rec: PropTypes.object.isRequired, actionable: PropTypes.bool, onOpen: PropTypes.func.isRequired, onNatural: PropTypes.func };

const SingleHeadshot = ({ rec, actionable, onOpen }) => {
    const [aspect, setAspect] = useState(null);
    return (
        <>
            <img className="wkd-ph-probe" src={ rec.original } alt="" aria-hidden="true" onLoad={ (e) => setAspect(e.currentTarget.naturalHeight / e.currentTarget.naturalWidth) } />
            <Headshot rec={ rec } aspect={ aspect } actionable={ actionable } onOpen={ onOpen } />
        </>
    );
};
SingleHeadshot.propTypes = { rec: PropTypes.object.isRequired, actionable: PropTypes.bool, onOpen: PropTypes.func.isRequired };

WkdPhotoTab.propTypes = {
    onRefreshStatus: PropTypes.func.isRequired,
    isWorkerPermissionAccessInfo: PropTypes.object,
    isAdmin: PropTypes.bool,
};

export default WkdPhotoTab;
