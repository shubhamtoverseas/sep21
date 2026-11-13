import React from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import translation from "../../../../../../utils/translation";

const fileNameFromUrl = (url) => {
    try { return decodeURIComponent(new URL(url).pathname.split('/').pop()); } catch (e) { return url; }
};

const DownloadGlyph = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#667080" strokeWidth="1.5" aria-hidden="true"><path d="M8 10V2.5M4.5 6.5 8 10l3.5-3.5M3 13h10" /></svg>
);

const WkdDetFileCard = ({ url, name, uploadedAt, onDownload, onDelete }) => {
    const shownName = name || fileNameFromUrl(url);
    const when = uploadedAt && dayjs(uploadedAt).isValid() ? dayjs(uploadedAt).format('DD MMM YYYY') : '';
    return (
        <div className="wkd-det-filecard">
            <span className="thumb" aria-hidden="true" />
            <span className="body">
                <span className="nm">{ shownName }</span>
                { when && <span className="meta">{ translation('key_uploaded') } { when }</span> }
            </span>
            { onDownload ? (
                <button type="button" className="wkd-det-iconbtn" onClick={ onDownload } aria-label={ translation('key_download') } title={ translation('key_download') }>
                    <DownloadGlyph />
                </button>
            ) : (
                <a className="wkd-det-iconbtn" href={ url } target="_blank" rel="noreferrer" download aria-label={ translation('key_download') } title={ translation('key_download') }>
                    <DownloadGlyph />
                </a>
            ) }
            { onDelete && (
                <button type="button" className="wkd-det-iconbtn danger" onClick={ onDelete } aria-label={ translation('key_delete') } title={ translation('key_delete') }>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#b42318" strokeWidth="1.5" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M4.5 4.5 5 13.2a1 1 0 0 0 1 .8h4a1 1 0 0 0 1-.8l.5-8.7" /></svg>
                </button>
            ) }
        </div>
    );
};

WkdDetFileCard.propTypes = {
    url: PropTypes.string,
    name: PropTypes.string,
    uploadedAt: PropTypes.string,
    onDownload: PropTypes.func,
    onDelete: PropTypes.func,
};

export const WkdDetFileAwaiting = () => (
    <div className="wkd-det-awaiting">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#b45309" strokeWidth="1.5" aria-hidden="true"><path d="M8 2.6 14 13.2H2z" /><path d="M8 6.8v2.7M8 11.5v.4" /></svg>
        <span>{ translation('key_wkr_awaiting_upload') }</span>
    </div>
);

export default React.memo(WkdDetFileCard);
