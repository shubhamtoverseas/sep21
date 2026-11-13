import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import mammoth from 'mammoth';
import translation from "../../utils/translation";

/**
 * A modal component for previewing files such as images, PDFs, and DOC files.
 *
 * @component
 * @param {Object} props - The props for the component.
 * @param {string} props.filePath - The file path of the file to preview. Supports image formats (jpg, jpeg, png, gif), PDF files, and DOC files.
 * @param {Function} props.onClose - Callback function to handle the closing of the modal.
 *
 * @returns {JSX.Element} The rendered modal component.
 *
 * @example
 * <FilePreviewModal
 *   filePath="/path/to/file.jpg"
 *   onClose={() => console.log('Modal closed')}
 * />
 */
function FilePreviewModal({ filePath, onClose }) {
    const [docContent, setDocContent] = useState(null);
    const isImage = /\.(jpg|jpeg|png|gif)$/i.test(filePath);
    const isPDF = /\.pdf$/i.test(filePath);
    const isDoc = /\.(doc|docx)$/i.test(filePath);

    useEffect(() => {
        if (isDoc) {
            fetch(filePath)
                .then(response => response.arrayBuffer())
                .then(buffer => mammoth.extractRawText({ arrayBuffer: buffer }))
                .then(result => setDocContent(result.value))
                .catch(error => console.error("Error reading DOC file:", error));
        }
    }, [filePath, isDoc]);

    return (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0, 0, 0, 0.7)' }} role="dialog">
            <div className="modal-dialog" style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
                <div className="modal-content" style={{ border: '4px solid #ccc', borderRadius: '8px' }}>
                    <div className="modal-body" style={{ overflow: 'auto', maxHeight: '80vh' }}>
                        {isImage && <img src={filePath} style={{ maxWidth: '100%', maxHeight: '100%' }} alt="Preview" />}
                        {isPDF && (
                            <iframe
                                src={filePath}
                                style={{ width: '100%', height: '80vh', border: 'none' }}
                                title={ translation('key_pdf_preview') }
                            ></iframe>
                        )}
                        {isDoc && docContent && <div style={{ whiteSpace: 'pre-wrap' }}>{docContent}</div>}
                        {isDoc && !docContent && <p>{ translation('key_loading_doc_file') }...</p>}
                        {!isImage && !isPDF && !isDoc && <p>{ translation('key_unsupported_file_format') }</p>}
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-outline" onClick={onClose}>{ translation('key_close') }</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

FilePreviewModal.propTypes = {
    filePath: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default FilePreviewModal;
