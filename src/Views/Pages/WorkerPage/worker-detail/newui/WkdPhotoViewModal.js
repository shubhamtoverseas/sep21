import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import useDialogFocus from "../../../../../hooks/useDialogFocus";
import translation from "../../../../../utils/translation";

const fileNameOf = (url) => {
    try { return decodeURIComponent(String(url).split('?')[0].split('/').pop() || ''); } catch { return ''; }
};
const fmtBytes = (n) => {
    if (!n && n !== 0) return '';
    const mb = Number(n) / (1024 * 1024);
    return mb >= 1 ? `${ mb.toFixed(1) } MB` : `${ Math.round(Number(n) / 1024) } KB`;
};

const WkdPhotoViewModal = ({ photo, published, onClose }) => {
    const [dims, setDims] = useState('');
    const cardRef = useRef(null);
    useDialogFocus(cardRef, onClose);

    const src = photo?.url || '';
    const file = photo?.file_name || fileNameOf(src) || '—';
    const size = fmtBytes(photo?.file_size);
    const crop = photo?.crop && photo.crop.cx != null
        ? `${ photo.crop.cx }%, ${ photo.crop.cy }% · r ${ photo.crop.r }%`
        : '—';
    const stamp = photo?.approved_at ? dayjs(photo.approved_at).format('DD MMM YYYY HH:mm') : '—';

    /* portalled to body: the record pages stack their sticky table headers above an in-tree fixed backdrop */
    return createPortal(
        <div className="wkd-pv-backdrop" role="presentation" onClick={ (e) => { if (e.target === e.currentTarget) onClose(); } }>
            <div ref={ cardRef } className="wkd-pv-card" role="dialog" aria-modal="true" aria-labelledby="wkd-pv-heading">
                <div className="wkd-pv-head">
                    <h2 id="wkd-pv-heading">{ published ? translation('key_wkr_current_approved_photo') : translation('key_wkr_pending_replacement') }</h2>
                    <span className={ `wkd-pv-vis${ published ? ' on' : '' }` }>{ published ? translation('key_wkr_photo_employer_visible') : translation('key_wkr_photo_not_employer_visible') }</span>
                    <span className="grow" />
                    <button type="button" className="wkd-pv-close" aria-label={ translation('key_close') } onClick={ onClose }>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                    </button>
                </div>
                <div className="wkd-pv-body">
                    <div className="wkd-pv-image">
                        { src ? (
                            <img src={ src } alt="" onLoad={ (e) => setDims(`${ e.currentTarget.naturalWidth } x ${ e.currentTarget.naturalHeight }`) } />
                        ) : <span className="wkd-pv-empty">—</span> }
                    </div>
                    <div className="wkd-pv-meta">
                        <div className="wkd-pv-row"><span className="l">{ translation('key_wkr_photo_file') }</span><span className="v" title={ file }>{ [file, dims, size].filter(Boolean).join(' · ') }</span></div>
                        <div className="wkd-pv-row"><span className="l">{ translation('key_wkr_headshot_crop') }</span><span className="v mono">{ crop }</span></div>
                        <div className="wkd-pv-row"><span className="l">{ published ? translation('key_wkr_photo_approved_on') : translation('key_wkr_photo_submitted_on') }</span><span className="v">{ stamp }</span></div>
                    </div>
                    { !published && (
                        <div className="wkd-pv-note">{ translation('key_wkr_opened_for_admin_review_this_replacement_is') }</div>
                    ) }
                </div>
            </div>
        </div>,
        document.body
    );
};

WkdPhotoViewModal.propTypes = {
    photo: PropTypes.shape({
        url: PropTypes.string,
        file_name: PropTypes.string,
        file_size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        crop: PropTypes.object,
        approved_at: PropTypes.string,
    }),
    published: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
};

WkdPhotoViewModal.defaultProps = { published: true };

export default WkdPhotoViewModal;
