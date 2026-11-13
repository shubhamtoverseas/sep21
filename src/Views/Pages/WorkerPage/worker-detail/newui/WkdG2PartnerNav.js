import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../../utils/translation";
import { timeSince } from "../../../../../services/commonService";

export const WkdG2LifecycleChip = ({ ready }) => (
    <span className={ `g2-status-tag g2-lifecycle${ ready ? ' ready' : '' }` }>
        <span className="g2-lifecycle-dot" />
        { ready ? translation('key_ready') : translation('key_ins_stage_not_ready') }
    </span>
);

WkdG2LifecycleChip.propTypes = { ready: PropTypes.bool };

export const WkdG2SectionTabs = ({ sections, active, onSelect }) => (
    <div className="g2-section-tabs" role="tablist">
        { sections.map((s) => (
            <button
                key={ s.key }
                type="button"
                role="tab"
                aria-selected={ active === s.key }
                className={ `g2-section-tab${ active === s.key ? ' is-active' : '' }` }
                onClick={ () => onSelect(s.key) }
            >
                { s.label }
            </button>
        )) }
    </div>
);

WkdG2SectionTabs.propTypes = {
    sections: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.node.isRequired,
    })).isRequired,
    active: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
};

export const WkdG2SectionHead = ({ title, ready, children }) => (
    <div className="g2-card-header g2-clean-header wkd-g2sec-head">
        <h2 className="g2-title">{ title }</h2>
        <WkdG2LifecycleChip ready={ ready } />
        <span className="wkd-g2-spacer" />
        { children }
    </div>
);

WkdG2SectionHead.propTypes = {
    title: PropTypes.node,
    ready: PropTypes.bool,
    children: PropTypes.node,
};

const downloadIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M8 10V2.5M4.5 6.5 8 10l3.5-3.5M3 13h10" />
    </svg>
);
const deleteIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M3 4.5h10M6.5 4.5v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M4.5 4.5 5 13.2a1 1 0 0 0 1 .8h4a1 1 0 0 0 1-.8l.5-8.7" />
    </svg>
);
const warnIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#b45309" strokeWidth="1.5" aria-hidden="true">
        <path d="M8 2.6 14 13.2H2z" /><path d="M8 6.8v2.7M8 11.5v.4" />
    </svg>
);

export const WkdG2FileCard = ({ name, meta, imageSrc, onDownload, onDelete, onUploadAgain }) => (
    <div className="wkd-g2-file">
        <span className="thumb">{ imageSrc ? <img src={ imageSrc } alt="" loading="lazy" /> : null }</span>
        <span className="info">
            <span className="nm d-block">{ name || '—' }</span>
            { meta ? <span className="meta d-block">{ meta }</span> : null }
        </span>
        <button type="button" className="ic" onClick={ onDownload } aria-label={ translation('key_download') } title={ translation('key_download') }>{ downloadIcon }</button>
        { onDelete && <button type="button" className="ic del" onClick={ onDelete } aria-label={ translation('key_delete') } title={ translation('key_delete') }>{ deleteIcon }</button> }
        { onUploadAgain && <button type="button" className="again" onClick={ onUploadAgain }>{ translation('key_upload_again') }</button> }
    </div>
);

WkdG2FileCard.propTypes = {
    name: PropTypes.string,
    meta: PropTypes.string,
    imageSrc: PropTypes.string,
    onDownload: PropTypes.func,
    onDelete: PropTypes.func,
    onUploadAgain: PropTypes.func,
};

export const WkdG2AwaitingUpload = () => (
    <div className="wkd-g2-await">{ warnIcon }<span>{ translation('key_wkr_awaiting_upload') }</span></div>
);

export const WkdG2UploadAudit = ({ logs }) => {
    const latest = Array.isArray(logs) ? logs[0] : null;
    if (!latest || (!latest.log_created_by && !latest.created_at)) return null;
    const ago = latest.created_at ? timeSince(latest.created_at) : '';
    return (
        <div className="g2-upload-audit">
            { translation('key_updated') }: { latest.log_created_by || '—' }{ ago ? ` · ${ ago }` : '' }
        </div>
    );
};

WkdG2UploadAudit.propTypes = { logs: PropTypes.any };
