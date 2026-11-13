import React from "react";
import PropTypes from "prop-types";
import ImageZoomViewer from "../../../../../../components/img-zoom-viewer/ImageZoomViewer";
import WkdDetFileCard from "../details/WkdDetFileCard";
import zoomOutIcon from "../../../../../../assets/img/svg/zoom_out.svg";
import zoomInIcon from "../../../../../../assets/img/svg/zoom_in.svg";
import handDragIcon from "../../../../../../assets/img/svg/hand-drag.svg";
import rotateIcon from "../../../../../../assets/img/svg/rotate-icon.svg";
import translation from "../../../../../../utils/translation";
import { DOC_PREVIEW_DOWNLOAD_ONLY } from "../../../workerModuleConstants";

const extensionOf = (url) => String(url || '').split('.').pop().split('?')[0].toLowerCase();

/* the preview pane (prototype docsHTML review card, left column): the scan with zoom / rotate tools;
   a PDF is framed in place; a Word file can only be downloaded */
const WkdDocPreview = ({ url, label }) => {
    const ext = extensionOf(url);
    return (
        <div className="wkd-docrv-preview" data-mc-doc-preview={ ext || 'image' }>
            { ext === 'pdf' ? (
                <iframe className="wkd-docrv-pdf" src={ url } title={ translation('key_pdf_preview') } />
            ) : DOC_PREVIEW_DOWNLOAD_ONLY.includes(ext) ? (
                <div className="wkd-docrv-file"><WkdDetFileCard url={ url } /></div>
            ) : (
                <ImageZoomViewer imageSrc={ url } altText={ label } zoomOutIcon={ zoomOutIcon } zoomInIcon={ zoomInIcon } handDragIcon={ handDragIcon } rotateIcon={ rotateIcon } />
            ) }
        </div>
    );
};

WkdDocPreview.propTypes = {
    url: PropTypes.string.isRequired,
    label: PropTypes.string,
};

export default React.memo(WkdDocPreview);
