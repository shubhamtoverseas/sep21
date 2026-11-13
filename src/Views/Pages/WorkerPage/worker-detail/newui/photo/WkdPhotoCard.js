import React, { useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import WkdStatusChip from "../WkdStatusChip";
import translation from "../../../../../../utils/translation";
import { DOC_STATUS_META, WKD_PHOTO_COPY, WKD_PHOTO_DATE_FORMAT } from "../../../workerModuleConstants";
import { actorSource, cropLabel, dimsLabel, formatBytes, headshotVars, ringVars, withSource } from "./photoModel";

const EM = '—';
const when = (v) => (v && dayjs(v).isValid() ? dayjs(v).format(WKD_PHOTO_DATE_FORMAT) : null);

export const VisTag = ({ on }) => <span className={ `wkd-pv-vis${ on ? ' on' : '' }` }>{ on ? WKD_PHOTO_COPY.employerVisible : WKD_PHOTO_COPY.notEmployerVisible }</span>;
VisTag.propTypes = { on: PropTypes.bool };

const MetaRow = ({ label, value, sourced = true }) => (
    <div className="wkd-pv-row">
        <span className="l">{ label }</span>
        { value
            ? <span className="v" title={ typeof value === 'string' ? value : undefined }>{ value }</span>
            : <span className="v mc-unavailable" data-mc-honest={ sourced ? undefined : 'deferred' } title={ sourced ? undefined : WKD_PHOTO_COPY.notSourced }>{ EM }</span> }
    </div>
);
MetaRow.propTypes = { label: PropTypes.node, value: PropTypes.node, sourced: PropTypes.bool };

export const FullPhoto = ({ rec, onOpen, actionable, onNatural }) => {
    const [aspect, setAspect] = useState(null);
    const onLoad = (e) => {
        const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
        setAspect(h / w);
        if (onNatural) onNatural({ url: rec.original, w, h });
    };
    const inner = (
        <>
            <img src={ rec.original } alt="" onLoad={ onLoad } />
            { rec.crop && <span className="wkd-ph-ring" style={ ringVars(rec.crop) } aria-hidden="true" /> }
        </>
    );
    return actionable
        ? <button type="button" className="wkd-ph-full" aria-label={ `${ WKD_PHOTO_COPY.openFull } (${ rec.fileName || 'photo' })` } onClick={ () => onOpen(rec) } data-ph-aspect={ aspect || undefined }>{ inner }</button>
        : <div className="wkd-ph-full">{ inner }</div>;
};
FullPhoto.propTypes = { rec: PropTypes.object.isRequired, onOpen: PropTypes.func, actionable: PropTypes.bool, onNatural: PropTypes.func };

export const Headshot = ({ rec, aspect, onOpen, actionable, size }) => {
    const vars = rec.crop && aspect ? { '--ph-img': `url("${ rec.original }")`, ...headshotVars(rec.crop, aspect) } : null;
    const className = `wkd-ph-headshot${ size === 'sm' ? ' sm' : '' }`;
    if (!vars && !rec.headshot) return <div className={ `${ className } none` }>{ WKD_PHOTO_COPY.cropNotSet }</div>;
    const body = vars ? null : <img src={ rec.headshot } alt="" />;
    return actionable
        ? <button type="button" className={ className } style={ vars || undefined } aria-label={ `${ WKD_PHOTO_COPY.openFromHeadshot } (${ rec.fileName || 'photo' })` } onClick={ () => onOpen(rec) }>{ body }</button>
        : <div className={ className } style={ vars || undefined } aria-hidden="true">{ body }</div>;
};
Headshot.propTypes = { rec: PropTypes.object.isRequired, aspect: PropTypes.number, onOpen: PropTypes.func, actionable: PropTypes.bool, size: PropTypes.string };

const WkdPhotoCard = ({ rec, heading, pending, status, published, actionable, canCrop, onOpen, onCrop, withCurrent, showMeta = true }) => {
    const [nat, setNat] = useState(null);
    const aspect = nat && nat.url === rec.original ? nat.h / nat.w : null;
    const meta = pending ? DOC_STATUS_META[status] || DOC_STATUS_META.in_review : DOC_STATUS_META.verified;
    return (
        <div className={ `wkd-ph-card${ pending ? ' pending' : '' }` } data-mc-photo-card={ pending ? 'pending' : 'current' }>
            <div className="wkd-ph-card-head">
                <span className="t">{ heading }</span>
                <WkdStatusChip label={ translation(meta.key) } tone={ meta.tone } />
                <VisTag on={ published } />
            </div>
            <div className="wkd-ph-card-grid">
                <div>
                    <FullPhoto rec={ rec } onOpen={ onOpen } actionable={ actionable } onNatural={ setNat } />
                </div>
                <div className="wkd-ph-side">
                    <Headshot rec={ rec } aspect={ aspect } onOpen={ onOpen } actionable={ actionable } />
                    <div className="wkd-ph-cap">{ WKD_PHOTO_COPY.headshot }<br /><span className="mono">{ cropLabel(rec.crop) || WKD_PHOTO_COPY.cropNotSet }</span></div>
                </div>
            </div>
            { showMeta && (
                <div className="wkd-ph-meta">
                    { published && <MetaRow label={ WKD_PHOTO_COPY.approvedOn } value={ when(rec.approvedAt) } sourced={ Boolean(rec.approvedAt) } /> }
                    { published && <MetaRow label={ WKD_PHOTO_COPY.approvedBy } value={ withSource(rec.approvedBy, WKD_PHOTO_COPY.sourceStaff) } sourced={ Boolean(rec.approvedBy) } /> }
                    <MetaRow label={ pending ? WKD_PHOTO_COPY.submittedOn : WKD_PHOTO_COPY.uploadedOn } value={ when(rec.uploadedAt) } sourced={ Boolean(rec.uploadedAt) } />
                    <MetaRow label={ pending ? WKD_PHOTO_COPY.submittedBy : WKD_PHOTO_COPY.uploadedBy } value={ withSource(rec.uploadedBy, actorSource(rec.uploadedByRole)) } sourced={ Boolean(rec.uploadedBy) } />
                    <MetaRow label={ WKD_PHOTO_COPY.file } value={ [rec.fileName || EM, aspect ? dimsLabel(nat) : null, formatBytes(rec.fileSize) || null].filter(Boolean).join(' · ') } />
                </div>
            ) }
            { pending && canCrop && (
                <div className="wkd-ph-card-actions">
                    <button type="button" className="g2-button" onClick={ () => onCrop(rec) }>
                        { rec.crop || rec.headshot ? (withCurrent ? WKD_PHOTO_COPY.adjustReplacementCrop : WKD_PHOTO_COPY.adjustCrop) : WKD_PHOTO_COPY.setCrop }
                    </button>
                </div>
            ) }
            { pending && canCrop && !rec.crop && !rec.headshot && (
                <div className="wkd-ph-warn" data-mc-photo-verify-blocked="no-crop">{ WKD_PHOTO_COPY.noCropWarn }</div>
            ) }
        </div>
    );
};

WkdPhotoCard.propTypes = {
    rec: PropTypes.object.isRequired,
    heading: PropTypes.string.isRequired,
    pending: PropTypes.bool,
    status: PropTypes.string,
    published: PropTypes.bool,
    actionable: PropTypes.bool,
    canCrop: PropTypes.bool,
    onOpen: PropTypes.func.isRequired,
    onCrop: PropTypes.func,
    withCurrent: PropTypes.bool,
    showMeta: PropTypes.bool,
};

export default WkdPhotoCard;
