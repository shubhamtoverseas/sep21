import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import Icon from "../../../../components/Icon/Icon";
import { Field, TextArea } from "../../../../components/ui/FormControls";
import translation from "../../../../utils/translation";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { uploadFile } from "../../../../services/commonService";
import { extendVisaCancelAPI, extendVisaFilesAPI, extendVisaRemoveFileAPI } from "../../../../services/processings";
import { formatDate } from "../details/contractRecordUtils";
import { caseLabel } from "./extendVisaUtils";
import { CR_DOC_ACCEPT, CR_DOC_FILE_LIMIT, CR_DOC_ACCEPT_RE, CR_XV , CR_XV_FOLDER } from "../contractConstants";
import StageSendTemplate from "../../../../components/Processing/newui/StageSendTemplate";
import { SEND_SITE } from "../../SettingsPage/newui/templates/templateConfiguration";

export const XV_UPLOAD_FOLDER = "processing/extend-visa";
export const stampOf = (at, by) => [at ? formatDate(at) : "", by || ""].filter(Boolean).join(" · ");
export const fill = (text, vars) => Object.keys(vars || {}).reduce((out, k) => out.split(`{${ k }}`).join(vars[k] ?? ""), text);

/** upload the bytes with the shared file service, then hand the stored paths to the case (POST extend-visa/files) */
/* `folder` (U-0309): the case has exactly two document folders — immigration · visa — and an upload lands in one of them */
export const uploadCaseFiles = async (files, run, requirementKey, folder) => {
    const list = Array.from(files || []);
    if (!list.length) return { ok: false };
    if (list.some((f) => !CR_DOC_ACCEPT_RE.test(f.name || ""))) { ShowToast("error", translation("key_cr_doc_formats")); return { ok: false }; }
    if (list.some((f) => f.size > CR_DOC_FILE_LIMIT)) { ShowToast("error", translation("key_cr_doc_max_size")); return { ok: false }; }
    const paths = [];
    for (const file of list) {
        // eslint-disable-next-line no-await-in-loop
        const res = await uploadFile([{ file, name: XV_UPLOAD_FOLDER }]);
        if (!res?.filename) { ShowToast("error", translation("key_failed_to_upload_file")); return { ok: false }; }
        paths.push(res.filename);
    }
    return run((ref) => extendVisaFilesAPI(ref, { files: paths, ...(requirementKey ? { requirement_key: requirementKey } : {}), ...(folder ? { folder } : {}) }));
};

/** a hidden picker: `onFiles(FileList)` */
export const FilePicker = React.forwardRef(({ multiple, onFiles }, ref) => (
    <input ref={ ref } type="file" accept={ CR_DOC_ACCEPT } multiple={ multiple } className="g1-file-input" aria-hidden="true" tabIndex={ -1 }
        onChange={ (e) => { const f = e.target.files; e.target.value = ""; if (f?.length) onFiles(f); } } />
));
FilePicker.displayName = "FilePicker";
FilePicker.propTypes = { multiple: PropTypes.bool, onFiles: PropTypes.func.isRequired };

/* ---- the case's unlinked documents (EXTEND.md §5.10 / §10.3): list · open · Remove (Documents — Manage, open case) ---- */
/* K-9: every case file carries `folder`; a legacy row without one is an Immigration-folder file */
export const caseFolderFiles = (files, folder) => (Array.isArray(files) ? files.filter((f) => !folder || (f?.folder || CR_XV_FOLDER.IMM) === folder) : []);
export const FolderFiles = ({ files, canManage, run, busy }) => {
    if (!Array.isArray(files) || !files.length) return null;
    const remove = (f) => run((ref) => extendVisaRemoveFileAPI(ref, { file_id: f.id }));
    return (
        <div className="g1-fileblock" data-xv-folder-files={ files.length }>
            <span className="lb">{ translation("key_cr_xv_folder_files") }</span>
            <div className="g1-folder-files">
                { files.map((f) => (
                    <div key={ f.id } className="f">
                        <Icon name="filetext" size={ 13 } strokeWidth={ 1.5 } />
                        { f.file_path ? <a href={ f.file_path_full_url || f.file_path } target="_blank" rel="noopener noreferrer">{ f.file_name || String(f.file_path).split("/").pop() }</a> : <span>{ f.file_name || f.id }</span> }
                        <span className="m">{ stampOf(f.uploaded_at, f.uploaded_by) }</span>
                        <span className="grow" />
                        { canManage && <button type="button" className="g1-ficon danger" aria-label={ translation("key_remove") } disabled={ busy } onClick={ () => remove(f) }><Icon name="trash" size={ 13 } strokeWidth={ 1.5 } /></button> }
                    </div>
                )) }
            </div>
        </div>
    );
};
FolderFiles.propTypes = { files: PropTypes.array, canManage: PropTypes.bool, run: PropTypes.func.isRequired, busy: PropTypes.bool };

/* ---- one reason-only dialog (Return / Rework · Cancel case) ---- */
export const ReasonDialog = ({ title, intro, note, primaryLabel, cancelLabel, variant = "primary", busy, onClose, onConfirm }) => {
    const [reason, setReason] = useState("");
    const [tried, setTried] = useState(false);
    const [error, setError] = useState("");
    const err = tried && !reason.trim() ? translation("key_cr_xv_reason_required") : "";
    const confirm = async () => {
        setTried(true);
        if (!reason.trim()) return;
        const res = await onConfirm(reason.trim());
        if (res && !res.ok && res.message) setError(res.message);
    };
    return (
        <Modal title={ title } width={ 560 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
            footer={ (
                <>
                    <span className="grow" />
                    <Btn variant="secondary" type="button" disabled={ busy } onClick={ onClose }>{ cancelLabel || translation("key_cancel") }</Btn>
                    <Btn variant={ variant } type="button" disabled={ busy } onClick={ confirm }>{ busy ? `${ translation("key_loading") }…` : primaryLabel }</Btn>
                </>
            ) }>
            { intro && <p className="intro">{ intro }</p> }
            { note && <div className="note">{ note }</div> }
            <Field label={ translation("key_reason") } htmlFor="xv-reason" full className="f-full" required error={ err } hint={ translation("key_ar_reason_help") }>
                <TextArea id="xv-reason" rows={ 3 } value={ reason } maxLength={ CR_XV.REASON_MAX } disabled={ busy } invalid={ Boolean(err) } aria-required="true" onChange={ (e) => setReason(e.target.value) } />
            </Field>
            { error && <div className="note danger" role="alert">{ error }</div> }
        </Modal>
    );
};
ReasonDialog.propTypes = { title: PropTypes.node.isRequired, intro: PropTypes.node, note: PropTypes.node, primaryLabel: PropTypes.node.isRequired, cancelLabel: PropTypes.node, variant: PropTypes.string, busy: PropTypes.bool, onClose: PropTypes.func.isRequired, onConfirm: PropTypes.func.isRequired };

/* ---- Cancel Extend Visa case (EXTEND.md §8.1): the footer button + its dialog ---- */
export const CancelCaseButton = ({ caseData, run, busy }) => {
    const [open, setOpen] = useState(false);
    if (!caseData?.can?.cancel || caseData.lifecycle !== CR_XV.LIFECYCLE.OPEN) return null;
    return (
        <>
            <button type="button" className="g1-btn danger" data-fid="xv-cancel-case" onClick={ () => setOpen(true) }>{ translation("key_cr_xv_cancel_case") }</button>
            { open && (
                <ReasonDialog title={ translation("key_cr_xv_cancel_case") } intro={ fill(translation("key_cr_xv_cancel_intro"), { case: caseLabel(caseData) }) }
                    primaryLabel={ translation("key_cr_xv_cancel_confirm") } cancelLabel={ translation("key_cr_xv_keep_open") } variant="danger" busy={ busy } onClose={ () => setOpen(false) }
                    onConfirm={ async (reason) => { const res = await run((ref) => extendVisaCancelAPI(ref, { reason })); if (res.ok) setOpen(false); return res; } } />
            ) }
        </>
    );
};
CancelCaseButton.propTypes = { caseData: PropTypes.object.isRequired, run: PropTypes.func.isRequired, busy: PropTypes.bool };

/* ---- Send Template on a case (Stage Actions — Send Template; stays available on a terminal case, EXTEND.md §12) ---- */
export const useCaseTemplate = (slug) => {
    const { contractDetails } = useSelector((s) => s.contracts);
    const [isOpen, setIsOpen] = useState(false);
    const open = useCallback(() => setIsOpen(true), []);
    /* the slug may change with the stage status (U-0310): the modal reads the current one */
    const popups = isOpen ? <StageSendTemplate contractDetails={ contractDetails } slug={ slug } site={ SEND_SITE.EXTEND_VISA } onClose={ () => setIsOpen(false) } /> : null;
    return { open, popups };
};
