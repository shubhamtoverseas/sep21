import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field } from "../../../../components/ui/FormControls";
import translation from "../../../../utils/translation";
import { headingCase } from "../../../../utils/utils";
import { stageToken } from "../../../../components/Processing/StageTitle";
import { EditFooter, FieldRead, Fld, FormGrid, PortalButton, StageFooter, StagePanel, StagePanelHead } from "../../../../components/Processing/newui/StagePanel";
import { extendVisaRefReleasedAPI, extendVisaReleaseAPI, extendVisaVisaFieldsAPI } from "../../../../services/processings";
import { formatDate } from "../details/contractRecordUtils";
import { CancelCaseButton, FilePicker, FolderFiles, uploadCaseFiles, useCaseTemplate , caseFolderFiles } from "./ExtendVisaShared";
import { CR_XV, CR_XV_STAGE_KEY , CR_XV_FOLDER } from "../contractConstants";

const fmt = (iso) => (iso ? formatDate(iso) : "");
const errText = (e) => (Array.isArray(e) ? e.join(" ") : (e || ""));

/* ---- the final confirmation (prototype evRelease; EXTEND.md §6.3 R1–R6 — the server validates) ---- */
const ReleaseDialog = ({ caseData: c, busy, onClose, onConfirm }) => {
    const v = c.visa_fields || {};
    const [expiry, setExpiry] = useState("");
    const [errors, setErrors] = useState({});
    const [tried, setTried] = useState(false);
    const confirm = async () => {
        setTried(true);
        if (!expiry) return;
        const res = await onConfirm(expiry);
        if (res && !res.ok) setErrors(res.errors || { new_visa_expiry_date: res.message });
    };
    const expiryErr = (tried && !expiry) ? translation("key_cc_enter_the_date").split("{label}").join(translation("key_cr_xv_new_visa_expiry").toLowerCase()) : errText(errors.new_visa_expiry_date);
    return (
        <Modal title={ translation("key_cr_xv_release_title") } width={ 600 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
            footer={ (
                <>
                    <span className="grow" />
                    <Btn variant="secondary" type="button" disabled={ busy } onClick={ onClose }>{ translation("key_cancel") }</Btn>
                    <Btn variant="primary" type="button" disabled={ busy } onClick={ confirm }>{ busy ? `${ translation("key_loading") }…` : translation("key_cr_xv_confirm_release") }</Btn>
                </>
            ) }>
            <p className="intro">{ translation("key_cr_xv_release_intro") }</p>
            <div className="row">
                <Field label={ translation("key_visa_ref_no") } className="f-m" error={ errText(errors.visa_reference_no) }><div className="val mono">{ v.visa_reference_no || "—" }</div></Field>
                <Field label={ translation("key_e_visa_payment_date") } className="f-date" error={ errText(errors.e_visa_payment_date) }><div className="val">{ fmt(v.e_visa_payment_date) || "—" }</div></Field>
            </div>
            <div className="row">
                <Field label={ translation("key_cr_xv_release_date") } className="f-date" hint={ translation("key_cr_xv_derived_help") }>
                    <div className="val g1-derived" data-ev-derived-release="">{ fmt(v.visa_release_date || v.e_visa_payment_date) || "—" }<span className="g1-tag">{ translation("key_cr_xv_derived") }</span></div>
                </Field>
                <Field label={ translation("key_cr_xv_new_visa_expiry") } htmlFor="xv-rel-exp" className="f-date" required error={ expiryErr } hint={ expiryErr ? undefined : translation("key_cr_xv_new_expiry_help") }>
                    <DateInput id="xv-rel-exp" name="xv-rel-exp" value={ expiry } onChange={ setExpiry } invalid={ Boolean(expiryErr) } disabled={ busy } />
                </Field>
            </div>
        </Modal>
    );
};
ReleaseDialog.propTypes = { caseData: PropTypes.object.isRequired, busy: PropTypes.bool, onClose: PropTypes.func.isRequired, onConfirm: PropTypes.func.isRequired };

/**
 * The case's Visa stage (prototype b30EvisaPanelEV; EXTEND.md §6, §16.1): Visa Ref No. (copy) · E-Visa Payment Date ·
 * Visa Release Date (derived — equal to the payment date, never editable) · New Visa Expiry once Released; no A/C
 * Refunded. Edit / Save through POST visa-fields while the case is open (`can.edit_fields`); the status menu offers
 * Visa Ref. No. Released (`can.ref_released`, needs a reference) then Visa Released, which opens the final confirmation
 * (R1–R6 inline from the server). Release completes and locks the case and appends the issuance to the parent's Visa Record.
 */
const ExtendVisaVisa = ({ caseData: c, run, busy, permissions, onCompleted, stageView = true }) => {
    const can = c.can || {};
    const status = c.visa?.status;
    const open = c.lifecycle === CR_XV.LIFECYCLE.OPEN;
    const working = open && status !== CR_XV.VISA.RELEASED;
    const v = c.visa_fields || {};
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ visa_reference_no: v.visa_reference_no || "", e_visa_payment_date: v.e_visa_payment_date || "" });
    const [errors, setErrors] = useState({});
    const [releasing, setReleasing] = useState(false);
    const [copied, setCopied] = useState(false);
    const uploadRef = useRef(null);
    /* U-0310: after release the stage offers the catalogue's Share Visa entry; before it the Visa stage template; no Share of the reference string */
    const template = useCaseTemplate(status === CR_XV.VISA.RELEASED ? "processing_visa_share" : "processing_visa_evisa");
    useEffect(() => { setDraft({ visa_reference_no: v.visa_reference_no || "", e_visa_payment_date: v.e_visa_payment_date || "" }); }, [v.visa_reference_no, v.e_visa_payment_date]);

    const save = async () => {
        const res = await run((ref) => extendVisaVisaFieldsAPI(ref, { visa_reference_no: draft.visa_reference_no.trim(), e_visa_payment_date: draft.e_visa_payment_date || null }));
        if (res.ok) { setEditing(false); setErrors({}); } else setErrors(res.errors || {});
    };
    const copyRef = () => { if (v.visa_reference_no) { navigator.clipboard?.writeText(v.visa_reference_no); setCopied(true); setTimeout(() => setCopied(false), 1500); } };
    const hasRef = Boolean((v.visa_reference_no || "").trim());

    const options = useMemo(() => {
        if (!working) return [];
        if (status === CR_XV.VISA.NOT_READY) return [{ id: CR_XV.VISA.REF_RELEASED, name: stageToken(CR_XV_STAGE_KEY.VISA, CR_XV.VISA.REF_RELEASED).label, enable: Boolean(can.ref_released) && hasRef }];
        if (status === CR_XV.VISA.REF_RELEASED) return [{ id: CR_XV.VISA.RELEASED, name: stageToken(CR_XV_STAGE_KEY.VISA, CR_XV.VISA.RELEASED).label, enable: Boolean(can.release) }];
        return [];
    }, [working, status, can.ref_released, can.release, hasRef]);
    const entitled = Boolean(permissions?.stageActionPermission?.includes("change_status"));
    const showMenu = options.length > 0 && (options.some((o) => o.enable) || (entitled && status === CR_XV.VISA.NOT_READY && !hasRef));
    const menuNote = status === CR_XV.VISA.NOT_READY && !hasRef ? translation("key_cr_xv_ref_required_note") : (status === CR_XV.VISA.REF_RELEASED ? translation("key_cr_xv_released_note") : undefined);
    const onStatus = (id) => {
        if (id === CR_XV.VISA.REF_RELEASED) run((ref) => extendVisaRefReleasedAPI(ref));
        else if (id === CR_XV.VISA.RELEASED) setReleasing(true);
    };

    const released = status === CR_XV.VISA.RELEASED;
    return (
        <StagePanel locked={ !open }>
            <StagePanelHead title={ headingCase(translation("key_visa")) } stage={ CR_XV_STAGE_KEY.VISA } status={ status } updatedAt={ c.visa?.updated_at }>
                { working && can.edit_fields && !editing && <button type="button" className="g1-btn" data-fid="ev-edit" disabled={ busy } onClick={ () => setEditing(true) }>{ translation("key_edit") }</button> }
                <PortalButton />
                { open && can.upload && (
                    <>
                        <button type="button" className="g1-btn primary" data-fid="xv-visa-upload" disabled={ busy } onClick={ () => uploadRef.current?.click() }><Icon name="upload" size={ 11 } strokeWidth={ 1.8 } />{ translation("key_upload") }</button>
                        <FilePicker ref={ uploadRef } multiple onFiles={ (files) => uploadCaseFiles(files, run, undefined, CR_XV_FOLDER.VISA) } />
                    </>
                ) }
            </StagePanelHead>
            <FormGrid layout="evisa-case">
                { editing ? (
                    <Fld id="xv-ref" label={ translation("key_visa_ref_no") } error={ errText(errors.visa_reference_no) }>
                        <input id="xv-ref" className="g1-in mono" value={ draft.visa_reference_no } maxLength={ 40 } disabled={ busy } onChange={ (e) => setDraft((d) => ({ ...d, visa_reference_no: e.target.value })) } />
                    </Fld>
                ) : (
                    <div className="g1-f"><div className="lb">{ translation("key_visa_ref_no") }</div>
                        <div className="inline"><div className={ `vl mono${ hasRef ? "" : " empty" }` }>{ v.visa_reference_no || "—" }</div>
                            { hasRef && <button type="button" className="g1-btn sm" onClick={ copyRef }>{ translation(copied ? "key_copied" : "key_copy") }</button> }</div>
                    </div>
                ) }
                { editing
                    ? <Fld id="xv-pay" label={ translation("key_e_visa_payment_date") } error={ errText(errors.e_visa_payment_date) }><DateInput id="xv-pay" value={ draft.e_visa_payment_date } disabled={ busy } className="mcdt-datewrap" onChange={ (d) => setDraft((x) => ({ ...x, e_visa_payment_date: d })) } /></Fld>
                    : <FieldRead label={ translation("key_e_visa_payment_date") } value={ fmt(v.e_visa_payment_date) } /> }
                <div className="g1-f" data-ev-derived-release=""><div className="lb">{ translation("key_cr_xv_release_date") }</div>
                    <div className={ `vl g1-derived${ (editing ? draft.e_visa_payment_date : v.e_visa_payment_date) ? "" : " empty" }` }>{ fmt(editing ? draft.e_visa_payment_date : (v.visa_release_date || v.e_visa_payment_date)) || "—" }<span className="g1-tag" title={ translation("key_cr_xv_derived_help") }>{ translation("key_cr_xv_derived") }</span></div>
                </div>
                { released && <FieldRead label={ translation("key_cr_xv_new_visa_expiry") } value={ fmt(v.new_visa_expiry_date) } /> }
            </FormGrid>
            { editing && <EditFooter onCancel={ () => { setEditing(false); setErrors({}); setDraft({ visa_reference_no: v.visa_reference_no || "", e_visa_payment_date: v.e_visa_payment_date || "" }); } } onSave={ save } saving={ busy } /> }
            <FolderFiles files={ caseFolderFiles(c.folder_files, CR_XV_FOLDER.VISA) } canManage={ open && Boolean(can.manage_evidence) } run={ run } busy={ busy } />
            <StageFooter stage={ CR_XV_STAGE_KEY.VISA } onSendTemplate={ template.open } canSendTemplate={ Boolean(can.send_template) }
                statusOptions={ options } current={ null } onChangeStatus={ onStatus } canChangeStatus={ showMenu && stageView } note={ menuNote }>
                <CancelCaseButton caseData={ c } run={ run } busy={ busy } />
            </StageFooter>
            { releasing && (
                <ReleaseDialog caseData={ c } busy={ busy } onClose={ () => setReleasing(false) }
                    onConfirm={ async (expiry) => { const res = await run((ref) => extendVisaReleaseAPI(ref, { new_visa_expiry_date: expiry })); if (res.ok) { setReleasing(false); onCompleted?.(); } return res; } } />
            ) }
            { template.popups }
        </StagePanel>
    );
};

ExtendVisaVisa.propTypes = {
    stageView: PropTypes.bool,
    caseData: PropTypes.object.isRequired,
    run: PropTypes.func.isRequired,
    busy: PropTypes.bool,
    permissions: PropTypes.object,
    onCompleted: PropTypes.func,
};

export default ExtendVisaVisa;
