import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import mammoth from "mammoth";
import GcIcon from "./gcIcons";
import translation from "../../../../utils/translation";

function GcFilePreview({ filePath, onClose }) {
    const [docContent, setDocContent] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(filePath);
    const isPDF = /\.pdf$/i.test(filePath);
    const isDoc = /\.(doc|docx)$/i.test(filePath);

    useEffect(() => {
        if (isDoc) {
            fetch(filePath)
                .then((response) => response.arrayBuffer())
                .then((buffer) => mammoth.extractRawText({ arrayBuffer: buffer }))
                .then((result) => setDocContent(result.value))
                .catch((error) => console.error("Error reading DOC file:", error));
        }
    }, [filePath, isDoc]);

    /* PDFs are stored with a download disposition — loading the URL directly
     * in an iframe triggers a download instead of rendering. Fetch to a blob
     * and preview the object URL through the browser's PDF viewer instead. */
    useEffect(() => {
        if (!isPDF) return undefined;
        let objectUrl = null;
        let cancelled = false;
        fetch(filePath)
            .then((response) => response.blob())
            .then((blob) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
                setPdfUrl(objectUrl);
            })
            .catch((error) => console.error("Error loading PDF preview:", error));
        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [filePath, isPDF]);

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    const handleScrim = useCallback((e) => {
        if (e.target === e.currentTarget) onClose();
    }, [onClose]);

    /* portalled to body: the scoped chat lives inside record pages (Job Offer applicant rail, Worker / Employer
       details) whose sticky table headers and panels stack above an in-tree fixed scrim — the same reason
       WkdPhotoViewModal portals; the tokens the lightbox reads are :root tokens, so no .gcp wrapper is needed */
    return createPortal(
        <div className="gc-lightbox" onClick={ handleScrim } role="dialog" aria-modal="true">
            <button type="button" className="gc-lightbox-close" onClick={ onClose } aria-label={ translation('key_close') }>
                <GcIcon name="close" />
            </button>
            { isImage && <img className="gc-lightbox-img" src={ filePath } alt="" /> }
            { isPDF && (pdfUrl
                ? <iframe className="gc-lightbox-frame" src={ pdfUrl } title={ translation('key_pdf_preview') } />
                : <div className="gc-lightbox-doc">…</div>) }
            { isDoc && <div className="gc-lightbox-doc">{ docContent || "…" }</div> }
            { !isImage && !isPDF && !isDoc && <div className="gc-lightbox-doc">{ translation('key_unsupported_file_format') }</div> }
        </div>,
        document.body,
    );
}

GcFilePreview.propTypes = {
    filePath: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default GcFilePreview;
