import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Cropper from "react-easy-crop";
import useDialogFocus from "../../../../../../hooks/useDialogFocus";
import translation from "../../../../../../utils/translation";
import { WKD_PHOTO_COPY, WKD_PHOTO_CROP_RADIUS, WKD_PHOTO_DEFAULT_CROP } from "../../../workerModuleConstants";
import { areaFromCrop, cropFromArea, headshotVars } from "./photoModel";
import { imageSizeOf } from "./cropImage";

const WkdPhotoCropModal = ({ src, fileName, crop, setBy, title, onApply, onClose }) => {
    const cardRef = useRef(null);
    useDialogFocus(cardRef, onClose);
    const [size, setSize] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [live, setLive] = useState(crop || WKD_PHOTO_DEFAULT_CROP);
    const [resetKey, setResetKey] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        let alive = true;
        imageSizeOf(src).then((s) => { if (alive) setSize(s); }).catch(() => { if (alive) setSize({ width: 3, height: 4 }); });
        return () => { alive = false; };
    }, [src]);

    const aspect = size ? size.height / size.width : null;
    const initialArea = aspect ? areaFromCrop(crop || WKD_PHOTO_DEFAULT_CROP, aspect) : undefined;

    const onCropComplete = useCallback((area) => { setLive(cropFromArea(area)); }, []);
    const reset = useCallback(() => { setZoom(1); setPosition({ x: 0, y: 0 }); setLive(crop || WKD_PHOTO_DEFAULT_CROP); setResetKey((k) => k + 1); }, [crop]);

    const radiusPct = Math.round(((live.r - WKD_PHOTO_CROP_RADIUS.min) / (WKD_PHOTO_CROP_RADIUS.max - WKD_PHOTO_CROP_RADIUS.min)) * 100);

    return (
        <div className="wkd-pv-backdrop wkd-ph-crop-backdrop" role="presentation" onClick={ (e) => { if (e.target === e.currentTarget) onClose(); } }>
            <div ref={ cardRef } className="wkd-ph-crop" role="dialog" aria-modal="true" aria-labelledby="wkd-ph-crop-heading">
                <div className="wkd-ph-crop-head">
                    <h2 id="wkd-ph-crop-heading">{ title }</h2>
                    { fileName && <span className="wkd-ph-crop-file mono">{ fileName }</span> }
                    <span className="grow" />
                    <button type="button" className="wkd-pv-close" aria-label={ WKD_PHOTO_COPY.closeCrop } onClick={ onClose }>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                    </button>
                </div>
                <div className="wkd-ph-crop-body">
                    <div className="wkd-ph-crop-stage-wrap">
                        <div className="wkd-ph-crop-stage" role="application" aria-label={ WKD_PHOTO_COPY.adjustCrop }>
                            { aspect && (
                                <Cropper
                                    key={ resetKey }
                                    image={ src }
                                    crop={ position }
                                    zoom={ zoom }
                                    minZoom={ 1 }
                                    maxZoom={ 4 }
                                    aspect={ 1 }
                                    cropShape="round"
                                    showGrid={ false }
                                    restrictPosition
                                    initialCroppedAreaPercentages={ initialArea }
                                    onCropChange={ setPosition }
                                    onZoomChange={ setZoom }
                                    onCropComplete={ onCropComplete }
                                />
                            ) }
                        </div>
                        <label className="wkd-ph-crop-zoom">
                            <span className="l">{ WKD_PHOTO_COPY.zoom }</span>
                            <input type="range" min={ 1 } max={ 4 } step={ 0.05 } value={ zoom } aria-label={ WKD_PHOTO_COPY.zoom } onChange={ (e) => setZoom(Number(e.target.value)) } />
                            <span className="mono v" aria-live="polite">r { live.r }%</span>
                        </label>
                    </div>
                    <div className="wkd-ph-crop-side">
                        <div className="l">{ WKD_PHOTO_COPY.headshotPreview }</div>
                        <div className="wkd-ph-headshot preview" style={ { '--ph-img': `url("${ src }")`, ...(headshotVars(live, aspect) || {}) } } aria-hidden="true" />
                        <div className="wkd-ph-meta">
                            <div className="wkd-pv-row"><span className="l">{ WKD_PHOTO_COPY.centre }</span><span className="v mono">{ live.cx }%, { live.cy }%</span></div>
                            <div className="wkd-pv-row"><span className="l">{ WKD_PHOTO_COPY.radius }</span><span className="v mono">{ live.r }% <span className="wkd-ph-dim">({ radiusPct }%)</span></span></div>
                            <div className="wkd-pv-row"><span className="l">{ WKD_PHOTO_COPY.setBy }</span><span className="v">{ setBy || '—' }</span></div>
                        </div>
                        <div className="wkd-ph-note">{ WKD_PHOTO_COPY.keepsOriginal }</div>
                        <button type="button" className="bio-btn" onClick={ reset }>{ WKD_PHOTO_COPY.resetCrop }</button>
                    </div>
                </div>
                <div className="wkd-ph-crop-foot">
                    <button type="button" className="g2-button" onClick={ onClose }>{ translation('key_cancel') }</button>
                    <button type="button" className="g2-button primary" disabled={ !aspect } onClick={ () => onApply(live) }>{ WKD_PHOTO_COPY.applyCrop }</button>
                </div>
            </div>
        </div>
    );
};

WkdPhotoCropModal.propTypes = {
    src: PropTypes.string.isRequired,
    fileName: PropTypes.string,
    crop: PropTypes.object,
    setBy: PropTypes.string,
    title: PropTypes.string.isRequired,
    onApply: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default WkdPhotoCropModal;
