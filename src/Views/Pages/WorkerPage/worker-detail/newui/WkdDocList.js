import React from "react";
import PropTypes from "prop-types";
import WkdStatusChip from "./WkdStatusChip";
import translation from "../../../../../utils/translation";
import { changeDynamicDateFormate } from "../../../../../utils/utils";
import { DOC_STATUS_META } from "../../workerModuleConstants";

const docIcon = (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#6e757f" strokeWidth="1.5" aria-hidden="true">
        <path d="M3.5 1.5h6.5l2.5 2.5V14.5h-9z" />
    </svg>
);

const docMeta = (doc, centralVerified) => {
    if (doc.notApplicable) return translation('key_not_applicable');
    /* W-27: a dependent sitting at Uploaded while the central document is not yet Verified is waiting for it */
    if (doc.dependent && doc.statusRaw === 'uploaded' && centralVerified === false) return translation('key_wkr_uploaded_waiting_central');
    if (doc.uploadedAt) return `${ translation('key_uploaded') } ${ changeDynamicDateFormate(doc.uploadedAt, "DD MMM YYYY") }`;
    if (doc.uploaded) return translation('key_uploaded');
    return translation('key_wkr_awaiting_upload');
};

const WkdDocList = ({ docs = [], activeKey, onSelect, overallStatusRaw, note, showCascadeNote = false, centralName, centralVerified }) => {
    /* §16.2: an unknown overall state reads as Incomplete, never as a review state */
    const overall = DOC_STATUS_META[overallStatusRaw] || DOC_STATUS_META.in_complete;
    const central = centralName || translation('key_passport');
    return (
        <div className="wkd-docws-list">
            <div className="wkd-docws-head">
                <span className="t">{ translation('key_doc_upload') }</span>
                <WkdStatusChip label={ translation(overall.key) } tone={ overall.tone } />
                { note && <span className="note">{ note }</span> }
            </div>
            <div className="wkd-docws-rows">
                { docs.map((doc) => {
                    const meta = doc.notApplicable ? DOC_STATUS_META.na : (DOC_STATUS_META[doc.statusRaw] || DOC_STATUS_META.in_complete);
                    const selected = doc.key === activeKey;
                    const off = doc.disabled && !doc.notApplicable;
                    const showView = doc.uploaded && !doc.notApplicable;
                    return (
                        <button
                            type="button"
                            key={ doc.key }
                            className={ `wkd-docws-row${ selected ? ' sel' : '' }${ off ? ' off' : '' }${ doc.notApplicable ? ' na' : '' }` }
                            onClick={ () => !doc.disabled && onSelect(doc.key) }
                            disabled={ doc.disabled }
                            aria-disabled={ doc.notApplicable ? true : undefined }
                        >
                            <span className="thumb">{ docIcon }</span>
                            <span className="who">
                                <span className="nm">
                                    { doc.label }
                                    { doc.central && <span className="central-badge">{ translation('key_central_doc_badge') }</span> }
                                </span>
                                <span className="type">
                                    { doc.type }
                                    { doc.dependent && <> · { translation('key_central_document') }: { central }</> }
                                    { doc.notApplicable && <> { translation('key_wkr_excluded_from_completion') }</> }
                                </span>
                            </span>
                            { doc.notApplicable
                                ? <span className="wkd-status-chip wkd-chip-na"><span className="wkd-chip-dot" />{ translation(meta.key) }</span>
                                : <WkdStatusChip label={ translation(meta.key) } tone={ meta.tone } /> }
                            <span className="meta">{ docMeta(doc, centralVerified) }</span>
                            <span className="view">{ showView ? translation('key_view') : '' }</span>
                        </button>
                    );
                }) }
            </div>
            { showCascadeNote && (
                <div className="wkd-docws-cascade">{ translation('key_docs_cascade_note') }</div>
            ) }
        </div>
    );
};

WkdDocList.propTypes = {
    docs: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.node,
        type: PropTypes.node,
        statusRaw: PropTypes.string,
        central: PropTypes.bool,
        dependent: PropTypes.bool,
        disabled: PropTypes.bool,
        notApplicable: PropTypes.bool,
        uploaded: PropTypes.bool,
        uploadedAt: PropTypes.string,
    })),
    activeKey: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
    overallStatusRaw: PropTypes.string,
    note: PropTypes.node,
    showCascadeNote: PropTypes.bool,
    centralName: PropTypes.node,
    centralVerified: PropTypes.bool,
};

export default React.memo(WkdDocList);
