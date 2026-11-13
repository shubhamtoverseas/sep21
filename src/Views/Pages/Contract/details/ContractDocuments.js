import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../../../components/Icon/Icon";
import Btn from "../../../../components/ui/Btn";
import Modal from "../../../../components/ui/Modal";
import ConfirmModal from "../../../../components/ui/ConfirmModal";
import { SelectBox } from "../../../../components/ui/FormControls";
import useOutsideClick from "../../../../hooks/useOutsideClick";
import translation from "../../../../utils/translation";
import { associateProcessingFileAPI, getProcessingFiles } from "../../../../services/processings";
import { deleteProcessingFile, fetchProcessingDetails, updateProcessingDocuments, uploadingProcessingFiles } from "../../../../redux/Slices/processing/ProcessingSlice";
import { downloadFile, getFilesNeedingConversion, showSuccessOrError, uploadFiles } from "../../../../services/commonService";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import contractConfig from "../../../../components/ReusableComponents/processing-configs/ContractConfigs";
import consulateConfig from "../../../../components/ReusableComponents/processing-configs/ConsulateConfigs";
import { buildImmigrationRequirementGroups, buildImmigrationRequirementOptions, countsTowardReady, flattenImmigrationRequirementRows } from "../../ProcessingPage/processing-documents/immigrationRequirementOptions";
import RequirementLinkSelect from "../../ProcessingPage/processing-documents/RequirementLinkSelect";
import DocumentsUploadDialog from "./DocumentsUploadDialog";
import { EM_DASH, formatDate , isProcessing, uploadedFlagPayload } from "./contractRecordUtils";
import {
    CR_DOC_ACCEPT, CR_DOC_FILE_LIMIT, CR_DOC_ACCEPT_RE, CR_DOC_FOLDER, CR_DOC_FOLDER_LABEL_KEYS, CR_DOC_FOLDERS_BY_GROUP, CR_DOC_LISTING_TITLE_KEYS, CR_DOC_PAGE_LIMIT,
    CR_DOC_PERMISSION, CR_DOC_VIEW, CR_IMMIGRATION_SUBMITTED,
} from "../contractConstants";

const DocumentsConvertDialog = lazy(() => import("./DocumentsConvertDialog"));

/**
 * Documents view of the Contract record — prototype Contract_Details.html "openDocs" (v210 / v211): the record is replaced
 * by "‹ Documents · Gallery / List · Upload", one chip per folder of the Group (workbook #58), the folder's files as cards
 * or rows (Preview · Download · More ▾ Replace / Delete) and the folder's "… DOCUMENTS n / n — UPLOADED" listing.
 * Permissions (workbook #60): View shows the view; Upload adds a file (also outside Processing — the lifecycle lock does
 * not reach Documents); Manage links, replaces and removes. An upload into Immigration classifies the file first
 * (DocumentsUploadDialog). Data: get-processing-file-list per folder, upload-processing-files (+ requirement_key),
 * delete-processing-files, get-processing-details + update-processing-documents for the Uploaded flags,
 * associate-processing-file for links. Rename has no API.
 */
const baseName = (path) => { try { return decodeURIComponent(String(path || "").split("?")[0].split("/").pop() || ""); } catch { return String(path || "").split("/").pop() || ""; } };
const fmtSize = (bytes) => { const n = Number(bytes); if (!n || Number.isNaN(n)) return null; return n >= 1048576 ? `${ (n / 1048576).toFixed(1) } MB` : `${ Math.max(1, Math.round(n / 1024)) } KB`; };
const fileMeta = (file) => { const parts = [fmtSize(file.file_size ?? file.size), formatDate(file.created_at)].filter(Boolean); if (parts.length) return parts.join(" · "); const ext = baseName(file.file_path).split(".").pop(); return ext ? ext.toUpperCase() : ""; };
const isImage = (p) => /\.(jpe?g|png|gif|webp)(\?|$)/i.test(String(p || ""));
const isPdf = (p) => /\.pdf(\?|$)/i.test(String(p || ""));

const FileMenu = ({ file, canReplace, canDelete, busy, onReplace, onDelete }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const close = useCallback(() => setOpen(false), []);
    useOutsideClick(ref, close, open);
    return (
        <div className="g1-menu-wrap" ref={ ref } onKeyDown={ (e) => { if (e.key === "Escape") close(); } }>
            <button type="button" className="g1-btn" aria-haspopup="menu" aria-expanded={ open } aria-label={ `${ translation("key_more_actions") } — ${ baseName(file.file_path) }` } onClick={ () => setOpen((v) => !v) }>
                { translation("key_more") }<Icon name="chev_down" size={ 10 } />
            </button>
            { open && (
                <div role="menu" aria-label={ translation("key_more_actions") } className="g1-menu g1-menu-file">
                    <button type="button" role="menuitem" className="g1-menu-item" aria-disabled={ !canReplace || busy } disabled={ !canReplace || busy } onClick={ () => { close(); onReplace(file); } }>{ translation("key_replace") }</button>
                    <button type="button" role="menuitem" className="g1-menu-item danger" aria-disabled={ !canDelete } disabled={ !canDelete } onClick={ () => { close(); onDelete(file); } }>{ translation("key_delete") }</button>
                </div>
            ) }
        </div>
    );
};
FileMenu.propTypes = { file: PropTypes.object.isRequired, canReplace: PropTypes.bool, canDelete: PropTypes.bool, busy: PropTypes.bool, onReplace: PropTypes.func.isRequired, onDelete: PropTypes.func.isRequired };

const ContractDocuments = ({ contractId, row, folder, onFolder, onBack, permissions }) => {
    const dispatch = useDispatch();
    const { contractDetails } = useSelector((s) => s.contracts);
    const docPerms = permissions?.documentPermissions || [];
    const canView = docPerms.includes(CR_DOC_PERMISSION.VIEW);
    const canUpload = docPerms.includes(CR_DOC_PERMISSION.UPLOAD);
    const canManage = docPerms.includes(CR_DOC_PERMISSION.MANAGE);
    /* U-0289: the Uploaded Yes / No declaration is a checklist mark — Stage Actions · Edit while Processing only (TERMINAL §1 lock); the files stay live */
    const declEditable = isProcessing(row) && (permissions?.stageActionPermissions || []).includes("edit");
    const folders = useMemo(() => CR_DOC_FOLDERS_BY_GROUP[Number(row?.group)] || CR_DOC_FOLDERS_BY_GROUP[1], [row?.group]);
    const active = folders.includes(folder) ? folder : folders[0];
    const isImmigration = active === CR_DOC_FOLDER.IMMIGRATION;
    const immigrationSubmitted = String(contractDetails?.["processingImmigrationDocumentModel.status"] || "") === CR_IMMIGRATION_SUBMITTED;
    const canLink = canManage && !immigrationSubmitted;

    const [view, setView] = useState(CR_DOC_VIEW.GALLERY);
    const [files, setFiles] = useState({});     // folder → rows; undefined = not loaded yet
    const [totals, setTotals] = useState({});
    const [details, setDetails] = useState({}); // folder → get-processing-details payload
    const [decl, setDecl] = useState({});       // folder → { groups } of the Uploaded listing (editable copy)
    const [preview, setPreview] = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [classify, setClassify] = useState(false);
    const [convert, setConvert] = useState(null); // { files, originals, mode, target, requirementKey } → DocumentsConvertDialog
    const [busy, setBusy] = useState(false);
    const inputRef = useRef(null);
    const pick = useRef({ mode: "upload", target: null, requirementKey: null });

    const loadFiles = useCallback(async (f) => {
        try {
            const res = await getProcessingFiles({ contract_id: Number(contractId), type: f, limit: CR_DOC_PAGE_LIMIT, page: 1 });
            const d = res?.data?.data;
            const rows = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
            setFiles((s) => ({ ...s, [f]: rows }));
            setTotals((s) => ({ ...s, [f]: Array.isArray(d) ? rows.length : Number(d?.total ?? rows.length) }));
        } catch {
            setFiles((s) => ({ ...s, [f]: s[f] || [] }));
            ShowToast("error", translation("key_something_went_wrong"));
        }
    }, [contractId]);
    const loadDetails = useCallback((f) => {
        if (!CR_DOC_LISTING_TITLE_KEYS[f]) return;
        dispatch(fetchProcessingDetails({ contract_id: contractId, type: f })).then((res) => {
            if (!res.error) setDetails((s) => ({ ...s, [f]: res.payload?.data || null }));
        });
    }, [dispatch, contractId]);
    const refresh = useCallback((f) => { loadFiles(f); loadDetails(f); }, [loadFiles, loadDetails]);

    useEffect(() => { if (canView) folders.forEach(loadFiles); }, [canView, folders, loadFiles]);
    useEffect(() => { if (canView) loadDetails(active); }, [canView, active, loadDetails]);

    /* the Uploaded listing: Contract = service agreements, Consulate = employer + helper documents (both editable,
       saved with update-processing-documents), Immigration = the checklist groups — since backend 377 (v21 §W) its rows
       take the same Yes / No, one changed row per save; a physical original has no Uploaded */
    useEffect(() => {
        const d = details[active];
        if (!d) { setDecl((s) => (s[active] == null ? s : { ...s, [active]: null })); return; }
        let groups = [];
        if (active === CR_DOC_FOLDER.CONTRACT) {
            groups = [{ key: "all", rows: contractConfig.mapContractServiceAgreementData(d).map((r) => ({ ...r, label: r.service_agreement })) }];
        } else if (active === CR_DOC_FOLDER.CONSULATE) {
            if (!contractDetails) return;
            groups = [
                { key: "employer", label: translation("key_employer_documents"), rows: consulateConfig.mapConsulateEmpooyerDocTableData(d, contractDetails) },
                { key: "helper", label: translation("key_helper_documents"), rows: consulateConfig.mapConsulateHelperDocTableData(d, contractDetails) },
            ].filter((g) => g.rows.length);
        } else if (active === CR_DOC_FOLDER.IMMIGRATION) {
            groups = buildImmigrationRequirementGroups(d, { hideNotApplicable: true });
        }
        setDecl((s) => ({ ...s, [active]: { groups } }));
    }, [details, active, contractDetails]);

    const saveUploaded = useCallback((f, groups, changed) => {
        let payload = { type: f, contract_id: contractId };
        if (f === CR_DOC_FOLDER.CONTRACT) {
            groups[0].rows.forEach((r) => { payload[`${ contractConfig.serviceAgreementMapping[r.service_agreement] }_uploaded`] = r.uploaded === "Yes" ? 1 : 0; });
        } else if (f === CR_DOC_FOLDER.IMMIGRATION) {
            /* backend 377: only the row that changed; the server clears that row's Prepared / Ready and may drop Ready to
               Submit to Not Ready, so the checklist is re-read after the save */
            if (!changed?.key) return;
            payload = uploadedFlagPayload(f, contractId, changed.key, changed.value);
        } else {
            const d = details[f] || {};
            const emp = groups.find((g) => g.key === "employer")?.rows || [];
            const helper = groups.find((g) => g.key === "helper")?.rows || [];
            const all = consulateConfig.updatePayloadOfConsulate(consulateConfig.mapConsulateContractTableData(d, contractDetails), emp, helper);
            Object.entries(all).forEach(([k, v]) => { if (k.endsWith("_uploaded")) payload[k] = v; });
        }
        dispatch(updateProcessingDocuments(payload)).then((res) => { showSuccessOrError(res); if (res.error || f === CR_DOC_FOLDER.IMMIGRATION) loadDetails(f); });
    }, [dispatch, contractId, details, contractDetails, loadDetails]);
    /* a row is identified by its requirement key (the label repeats across sections); folders without keys fall back to the label */
    const rowId = (r) => r.requirementKey || r.label;
    const setUploaded = useCallback((gKey, id, value) => {
        const cur = decl[active]; if (!cur) return;
        const groups = cur.groups.map((g) => (g.key !== gKey ? g : { ...g, rows: g.rows.map((r) => (rowId(r) === id ? { ...r, uploaded: value } : r)) }));
        setDecl((s) => ({ ...s, [active]: { ...cur, groups } }));
        saveUploaded(active, groups, { key: id, value });
    }, [decl, active, saveUploaded]);

    /* Immigration file ↔ requirement link; the classification choices for an upload */
    const requirementOptions = useMemo(() => (isImmigration ? buildImmigrationRequirementOptions(details.immigration) : []), [isImmigration, details.immigration]);
    const classifyOptions = useMemo(() => {
        const groups = isImmigration ? buildImmigrationRequirementGroups(details.immigration, { hideNotApplicable: true }) : [];
        const rows = flattenImmigrationRequirementRows(groups).filter((r) => r.requirementKey && r.upload);
        const seen = new Set();
        const unique = rows.filter((r) => (seen.has(r.requirementKey) ? false : seen.add(r.requirementKey)));
        const linked = (key) => (files.immigration || []).find((f) => f.requirement_key === key);
        const toOption = (r) => ({ value: r.requirementKey, label: r.optionLabel, file: linked(r.requirementKey) ? baseName(linked(r.requirementKey).file_path) : undefined });
        /* "current" = the rows still counted toward Ready to Submit and not yet evidenced; case-only / optional / evidenced rows follow */
        return {
            current: unique.filter((r) => countsTowardReady(r) && r.uploaded !== "Yes").map(toOption),
            others: unique.filter((r) => !countsTowardReady(r) || r.uploaded === "Yes").map(toOption),
        };
    }, [isImmigration, details.immigration, files.immigration]);
    const classifyRestriction = !canManage ? "key_cr_doc_needs_manage" : (immigrationSubmitted ? "key_cr_doc_snapshot_immutable" : "");

    /* upload / replace (U-0285): 10 MB, PDF / JPG / PNG only (images → PDF first); Word files are refused */
    const openPicker = (mode, target, requirementKey) => {
        pick.current = { mode, target: target || null, requirementKey: requirementKey || null };
        if (inputRef.current) { inputRef.current.multiple = mode === "upload" && !requirementKey; inputRef.current.value = ""; inputRef.current.click(); }
    };
    const startUpload = () => { if (isImmigration) setClassify(true); else openPicker("upload"); };
    const doUpload = async (filesToUpload, { mode, target, requirementKey }) => {
        setBusy(true);
        try {
            const prepared = filesToUpload.map((f) => { const w = new File([f], f.name, { type: f.type }); w.path = `processing/${ active }`; return w; });
            const uploaded = await uploadFiles(prepared);
            if (!Array.isArray(uploaded) || uploaded.length === 0) return;
            const paths = uploaded.map((f) => { const u = String(f.url || ""); const i = u.indexOf("processing"); return i >= 0 ? u.substring(i) : u; });
            const payload = { contract_id: contractId, type: active, files: paths };
            const key = mode === "replace" ? target?.requirement_key : requirementKey;
            if (isImmigration && key) payload.requirement_key = key;
            const res = await dispatch(uploadingProcessingFiles(payload));
            showSuccessOrError(res);
            if (!res.error && mode === "replace" && target) {
                const del = await dispatch(deleteProcessingFile({ file_id: target.id, contract_id: contractId }));
                if (del.error) showSuccessOrError(del);
            }
            if (!res.error) refresh(active);
        } catch (e) {
            ShowToast("error", e?.message || translation("key_error_uploading_files"));
        } finally { setBusy(false); }
    };
    const onPicked = (e) => {
        const list = Array.from(e.target.files || []); e.target.value = "";
        if (!list.length) return;
        if (list.some((f) => !CR_DOC_ACCEPT_RE.test(f.name || ""))) { ShowToast("error", translation("key_cr_doc_formats")); return; }
        if (list.some((f) => f.size > CR_DOC_FILE_LIMIT)) { ShowToast("error", translation("key_cr_doc_max_size")); return; }
        list.forEach((f) => { f.path = `processing/${ active }`; });
        const request = { ...pick.current };
        const needConversion = getFilesNeedingConversion(list);
        if (needConversion.length) setConvert({ files: needConversion, originals: list, ...request });
        else doUpload(list, request);
    };
    const onConverted = (accepted) => { const c = convert; setConvert(null); if (!c) return; const kept = c.originals.filter((f) => !c.files.some((x) => x.name === f.name)); doUpload([...kept, ...accepted], c); };
    const confirmDelete = () => {
        const f = toDelete; if (!f) return;
        dispatch(deleteProcessingFile({ file_id: f.id, contract_id: contractId })).then((res) => { showSuccessOrError(res); setToDelete(null); if (!res.error) refresh(active); });
    };
    /* Immigration row: link an unlinked folder file to the requirement, or unlink the linked one (Documents — Manage; the
       server recomputes Uploaded and clears the row's sign-offs — REQ-22; refused while Submitted). A refusal
       (400 INVALID_REQUIREMENT_KEY: the row set changed meanwhile) re-reads the details and files as well. */
    const associate = async (fileId, requirementKey) => {
        setBusy(true);
        try {
            const res = await associateProcessingFileAPI({ contract_id: Number(contractId), file_id: Number(fileId), requirement_key: requirementKey });
            if (!res?.data?.status) ShowToast("error", res?.data?.message || translation("key_something_went_wrong"));
            else ShowToast("success", res.data.message);
        } catch (e) { ShowToast("error", e?.response?.data?.message || translation("key_something_went_wrong")); }
        finally { setBusy(false); refresh(CR_DOC_FOLDER.IMMIGRATION); }
    };

    if (!canView) return <div className="col mcdt-docs" data-mc-fullbleed=""><div className="mcdt-denied" role="status"><div className="ic"><Icon name="lock" size={ 17 } strokeWidth={ 1.7 } /></div><h1>{ translation("key_not_available") }</h1><p>{ translation("key_cr_docs_not_available") }</p></div></div>;

    const list = files[active];
    const listing = decl[active];
    const counts = listing ? (() => {
        const rows = listing.groups.flatMap((g) => g.rows).filter((r) => (isImmigration ? countsTowardReady(r) && !r.physical : true));
        return { n: rows.filter((r) => r.uploaded === "Yes").length, m: rows.length };
    })() : null;
    const actions = (file) => (
        <div className="g1-file-actions">
            <button type="button" className="g1-btn" onClick={ () => setPreview(file) }>{ translation("key_preview") }</button>
            <button type="button" className="g1-btn" onClick={ () => downloadFile(file.file_path) }>{ translation("key_download") }</button>
            { (canUpload || canManage) && <FileMenu file={ file } canReplace={ canManage } canDelete={ canManage } busy={ busy } onReplace={ (f) => openPicker("replace", f) } onDelete={ setToDelete } /> }
        </div>
    );
    const link = (file) => (isImmigration && requirementOptions.length > 0 ? (
        <div className="g1-file-link"><RequirementLinkSelect contractId={ contractId } file={ file } options={ requirementOptions } canEdit={ canLink } onLinked={ () => refresh(CR_DOC_FOLDER.IMMIGRATION) } onRefused={ () => refresh(CR_DOC_FOLDER.IMMIGRATION) } /></div>
    ) : null);

    return (
        <div className="col mcdt-docs" data-mc-fullbleed="">
            <input ref={ inputRef } type="file" accept={ CR_DOC_ACCEPT } multiple onChange={ onPicked } className="g1-file-input" aria-hidden="true" tabIndex={ -1 } />
            <div className="g1-docs-head">
                <button type="button" className="g1-docs-back" aria-label={ translation("key_back_to_record") } onClick={ onBack }><Icon name="chev_left" size={ 13 } strokeWidth={ 1.7 } /></button>
                <span className="g1-docs-title">{ translation("key_documents") }</span>
                <span className="grow" />
                <div className="g1-docs-seg" role="group" aria-label={ translation("key_view") }>
                    <button type="button" aria-pressed={ view === CR_DOC_VIEW.GALLERY } className={ view === CR_DOC_VIEW.GALLERY ? "on" : "" } onClick={ () => setView(CR_DOC_VIEW.GALLERY) }><Icon name="grid" size={ 12 } />{ translation("key_gallery") }</button>
                    <button type="button" aria-pressed={ view === CR_DOC_VIEW.LIST } className={ view === CR_DOC_VIEW.LIST ? "on" : "" } onClick={ () => setView(CR_DOC_VIEW.LIST) }><Icon name="list" size={ 12 } />{ translation("key_docs_list") }</button>
                </div>
                { canUpload && (
                    <button type="button" className="g1-btn primary" disabled={ busy } onClick={ startUpload }>
                        <Icon name="upload" size={ 11 } strokeWidth={ 1.8 } />{ busy ? translation("key_uploading") : translation("key_upload") }
                    </button>
                ) }
            </div>

            <div role="tablist" aria-label={ translation("key_cr_document_folders") } className="g1-folder-chips">
                { folders.map((f) => (
                    <button key={ f } type="button" role="tab" aria-selected={ active === f } className="g1-folder-chip" onClick={ () => onFolder(f) }>
                        <Icon name="folder" size={ 13 } />{ translation(CR_DOC_FOLDER_LABEL_KEYS[f]) }<span className="ct">{ totals[f] ?? (files[f] ? files[f].length : "…") }</span>
                    </button>
                )) }
            </div>

            { !list ? (
                <div className="mcdt-note">{ translation("key_loading") }…</div>
            ) : list.length === 0 ? (
                <div className="g1-docs-empty"><Icon name="filetext" size={ 16 } /><div>{ translation("key_no_documents_to_display") }</div></div>
            ) : view === CR_DOC_VIEW.GALLERY ? (
                <div className="g1-files-grid">
                    { list.map((file) => (
                        <div key={ file.id } className="g1-file-card">
                            <div className="g1-file-thumb">{ isImage(file.file_path) ? <img src={ file.file_path } alt="" loading="lazy" /> : <Icon name="filetext" size={ 22 } /> }</div>
                            <div className="g1-file-body">
                                <div className="g1-file-name">{ baseName(file.file_path) }</div>
                                <div className="g1-file-meta">{ fileMeta(file) }</div>
                                { link(file) }
                            </div>
                            { actions(file) }
                        </div>
                    )) }
                </div>
            ) : (
                <div className="g1-listing"><div className="g1-listing-body">
                    { list.map((file) => (
                        <div key={ file.id } className="g1-row">
                            <div className="g1-row-name"><Icon name="filetext" size={ 16 } /><span className="nm">{ baseName(file.file_path) }</span><span className="meta">{ fileMeta(file) }</span>{ link(file) }</div>
                            <div className="g1-cell auto">{ actions(file) }</div>
                        </div>
                    )) }
                </div></div>
            ) }

            { listing && listing.groups.length > 0 && (
                <div className="g1-listing" data-folder={ active }>
                    <div className="g1-listing-head">
                        <span className="g1-listing-title"><b>{ translation(CR_DOC_LISTING_TITLE_KEYS[active]) }</b><i>{ counts.n } / { counts.m }{ isImmigration ? ` ${ translation("key_current_requirements_uploaded") }` : "" }</i></span>
                        <span className="g1-col">{ translation("key_uploaded") }</span>
                    </div>
                    <div className="g1-listing-body">
                        { listing.groups.map((g) => (
                            <React.Fragment key={ g.key }>
                                { g.label && <div className="g1-listing-group">{ g.label }</div> }
                                { g.rows.map((r) => {
                                    const physical = Boolean(r.physical);
                                    /* backend 377: an Immigration row's Uploaded is editable like the Contract folder's — not a physical original, not while Submitted */
                                    const rowEditable = declEditable && (!isImmigration || (!physical && !immigrationSubmitted));
                                    const linkedFile = isImmigration && !physical ? (list || []).find((f) => f.requirement_key === r.requirementKey) || null : null;
                                    const unlinked = isImmigration && !physical && canLink && !linkedFile ? (list || []).filter((f) => !f.requirement_key) : [];
                                    return (
                                        <div key={ rowId(r) } className="g1-row" data-requirement={ r.requirementKey || undefined }>
                                            <div className="g1-row-name">
                                                { isImmigration && r.uploaded === "Yes" && !physical && <Icon name="filetext" size={ 14 } className="linked" /> }<span className="nm">{ r.label }{ r.caseOnly && <> <span className="g1-tag gray">{ translation("key_case_only") }</span></> }</span>
                                                { linkedFile && <button type="button" className="g1-doc-file" title={ translation("key_preview") } onClick={ () => setPreview(linkedFile) }>{ baseName(linkedFile.file_path) }</button> }
                                            </div>
                                            { isImmigration && !physical && canLink && (
                                                <div className="g1-cell auto g1-doc-rowacts">
                                                    { linkedFile ? (
                                                        <>
                                                            <button type="button" className="g1-btn sm" disabled={ busy } onClick={ () => associate(linkedFile.id, null) }>{ translation("key_cr_xv_unlink") }</button>
                                                            <button type="button" className="g1-btn sm danger" disabled={ busy } onClick={ () => setToDelete(linkedFile) }>{ translation("key_remove") }</button>
                                                        </>
                                                    ) : (unlinked.length > 0 && (
                                                        <SelectBox className="g1-decl g1-doc-link" value="" disabled={ busy } aria-label={ `${ r.label } — ${ translation("key_cr_xv_link_file") }` } onChange={ (e) => { if (e.target.value) associate(e.target.value, r.requirementKey); } }>
                                                            <option value="">{ translation("key_cr_xv_link_file") }</option>
                                                            { unlinked.map((f) => <option key={ f.id } value={ f.id }>{ baseName(f.file_path) }</option>) }
                                                        </SelectBox>
                                                    )) }
                                                </div>
                                            ) }
                                            <div className="g1-cell">
                                                { rowEditable ? (
                                                    <SelectBox className="g1-decl" value={ r.uploaded === "Yes" ? "Yes" : "No" } disabled={ busy || !list || list.length === 0 } aria-label={ `${ r.label } — ${ translation("key_uploaded") }` } onChange={ (e) => setUploaded(g.key, rowId(r), e.target.value) }>
                                                        <option value="Yes">{ translation("key_yes") }</option><option value="No">{ translation("key_no") }</option>
                                                    </SelectBox>
                                                ) : (
                                                    <span className={ `g1-ro ${ isImmigration && physical ? "" : r.uploaded === "Yes" ? "yes" : "no" }` } title={ isImmigration && physical ? translation("key_physical_original_no_upload") : undefined }>{ isImmigration && physical ? EM_DASH : translation(r.uploaded === "Yes" ? "key_yes" : "key_no") }</span>
                                                ) }
                                            </div>
                                        </div>
                                    );
                                }) }
                            </React.Fragment>
                        )) }
                    </div>
                </div>
            ) }

            { classify && (
                <DocumentsUploadDialog current={ classifyOptions.current } others={ classifyOptions.others } restriction={ classifyRestriction } onClose={ () => setClassify(false) } onChoose={ (key) => { setClassify(false); openPicker("upload", null, key); } } />
            ) }
            { preview && (
                <Modal title={ baseName(preview.file_path) } width={ 960 } onClose={ () => setPreview(null) } closeLabel={ translation("key_close") } className="mcdt-dlg g1-preview-modal"
                    footer={ <><span className="grow" /><Btn variant="secondary" type="button" onClick={ () => downloadFile(preview.file_path) }><Icon name="download" size={ 12 } />{ translation("key_download") }</Btn></> }>
                    { isImage(preview.file_path) ? (
                        <div className="g1-preview-page g1-preview-large"><img src={ preview.file_path } alt={ baseName(preview.file_path) } /></div>
                    ) : isPdf(preview.file_path) ? (
                        <div className="g1-preview-page g1-preview-large frame"><iframe src={ `${ preview.file_path }#toolbar=0` } title={ baseName(preview.file_path) } /></div>
                    ) : (
                        <div className="g1-preview-page g1-preview-large"><Icon name="filetext" size={ 22 } /><div className="nm">{ baseName(preview.file_path) }</div><div className="hint">{ translation("key_preview_not_available") }</div></div>
                    ) }
                </Modal>
            ) }
            { toDelete && <ConfirmModal title={ translation("key_delete") } body={ `${ translation("key_are_you_sure_you_want_to_delete") } — ${ baseName(toDelete.file_path) }?` } confirmLabel={ translation("key_delete") } danger onConfirm={ confirmDelete } onClose={ () => setToDelete(null) } /> }
            { convert && (
                <Suspense fallback={ null }>
                    <DocumentsConvertDialog files={ convert.files } onDone={ onConverted } onCancel={ () => setConvert(null) } />
                </Suspense>
            ) }
        </div>
    );
};

ContractDocuments.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    row: PropTypes.object,
    folder: PropTypes.string,
    onFolder: PropTypes.func.isRequired,
    onBack: PropTypes.func.isRequired,
    permissions: PropTypes.object,
};

export default ContractDocuments;
