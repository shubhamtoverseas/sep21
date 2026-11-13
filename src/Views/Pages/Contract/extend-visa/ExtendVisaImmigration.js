import React, { useCallback, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import { Field, RadioGroup, TextArea } from "../../../../components/ui/FormControls";
import useOutsideClick from "../../../../hooks/useOutsideClick";
import translation from "../../../../utils/translation";
import { stageToken } from "../../../../components/Processing/StageTitle";
import { Cell, CheckCell, Listing, ListingRow, PortalButton, StageFooter, StagePanel, StagePanelHead } from "../../../../components/Processing/newui/StagePanel";
import { extendVisaApplicabilityAPI, extendVisaAssociateAPI, extendVisaImmigrationStatusAPI, extendVisaMarkAPI } from "../../../../services/processings";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { CancelCaseButton, FilePicker, FolderFiles, ReasonDialog, fill, stampOf, uploadCaseFiles, useCaseTemplate , caseFolderFiles } from "./ExtendVisaShared";
import { CR_XV, CR_XV_FOLDER, CR_XV_STAGE_KEY } from "../contractConstants";

const COLUMNS = Object.freeze([{ key: "up", label: translation("key_uploaded") }, { key: "prep", label: translation("key_prepared") }, { key: "ready", label: translation("key_ready") }]);
const done = (rows) => rows.filter((r) => r.prepared && r.ready).length;

/* ---- the applicability dialog (prototype evApplic; EXTEND.md §5.2 / §5.5) ---- */
const AssessDialog = ({ section, busy, onClose, onConfirm }) => {
    const prev = section.assessment?.value ? section.assessment : null;
    const [value, setValue] = useState(prev?.value || "");
    const [reason, setReason] = useState("");
    const [tried, setTried] = useState(false);
    const [error, setError] = useState("");
    const errs = tried ? { v: !value ? translation("key_ar_select_assessment") : "", reason: !reason.trim() ? translation("key_ar_reason_required") : "" } : {};
    const confirm = async () => {
        setTried(true);
        if (!value || !reason.trim()) return;
        const res = await onConfirm(value, reason.trim());
        if (res && !res.ok && res.message) setError(res.message);
    };
    /* U-0304 Revised display vocabulary (Applies / Does not apply); the stored values stay applicable / not_applicable (Part C) */
    const labelOf = (v) => translation(v === CR_XV.ASSESS.APPLICABLE ? "key_applies" : "key_does_not_apply");
    return (
        <Modal title={ `${ translation(prev ? "key_cr_xv_change_assessment" : "key_cr_xv_assess") } — ${ section.label }` } width={ 540 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
            footer={ (
                <>
                    <span className="grow" />
                    <Btn variant="secondary" type="button" disabled={ busy } onClick={ onClose }>{ translation("key_cancel") }</Btn>
                    <Btn variant="primary" type="button" disabled={ busy } onClick={ confirm }>{ busy ? `${ translation("key_loading") }…` : translation(prev ? "key_ar_change_assessment" : "key_ar_record_assessment") }</Btn>
                </>
            ) }>
            <p className="intro">{ fill(translation("key_cr_xv_assess_intro"), { section: section.label }) }</p>
            <Field label={ translation("key_ar_assessment") } required error={ errs.v } full>
                <RadioGroup name="xv-assess" value={ value } disabled={ busy } ariaLabel={ translation("key_ar_assessment") } onChange={ setValue }
                    options={ [{ value: CR_XV.ASSESS.APPLICABLE, label: labelOf(CR_XV.ASSESS.APPLICABLE) }, { value: CR_XV.ASSESS.NOT_APPLICABLE, label: labelOf(CR_XV.ASSESS.NOT_APPLICABLE) }] } />
            </Field>
            <Field label={ translation("key_reason") } htmlFor="xv-assess-reason" required error={ errs.reason } hint={ translation("key_ar_reason_help") } full>
                <TextArea id="xv-assess-reason" rows={ 3 } value={ reason } maxLength={ CR_XV.REASON_MAX } disabled={ busy } invalid={ Boolean(errs.reason) } onChange={ (e) => setReason(e.target.value) } />
            </Field>
            { prev && <div className="note warn">{ translation("key_cr_xv_assess_change_note") } ({ labelOf(prev.value) }{ stampOf(prev.at, prev.by) ? ` — ${ stampOf(prev.at, prev.by) }` : "" })</div> }
            { error && <div className="note danger" role="alert">{ error }</div> }
        </Modal>
    );
};
AssessDialog.propTypes = { section: PropTypes.object.isRequired, busy: PropTypes.bool, onClose: PropTypes.func.isRequired, onConfirm: PropTypes.func.isRequired };

/* ---- the evidence cell: Yes / No, then Link file (folder files · upload) · Replace · Unlink under Documents — Manage ---- */
const EvidenceCell = ({ req, folderFiles, canManage, canUpload, busy, run }) => {
    const [menu, setMenu] = useState(false);
    const ref = useRef(null);
    const pickRef = useRef(null);
    const close = useCallback(() => setMenu(false), []);
    useOutsideClick(ref, close, menu);
    if (req.upload_required === false) {   /* X-2: a physical original — never uploaded */
        return <Cell><span className="g1-up dash" title={ translation("key_physical_original_no_upload") }>—</span></Cell>;
    }
    const linked = Boolean(req.uploaded) || (Array.isArray(req.files) && req.files.length > 0);
    const file = Array.isArray(req.files) && req.files.length ? req.files[0] : null;
    const link = (fileId) => { close(); run((r) => extendVisaAssociateAPI(r, { file_id: fileId, requirement_key: req.key })); };
    const unlink = () => file && run((r) => extendVisaAssociateAPI(r, { file_id: file.id, requirement_key: null }));
    const onFiles = (files) => { close(); uploadCaseFiles(files, run, req.key, CR_XV_FOLDER.IMM); };
    return (
        <Cell><div className="g1-cell xvassoc" ref={ ref }>
            <span className={ `g1-up ${ linked ? "yes" : "no" }` } title={ file ? (file.file_name || file.file_path) : translation("key_cr_xv_evidence_none") }>{ translation(linked ? "key_yes" : "key_no") }</span>
            { canManage && linked && (
                <>
                    { canUpload && <button type="button" className="g1-ficon" aria-label={ translation("key_replace") } title={ translation("key_replace") } disabled={ busy } onClick={ () => pickRef.current?.click() }><Icon name="refresh" size={ 12 } strokeWidth={ 1.5 } /></button> }
                    <button type="button" className="g1-ficon" aria-label={ translation("key_cr_xv_unlink") } title={ translation("key_cr_xv_unlink") } disabled={ busy } onClick={ unlink }><Icon name="x" size={ 12 } strokeWidth={ 1.6 } /></button>
                </>
            ) }
            { canManage && !linked && (
                <div className="g1-menu-wrap">
                    <button type="button" className="g1-btn xs" aria-haspopup="menu" aria-expanded={ menu } disabled={ busy } onClick={ () => setMenu((v) => !v) }>{ translation("key_cr_xv_link_file") }</button>
                    { menu && (
                        <div className="g1-menu" role="menu">
                            { (folderFiles || []).map((f) => <button key={ f.id } type="button" role="menuitem" className="g1-menu-item" onClick={ () => link(f.id) }>{ f.file_name || String(f.file_path || "").split("/").pop() }</button>) }
                            { canUpload && <button type="button" role="menuitem" className="g1-menu-item" onClick={ () => { close(); pickRef.current?.click(); } }>{ translation("key_cr_xv_upload_new") }</button> }
                            { !(folderFiles || []).length && !canUpload && <div className="g1-menu-note">{ translation("key_cr_xv_evidence_none") }</div> }
                        </div>
                    ) }
                </div>
            ) }
            { canManage && canUpload && <FilePicker ref={ pickRef } onFiles={ onFiles } /> }
        </div></Cell>
    );
};
EvidenceCell.propTypes = { req: PropTypes.object.isRequired, folderFiles: PropTypes.array, canManage: PropTypes.bool, canUpload: PropTypes.bool, busy: PropTypes.bool, run: PropTypes.func.isRequired };

/* ---- the submitted snapshots (EXTEND.md §5.12): view-only history, distinct from the working set ---- */
const snapshotRows = (snap) => {
    if (!snap) return [];
    if (Array.isArray(snap.rows)) return snap.rows;
    if (Array.isArray(snap.sections)) return snap.sections.flatMap((s) => (Array.isArray(s.requirements) ? s.requirements : []));
    if (Array.isArray(snap.requirements)) return snap.requirements;
    return [];
};
const Snapshots = ({ submissions, labels = {} }) => {
    const [open, setOpen] = useState(null);
    if (!Array.isArray(submissions) || !submissions.length) return null;
    return (
        <div className="g1-snaps" data-ev-snapshots={ submissions.length }>
            { submissions.map((sn, ix) => (
                <div key={ sn.id || ix } className="g1-snap" data-ev-snapshot={ ix + 1 }>
                    <button type="button" aria-expanded={ open === ix } onClick={ () => setOpen(open === ix ? null : ix) }>
                        <b>{ translation("key_cr_xv_snapshot") } { ix + 1 }</b>
                        <span className="m">{ stampOf(sn.submitted_at, sn.submitted_by) }</span>
                        { sn.returned_at && <span className="r">{ translation("key_cr_xv_snapshot_returned") } { stampOf(sn.returned_at, sn.returned_by) }{ sn.return_reason ? ` — ${ sn.return_reason }` : "" }</span> }
                        <span className="chev" aria-hidden="true"><Icon name="chev_down" size={ 10 } strokeWidth={ 1.8 } /></span>
                    </button>
                    { open === ix && (
                        <div className="body">
                            { snapshotRows(sn.snapshot).map((r, i) => (
                                <div key={ r.requirement_key || r.key || i } className="row">
                                    <span className="nm">{ r.label || labels[r.requirement_key || r.key] || r.requirement_key || r.key }</span>
                                    <span className="c">{ r.uploaded === null ? "—" : translation((r.uploaded ?? (Array.isArray(r.files) && r.files.length > 0)) ? "key_uploaded" : "key_no") }</span>
                                    <span className="c s">{ r.prepared ? translation("key_prepared") : "—" }</span>
                                    <span className="c s">{ r.ready ? translation("key_ready") : "—" }</span>
                                </div>
                            )) }
                            <div className="g1-note">{ translation("key_cr_xv_snapshot_note") }</div>
                        </div>
                    ) }
                </div>
            )) }
        </div>
    );
};
Snapshots.propTypes = { submissions: PropTypes.array, labels: PropTypes.object };

/**
 * The case's Immigration stage (prototype b30ImmPanelEV; EXTEND.md §5): sections from the server — `employer` · `helper`,
 * then the conditional sections with their attributable assessment and the never-blocking `optional` — each a listing
 * of Uploaded · Prepared · Ready; evidence linking under Documents — Manage, marks for the assigned owner only
 * (`can.mark_*`), the readiness gate explained to an entitled user, Return / Rework at Submitted, the submitted
 * snapshots, the unlinked case documents, Send Template, Cancel case and the status menu. Everything re-renders from the
 * server's case after each call — nothing is computed here.
 */
const ExtendVisaImmigration = ({ caseData: c, run, busy, permissions, stageView = true }) => {
    const can = c.can || {};
    const status = c.immigration?.status;
    const open = c.lifecycle === CR_XV.LIFECYCLE.OPEN;
    const working = open && status !== CR_XV.IMM.SUBMITTED;
    const entitled = Boolean(permissions?.stageActionPermission?.includes("change_status"));
    const [assess, setAssess] = useState(null);          /* the section being assessed */
    const [returning, setReturning] = useState(false);
    const [collapsed, setCollapsed] = useState({});
    const uploadRef = useRef(null);
    const template = useCaseTemplate("processing_immigration");

    const tick = (req, mark, value) => run((ref) => extendVisaMarkAPI(ref, { requirement_key: req.key, mark, value }));
    const sections = Array.isArray(c.sections) ? c.sections : [];
    const folderFiles = caseFolderFiles(c.folder_files, CR_XV_FOLDER.IMM);   /* U-0309: this stage's folder only */
    /* X-1: a snapshot row carries `requirement_key` only — its label comes from the working sections */
    const reqLabels = useMemo(() => Object.fromEntries((Array.isArray(c.sections) ? c.sections : []).flatMap((s) => (Array.isArray(s.requirements) ? s.requirements : []).map((r) => [r.key, r.label]))), [c.sections]);
    const gate = c.gate || { ok: true, outstanding: [] };

    /* the status menu: the next step only; Ready to Submit stays visible-but-disabled with the outstanding list for an entitled user */
    const options = useMemo(() => {
        if (!working) return [];
        if (status === CR_XV.IMM.NOT_READY) return [{ id: CR_XV.IMM_COMMAND.READY_TO_SUBMIT, name: stageToken(CR_XV_STAGE_KEY.IMM, CR_XV.IMM.READY_TO_SUBMIT).label, enable: Boolean(can.ready_to_submit) }];
        if (status === CR_XV.IMM.READY_TO_SUBMIT) return [{ id: CR_XV.IMM_COMMAND.SUBMITTED, name: stageToken(CR_XV_STAGE_KEY.IMM, CR_XV.IMM.SUBMITTED).label, enable: Boolean(can.submit) }];
        return [];
    }, [working, status, can.ready_to_submit, can.submit]);
    const showMenu = options.length > 0 && (options.some((o) => o.enable) || (entitled && gate.outstanding?.length > 0));
    const gateNote = entitled && !gate.ok && Array.isArray(gate.outstanding) && gate.outstanding.length > 0 ? (
        <div className="g1-gate" data-ev-gate-note=""><b>{ translation("key_cr_xv_gate_title") }</b><ul>{ gate.outstanding.slice(0, 8).map((o, i) => <li key={ i }>{ o }</li>) }{ gate.outstanding.length > 8 && <li>… +{ gate.outstanding.length - 8 }</li> }</ul></div>
    ) : null;
    const onStatus = async (id) => {
        const res = await run((ref) => extendVisaImmigrationStatusAPI(ref, { status: id }));
        if (!res.ok && res.outstanding?.length) ShowToast("error", `${ translation("key_cr_xv_gate_title") } ${ res.outstanding.join(" · ") }`);
    };

    return (
        <StagePanel locked={ !open }>
            <StagePanelHead title={ translation("key_immigration") } stage={ CR_XV_STAGE_KEY.IMM } status={ status } updatedAt={ c.immigration?.updated_at }>
                <PortalButton />
                { open && can.upload && (
                    <>
                        <button type="button" className="g1-btn primary" data-fid="xv-upload" disabled={ busy } onClick={ () => uploadRef.current?.click() }><Icon name="upload" size={ 11 } strokeWidth={ 1.8 } />{ translation("key_upload") }</button>
                        <FilePicker ref={ uploadRef } multiple onFiles={ (files) => uploadCaseFiles(files, run, undefined, CR_XV_FOLDER.IMM) } />
                    </>
                ) }
            </StagePanelHead>
            <div className="g1-panel-body">
                { sections.map((s) => {
                    const rows = Array.isArray(s.requirements) ? s.requirements : [];
                    const a = s.assessment?.value ? s.assessment : null;
                    const isOptional = Boolean(s.optional) || s.key === CR_XV.SECTION.OPTIONAL;
                    const applies = isOptional ? true : (s.applicable !== undefined ? Boolean(s.applicable) : a?.value === CR_XV.ASSESS.APPLICABLE);
                    const isOpen = collapsed[s.key] !== undefined ? !collapsed[s.key] : (!isOptional && (applies || !a));
                    const listing = (
                        <Listing title={ s.label } done={ done(rows) } total={ rows.length } columns={ COLUMNS } dim={ s.conditional && a && !applies }>
                            { rows.map((r) => (
                                <ListingRow key={ r.key } name={ r.label } sub={ r.never_blocking ? translation("key_cr_xv_never_blocks") : undefined }>
                                    <EvidenceCell req={ r } folderFiles={ folderFiles } canManage={ working && Boolean(can.manage_evidence) } canUpload={ working && Boolean(can.upload) } busy={ busy } run={ run } />
                                    <CheckCell checked={ Boolean(r.prepared) } disabled={ !working || !can.mark_prepared || busy } label={ `${ r.label } — ${ translation("key_prepared") }` } onChange={ (v) => tick(r, CR_XV.MARK.PREPARED, v) } />
                                    <CheckCell checked={ Boolean(r.ready) } disabled={ !working || !can.mark_ready || !r.prepared || busy } label={ `${ r.label } — ${ translation("key_ready") }` } onChange={ (v) => tick(r, CR_XV.MARK.READY, v) } />
                                </ListingRow>
                            )) }
                        </Listing>
                    );
                    if (!s.conditional && !isOptional) return <div key={ s.key }>{ listing }</div>;
                    return (
                        <div key={ s.key } className="g1-sec" data-xv-section={ s.key } data-xv-assessment={ isOptional ? "optional" : (a ? a.value : "unassessed") }>
                            <div className="g1-sec-row">
                                <button type="button" className="g1-sec-head" aria-expanded={ isOpen } onClick={ () => setCollapsed((m) => ({ ...m, [s.key]: isOpen })) }>
                                    <span className="t">{ s.label }</span>
                                    <span className="chev" aria-hidden="true"><Icon name="chev_down" size={ 10 } strokeWidth={ 1.8 } /></span>
                                </button>
                                { isOptional
                                    ? <span className="g1-sec-badge optional">{ translation("key_cr_xv_never_blocks") }</span>
                                    : (a
                                        ? <span className={ `g1-sec-badge ${ applies ? "applies" : "no" }` } title={ [a.reason, stampOf(a.at, a.by)].filter(Boolean).join(" — ") }>{ translation(applies ? "key_applies" : "key_does_not_apply") }</span>
                                        : <span className="g1-sec-badge unassessed">{ translation("key_unknown") }</span>) }
                                { !isOptional && working && can.assess && <button type="button" className="g1-btn xs" data-fid={ `xv-applic-${ s.key }` } onClick={ () => setAssess(s) }>{ translation(a ? "key_cr_xv_change_assessment" : "key_cr_xv_assess") }</button> }
                            </div>
                            { isOpen && listing }
                            { isOpen && a && !applies && !isOptional && <div className="g1-note">{ fill(translation("key_cr_xv_not_applicable_note"), { reason: a.reason || "", by: a.by || "", at: a.at ? stampOf(a.at) : "" }) }</div> }
                        </div>
                    );
                }) }
                <Snapshots submissions={ c.submissions } labels={ reqLabels } />
                { /* K-9: the Immigration folder freezes with Submitted */ }
                <FolderFiles files={ folderFiles } canManage={ working && Boolean(can.manage_evidence) } run={ run } busy={ busy } />
                { working && gateNote }
            </div>
            <StageFooter stage={ CR_XV_STAGE_KEY.IMM } onSendTemplate={ template.open } canSendTemplate={ Boolean(can.send_template) }
                statusOptions={ options } current={ null } onChangeStatus={ onStatus } canChangeStatus={ showMenu && stageView } note={ options.length && !options[0].enable ? gateNote : undefined }>
                { open && status === CR_XV.IMM.SUBMITTED && can.return_rework && <button type="button" className="g1-btn" data-fid="xv-return" onClick={ () => setReturning(true) }>{ translation("key_cr_xv_return_rework") }</button> }
                <CancelCaseButton caseData={ c } run={ run } busy={ busy } />
            </StageFooter>
            { assess && <AssessDialog section={ assess } busy={ busy } onClose={ () => setAssess(null) } onConfirm={ async (value, reason) => { const res = await run((ref) => extendVisaApplicabilityAPI(ref, { section_key: assess.key, assessment: value, reason })); if (res.ok) setAssess(null); return res; } } /> }
            { returning && (
                <ReasonDialog title={ translation("key_cr_xv_return_title") } intro={ translation("key_cr_xv_return_intro") } primaryLabel={ translation("key_cr_xv_return_confirm") } busy={ busy } onClose={ () => setReturning(false) }
                    onConfirm={ async (reason) => { const res = await run((ref) => extendVisaImmigrationStatusAPI(ref, { status: CR_XV.IMM_COMMAND.RETURN, reason })); if (res.ok) setReturning(false); return res; } } />
            ) }
            { template.popups }
        </StagePanel>
    );
};

ExtendVisaImmigration.propTypes = {
    stageView: PropTypes.bool,
    caseData: PropTypes.object.isRequired,
    run: PropTypes.func.isRequired,
    busy: PropTypes.bool,
    permissions: PropTypes.object,
};

export default ExtendVisaImmigration;
