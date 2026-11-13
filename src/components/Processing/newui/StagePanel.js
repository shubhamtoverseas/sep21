import React, { useCallback, useImperativeHandle, useRef, useState } from "react";
import CircularSpinner from "../../ReusableComponents/CircularSpinner";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import Icon from "../../Icon/Icon";
import useOutsideClick from "../../../hooks/useOutsideClick";
import translation from "../../../utils/translation";
import { stageToken } from "../StageTitle";
import { CONTRACT_RECORD_QUERY, STATUS_MENU_BLOCKERS_SHOWN } from "../../../Views/Pages/ProcessingPage/processingConstants";
import { isCurrentStatusOption, statusDisplayName } from "../../../Views/Pages/Contract/contractConstants";
import "./stage-panels.css";

/**
 * The prototype's stage panel kit (Contract_Details.html g1-panel · panelHead · listing · listRow · checkBtn · upCell ·
 * folderBtn · uploadBtn · menuHTML): one white card per stage with a head (title · status tag · "Last updated …" ·
 * actions), content-width field grids, listing tables with CS / Uploaded / Prepared / Ready cells, and the footer
 * (Send Template · status menu). Every stage panel of the Contract record renders through these.
 */
const cx = (...a) => a.filter(Boolean).join(" ");
const pad = (n) => String(n).padStart(2, "0");
const shortName = (name) => { const p = String(name || "").trim().split(/\s+/); return p.length > 1 ? `${ p[0] } ${ p[p.length - 1][0] }.` : p[0] || ""; };
/* backend 385: the deployment `*_updated_at` stamps are UTC "YYYY-MM-DD HH:mm:ss" with no zone; `utc` parses them as such
   and the line shows the viewer's local clock (the older `*_status_updated_at` values keep the plain parse) */
const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;
export const parseStamp = (value, utc = false) => {
    const s = String(value || "").trim();
    if (!s) return null;
    const d = new Date(utc && !HAS_ZONE.test(s) ? `${ s.replace(" ", "T") }Z` : s);
    return Number.isNaN(d.getTime()) ? null : d;
};
export const lastUpdatedText = (updatedAt, updatedBy, utc = false) => {
    if (!updatedAt) return null;
    const d = parseStamp(updatedAt, utc); if (!d) return null;
    return `${ translation("key_cr_last_updated") } ${ pad(d.getDate()) }/${ pad(d.getMonth() + 1) }/${ String(d.getFullYear()).slice(2) } ${ translation("key_at").toLowerCase() } ${ pad(d.getHours()) }:${ pad(d.getMinutes()) }${ updatedBy ? ` ${ translation("key_by").toLowerCase() } ${ shortName(updatedBy) }` : "" }`;
};

export const StagePanel = ({ locked, className, children }) => (
    <section className={ cx("g1-panel", className) } data-stage-locked={ locked ? "" : undefined }>{ children }</section>
);
StagePanel.propTypes = { locked: PropTypes.bool, className: PropTypes.string, children: PropTypes.node };

export const StageTag = ({ stage, status, label, tone }) => {
    const tok = stageToken(stage, status, label);
    return <span className={ `g1-tag ${ tone || tok.tone }` }><span className="dot" />{ tok.label }</span>;
};
StageTag.propTypes = { stage: PropTypes.string, status: PropTypes.string, label: PropTypes.string, tone: PropTypes.string };

export const StagePanelHead = ({ title, stage, status, label, tone, updatedAt, updatedBy, utc, noTag, children }) => {
    const meta = lastUpdatedText(updatedAt, updatedBy, utc);
    return (
        <div className="g1-panel-head">
            <span className="g1-panel-title">{ title }</span>
            { !noTag && <StageTag stage={ stage } status={ status } label={ label } tone={ tone } /> }
            { meta && <span className="g1-meta">{ meta }</span> }
            <span className="grow" />
            { children }
        </div>
    );
};
StagePanelHead.propTypes = { title: PropTypes.node.isRequired, stage: PropTypes.string, status: PropTypes.string, label: PropTypes.string, tone: PropTypes.string, updatedAt: PropTypes.string, updatedBy: PropTypes.string, utc: PropTypes.bool, noTag: PropTypes.bool, children: PropTypes.node };

/* the folder opens the record's Documents view on that folder (?docs=<folder>); Upload opens the same view (prototype openDocs) */
/* the prototype folderBtn glyph is a solid blue folder (the kit's folder icon is an outline), so it stays an inline path */
export const FolderButton = ({ folder, label }) => (
    <Link className="g1-btn" to={ { search: `?${ CONTRACT_RECORD_QUERY.DOCS }=${ folder }` } } data-fid={ `folder-${ folder }` }>
        <svg className="g1-folder-ico" width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4.5h4.2l1.5 2h7.3v7H1.5z" fill="#2563eb" /></svg>{ label }<Icon name="chev_down" size={ 10 } strokeWidth={ 1.8 } className="g1-folder-chev" />
    </Link>
);
FolderButton.propTypes = { folder: PropTypes.string.isRequired, label: PropTypes.node.isRequired };
export const UploadButton = ({ folder }) => (
    <Link className="g1-btn primary" to={ { search: `?${ CONTRACT_RECORD_QUERY.DOCS }=${ folder }` } } data-fid={ `upload-${ folder }` }>
        <Icon name="upload" size={ 11 } strokeWidth={ 1.8 } />{ translation("key_upload") }
    </Link>
);
UploadButton.propTypes = { folder: PropTypes.string.isRequired };

/* ---- fields ---- */
export const FieldRead = ({ label, value, mono, className }) => (
    <div className={ cx("g1-f", className) }><div className="lb">{ label }</div><div className={ cx("vl", mono && "mono", !value && "empty") }>{ value || "—" }</div></div>
);
FieldRead.propTypes = { label: PropTypes.node.isRequired, value: PropTypes.node, mono: PropTypes.bool, className: PropTypes.string };
export const FieldsGrid = ({ cols = 3, className, children }) => <div className={ cx("g1-fields", className) } data-cols={ cols }>{ children }</div>;
FieldsGrid.propTypes = { cols: PropTypes.number, className: PropTypes.string, children: PropTypes.node };

/* ---- listing tables ---- */
export const Listing = ({ title, done, total, columns = [], dim, children }) => (
    <div className={ cx("g1-listing", dim && "g1-dim") }>
        <div className="g1-listing-head">
            <span className="g1-listing-title"><b>{ title }</b>{ total !== undefined && <i>{ done } / { total }</i> }</span>
            { columns.map((c, i) => <span key={ c.key || i } className={ cx("g1-col", c.wide && "wide", c.narrow && "narrow") } aria-hidden={ c.label ? undefined : "true" } title={ c.title || undefined }>{ c.label }</span>) }
        </div>
        <div className="g1-listing-body">{ children }</div>
    </div>
);
Listing.propTypes = { title: PropTypes.node.isRequired, done: PropTypes.number, total: PropTypes.number, columns: PropTypes.array, dim: PropTypes.bool, children: PropTypes.node };

export const ListingRow = ({ name, icon, sub, children }) => (
    <div className="g1-row">
        <div className="g1-row-name">{ icon }<span className="nm">{ name }{ sub && <span className="sub">{ sub }</span> }</span></div>
        { children }
    </div>
);
ListingRow.propTypes = { name: PropTypes.node.isRequired, icon: PropTypes.node, sub: PropTypes.node, children: PropTypes.node };

export const Cell = ({ wide, narrow, children }) => <div className={ cx("g1-cell", wide && "wide", narrow && "narrow") }>{ children }</div>;
Cell.propTypes = { wide: PropTypes.bool, narrow: PropTypes.bool, children: PropTypes.node };
export const EmptyCell = ({ wide, narrow }) => <div className={ cx("g1-cell", wide && "wide", narrow && "narrow") } aria-hidden="true" />;
EmptyCell.propTypes = { wide: PropTypes.bool, narrow: PropTypes.bool };

export const CheckCell = ({ checked, onChange, disabled, label, narrow, wide }) => (
    <Cell narrow={ narrow } wide={ wide }>
        <button type="button" role="checkbox" className="g1-check" aria-checked={ Boolean(checked) } aria-disabled={ disabled ? "true" : undefined } aria-label={ label } disabled={ disabled } onClick={ () => onChange(!checked) }>
            { checked && <Icon name="check" size={ 11 } strokeWidth={ 2.2 } /> }
        </button>
    </Cell>
);
CheckCell.propTypes = { checked: PropTypes.bool, onChange: PropTypes.func.isRequired, disabled: PropTypes.bool, label: PropTypes.string, narrow: PropTypes.bool, wide: PropTypes.bool };

export const UpCell = ({ value, wide }) => {
    const yes = value === "Yes" || value === 1 || value === true;
    return <Cell wide={ wide }><span className={ cx("g1-up", yes ? "yes" : "no") }>{ yes ? translation("key_yes") : translation("key_no") }</span></Cell>;
};
UpCell.propTypes = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]), wide: PropTypes.bool };

/* backend 325: a disabled ready / ready_to_submit entry names what blocks it (`blocked_by`: stage column names, `no_files`,
   `unassessed:<field>` / `missing:<field>` / `purpose_unresolved`) — server identifiers read as words */
export const blockedByWords = (blockedBy) => (Array.isArray(blockedBy)
    ? blockedBy.map((code) => String(code).replace(/^\d+_/, "").replace(/[_:]/g, (m) => (m === ":" ? ": " : " ")).trim()).filter(Boolean)
    : []);
export const blockedByHint = (blockedBy) => blockedByWords(blockedBy).join(" · ");

/* prototype gateNote: the blocked entry stays a one-line item; what is outstanding is listed under the menu
   ("<status> is unavailable — outstanding:" + up to STATUS_MENU_BLOCKERS_SHOWN lines + "… and N more"), so a long
   requirement list (Immigration sends every row × uploaded / prepared / ready) never stretches the entries (Mubin, 2 Nov) */
const BlockedNote = ({ name, blockedBy }) => {
    const words = blockedByWords(blockedBy);
    if (!words.length) return null;
    const shown = words.slice(0, STATUS_MENU_BLOCKERS_SHOWN);
    const more = words.length - shown.length;
    return (
        <div className="g1-menu-note g1-menu-gate" data-ev-gate-note="" data-blocked-status={ name }>
            { translation("key_cr_status_unavailable_outstanding").replace("{value}", name) }
            { shown.map((w, i) => <span key={ i } className="g1-menu-gate-line">· { w }</span>) }
            { more > 0 && <span className="g1-menu-gate-line">{ translation("key_cr_and_n_more").replace("{value}", String(more)) }</span> }
        </div>
    );
};
BlockedNote.propTypes = { name: PropTypes.string, blockedBy: PropTypes.array };

/* ---- footer: Send Template · status menu (opens upward, current option checked, disabled options explained) ---- */
export const StatusMenu = ({ options = [], current, onPick, label, note, stage, menuRef }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const close = useCallback(() => setOpen(false), []);
    useOutsideClick(ref, close, open);
    /* a panel note ("Change status" link) can open the menu from outside the footer */
    useImperativeHandle(menuRef, () => ({ open: () => { setOpen(true); ref.current?.querySelector("button")?.focus(); } }), []);
    return (
        <div className="g1-menu-wrap" ref={ ref }>
            { /* prototype menuHTML: a plain g1-btn with the chevron — Send Template beside it is the same weight */ }
            <button type="button" className="g1-btn" aria-haspopup="menu" aria-expanded={ open } onClick={ () => setOpen((v) => !v) }>{ label || translation("key_change_status") }<Icon name="chev_down" size={ 10 } strokeWidth={ 1.8 } /></button>
            { open && (
                <div className="g1-menu" role="menu">
                    { options.map((o) => {
                        const tok = stageToken(stage, o.id, o.name);
                        const isCurrent = isCurrentStatusOption(o, current);
                        const disabled = o.enable === false || o.enable === 0;
                        const hint = disabled ? blockedByHint(o.blocked_by) : "";
                        return (
                            <button key={ String(o.id) } type="button" role="menuitemradio" className="g1-menu-item" aria-checked={ isCurrent } aria-disabled={ disabled ? "true" : undefined } disabled={ disabled }
                                title={ hint || undefined } data-blocked-by={ hint ? o.blocked_by.join(",") : undefined }
                                onClick={ () => { if (!disabled && !isCurrent) { onPick(o.id, o.name, o.enable); } close(); } }>
                                {/* U-0443: one label for the shared Medical status ("Coupon Shared" stays a date label only) */}
                                <span className={ `dot ${ tok.tone }` } /><span className="g1-menu-item-text">{ statusDisplayName(o.name) }</span>
                                { isCurrent && <Icon name="check" size={ 11 } strokeWidth={ 2 } className="g1-menu-check" /> }
                            </button>
                        );
                    }) }
                    { options.map((o) => ((o.enable === false || o.enable === 0) ? <BlockedNote key={ `gate-${ String(o.id) }` } name={ o.name } blockedBy={ o.blocked_by } /> : null)) }
                    { /* the API offered no transition from the current status (e.g. Pre-Departure Medical before the worker answers): say so instead of an empty box */ }
                    { options.length === 0 && !note && <div className="g1-menu-note" role="note">{ translation("key_no_options") }</div> }
                    { note && <div className="g1-menu-note">{ note }</div> }
                </div>
            ) }
        </div>
    );
};
StatusMenu.propTypes = { options: PropTypes.array, current: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), onPick: PropTypes.func.isRequired, label: PropTypes.node, note: PropTypes.node, stage: PropTypes.string, menuRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]) };

/* backend 281: the sub-stage is Not Required — values stay, the form is read-only; the link opens the footer status menu */
export const NotRequiredNote = ({ onChangeStatus }) => (
    <div className="g1-note g1-locknote" role="status" data-sub-stage-locked="">
        { translation("key_cr_sub_stage_not_required_hint") }
        { onChangeStatus && <> <button type="button" className="g1-link" onClick={ onChangeStatus }>{ translation("key_change_status") }</button></> }
    </div>
);
NotRequiredNote.propTypes = { onChangeStatus: PropTypes.func };

export const StageFooter = ({ onSendTemplate, canSendTemplate, statusOptions, current, onChangeStatus, canChangeStatus, menuLabel, note, stage, menuRef, children }) => (
    <div className="g1-foot">
        { children }
        { canSendTemplate && <button type="button" className="g1-btn" onClick={ onSendTemplate }>{ translation("key_send_template") }</button> }
        { canChangeStatus && <StatusMenu options={ statusOptions } current={ current } onPick={ onChangeStatus } label={ menuLabel } note={ note } stage={ stage } menuRef={ menuRef } /> }
    </div>
);
StageFooter.propTypes = { menuRef: PropTypes.oneOfType([PropTypes.func, PropTypes.object]), onSendTemplate: PropTypes.func, canSendTemplate: PropTypes.bool, statusOptions: PropTypes.array, current: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), onChangeStatus: PropTypes.func, canChangeStatus: PropTypes.bool, menuLabel: PropTypes.node, note: PropTypes.node, stage: PropTypes.string, children: PropTypes.node };

/* the edit-mode footer of a panel (prototype editFoot): Cancel · Save changes */
export const EditFooter = ({ onCancel, onSave, saving }) => (
    <div className="g1-editfoot">
        <button type="button" className="g1-btn tall" onClick={ onCancel } disabled={ saving }>{ translation("key_cancel") }</button>
        <button type="button" className="g1-btn primary tall" onClick={ onSave } disabled={ saving }>{ saving ? `${ translation("key_loading") }…` : translation("key_save_changes") }</button>
    </div>
);
EditFooter.propTypes = { onCancel: PropTypes.func.isRequired, onSave: PropTypes.func.isRequired, saving: PropTypes.bool };

/* ---- sub-stage pill tablist (prototype depSubTabs / visaSubTabs / pdSubTabs): dot tone per sub-stage status ---- */
export const SubTabs = ({ tabs, active, onSelect, ariaLabel }) => (
    <div role="tablist" aria-label={ ariaLabel } className="g1-subtabs">
        { tabs.map((t) => (
            <button key={ t.key } type="button" role="tab" id={ `subtab-${ t.key }` } aria-selected={ active === t.key } tabIndex={ active === t.key ? 0 : -1 } disabled={ t.locked } title={ t.title }
                className="g1-subtab" data-fid={ `sub-${ t.key }` } onClick={ () => { if (!t.locked) onSelect(t.key); } }>
                <span className={ `dot ${ t.locked ? "locked" : (t.tone || "gray") }` } aria-hidden="true" />{ t.label }{ t.locked && <Icon name="lock" size={ 11 } strokeWidth={ 1.6 } /> }
            </button>
        )) }
    </div>
);
SubTabs.propTypes = { tabs: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string.isRequired, label: PropTypes.node.isRequired, tone: PropTypes.string, locked: PropTypes.bool, title: PropTypes.string })).isRequired, active: PropTypes.string, onSelect: PropTypes.func.isRequired, ariaLabel: PropTypes.string };

/* ---- the one uploaded-file component (prototype fileTile): thumb · name · "Uploaded by … · date" · download / upload again / remove,
   or the dashed empty tile with Upload ---- */
export const FileTile = ({ file, emptyLabel, accept, busy, canUpload, canManage, onFile, onDownload, onRemove, onPreview }) => {
    const inputRef = useRef(null);
    const pick = () => inputRef.current?.click();
    const onChange = (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f && onFile) onFile(f); };
    const input = <input ref={ inputRef } type="file" accept={ accept } className="g1-file-input" aria-hidden="true" tabIndex={ -1 } onChange={ onChange } />;
    if (busy) return <div className="g1-ftile"><div className="g1-fthumb" aria-hidden="true" /><div className="g1-fbody"><CircularSpinner paddingClass="p-0" /></div></div>;
    if (!file) {
        return (
            <div className="g1-ftile empty">
                <div className="g1-fthumb" aria-hidden="true" />
                <div className="g1-fbody"><div className="g1-fname muted">{ emptyLabel || translation("key_cr_no_file_uploaded") }</div></div>
                { canUpload && <button type="button" className="g1-btn primary sm" onClick={ pick }><Icon name="upload" size={ 11 } strokeWidth={ 1.8 } />{ translation("key_upload") }</button> }
                { input }
            </div>
        );
    }
    const thumb = file.url && file.isImage ? <img src={ file.url } alt="" /> : null;
    return (
        <div className="g1-ftile">
            { onPreview ? <button type="button" className="g1-fthumb" aria-label={ `${ translation("key_preview") } ${ file.name }` } onClick={ onPreview }>{ thumb }</button> : <div className="g1-fthumb" aria-hidden="true">{ thumb }</div> }
            <div className="g1-fbody">
                <div className="g1-fname">{ file.name }</div>
                { (file.by || file.at) && <div className="g1-fmeta">{ file.by ? `${ translation("key_wkr_photo_uploaded_by") } ${ file.by }` : "" }{ file.by && file.at ? " · " : "" }{ file.at || "" }</div> }
            </div>
            { onDownload && <button type="button" className="g1-ficon" aria-label={ translation("key_download") } onClick={ onDownload }><Icon name="download" size={ 14 } strokeWidth={ 1.5 } /></button> }
            { canManage && onFile && <button type="button" className="g1-ficon" aria-label={ translation("key_upload_again") } onClick={ pick }><Icon name="upload" size={ 14 } strokeWidth={ 1.5 } /></button> }
            { canManage && onRemove && <button type="button" className="g1-ficon danger" aria-label={ translation("key_remove") } onClick={ onRemove }><Icon name="trash" size={ 14 } strokeWidth={ 1.5 } /></button> }
            { input }
        </div>
    );
};
FileTile.propTypes = { file: PropTypes.shape({ name: PropTypes.string, url: PropTypes.string, isImage: PropTypes.bool, by: PropTypes.string, at: PropTypes.string }), emptyLabel: PropTypes.node, accept: PropTypes.string, busy: PropTypes.bool, canUpload: PropTypes.bool, canManage: PropTypes.bool, onFile: PropTypes.func, onDownload: PropTypes.func, onRemove: PropTypes.func, onPreview: PropTypes.func };

/* ---- content-width field grid (prototype formGrid): the column template is a named layout in stage-panels.css ---- */
export const FormGrid = ({ layout, children }) => <div className="g1-form" data-form={ layout }>{ children }</div>;
FormGrid.propTypes = { layout: PropTypes.string.isRequired, children: PropTypes.node };
export const Fld = ({ id, label, error, cap, children }) => (
    <div className="g1-f">{ label && <label htmlFor={ id }>{ label }</label> }{ children }{ cap && <div className="cap">{ cap }</div> }{ error && <div className="err">{ error }</div> }</div>
);
Fld.propTypes = { id: PropTypes.string, label: PropTypes.node, error: PropTypes.node, cap: PropTypes.node, children: PropTypes.node };

export const YesNo = ({ value, onChange, disabled, ariaLabelledBy, yes = "Yes", no = "No" }) => (
    <div className="g1-yesno" role="group" aria-labelledby={ ariaLabelledBy }>
        <button type="button" aria-pressed={ value === yes } disabled={ disabled } onClick={ () => onChange(yes) }>{ translation("key_yes") }</button>
        <button type="button" aria-pressed={ value === no } disabled={ disabled } onClick={ () => onChange(no) }>{ translation("key_no") }</button>
    </div>
);
YesNo.propTypes = { value: PropTypes.string, onChange: PropTypes.func.isRequired, disabled: PropTypes.bool, ariaLabelledBy: PropTypes.string, yes: PropTypes.string, no: PropTypes.string };

/* a labelled checkbox line outside a listing (Pick Up reminders) */
export const CheckLine = ({ id, checked, onChange, disabled, label }) => (
    <div className="g1-checkline">
        <button type="button" id={ id } role="checkbox" className="g1-check" aria-checked={ Boolean(checked) } aria-disabled={ disabled ? "true" : undefined } disabled={ disabled } onClick={ () => onChange(!checked) }>
            { checked && <Icon name="check" size={ 11 } strokeWidth={ 2.2 } /> }
        </button>
        <label htmlFor={ id }>{ label }</label>
    </div>
);
CheckLine.propTypes = { id: PropTypes.string.isRequired, checked: PropTypes.bool, onChange: PropTypes.func.isRequired, disabled: PropTypes.bool, label: PropTypes.node.isRequired };

export const PortalButton = () => (
    <a className="g1-btn" href="https://www.immd.gov.hk/eng/index.html" target="_blank" rel="noopener noreferrer"><Icon name="external" size={ 12 } strokeWidth={ 1.6 } />{ translation("key_open_immigration_portal") }</a>
);

/* ---- Pre-Departure: the worker-app question on one line with its Yes / Not Yet answer (prototype pdActionRow) ---- */
export const PdAction = ({ question, done }) => (
    <div className="g2-action" role="status" aria-label={ `${ question } — ${ translation(done ? "key_yes" : "key_not_yet") }` }>
        <span className={ `g2-act-icon${ done ? " done" : "" }` } aria-hidden="true">{ done && <Icon name="check" size={ 12 } strokeWidth={ 2.2 } /> }</span>
        <span className="g2-act-q">{ question }</span>
        <span className={ `g1-tag ${ done ? "green" : "gray" }` }><span className="dot" aria-hidden="true" />{ translation(done ? "key_yes" : "key_not_yet") }</span>
    </div>
);
PdAction.propTypes = { question: PropTypes.node.isRequired, done: PropTypes.bool };
