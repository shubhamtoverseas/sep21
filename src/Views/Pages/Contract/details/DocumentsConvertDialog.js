import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import Icon from "../../../../components/Icon/Icon";
import translation from "../../../../utils/translation";
import { headingCase } from "../../../../utils/utils";
import { convertFilesToPdf } from "../../../../services/convertToPdf";
import { CR_DOC_CONVERT_STEP } from "../contractConstants";

/*
 * Documents upload — image files are converted to PDF first (U-0285: PDF / JPG / PNG, images → PDF). Two steps on the
 * kit Modal: the files about to be converted (Cancel · Next), then each converted PDF in turn (Previous · Discard ·
 * Approve, "Upload" on the last) — the accepted PDFs go back to the uploader; a discarded one is left out. Logic as the
 * former popup's: Previous un-decides the file it steps back to.
 */
const DocumentsConvertDialog = ({ files, onDone, onCancel }) => {
    const [step, setStep] = useState(CR_DOC_CONVERT_STEP.CONFIRM);
    const [converted, setConverted] = useState([]);
    const [index, setIndex] = useState(0);
    const [accepted, setAccepted] = useState([]);
    const [converting, setConverting] = useState(false);

    const convert = useCallback(async () => {
        setConverting(true);
        try {
            const out = await convertFilesToPdf(files);
            setConverted(out); setIndex(0); setStep(CR_DOC_CONVERT_STEP.PREVIEW);
        } catch {
            /* convertFilesToPdf has already shown the error toast; the list stays so the user can cancel or retry */
        } finally { setConverting(false); }
    }, [files]);

    const current = converted[index];
    const isLast = index === converted.length - 1;
    const previewUrl = useMemo(() => (current ? URL.createObjectURL(current) : null), [current]);
    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

    const finish = (list) => onDone(list);
    const accept = () => { const next = [...accepted, current]; setAccepted(next); if (isLast) finish(next); else setIndex((i) => i + 1); };
    const discard = () => { if (isLast) finish(accepted); else setIndex((i) => i + 1); };
    const previous = () => {
        if (index === 0) return;
        const back = converted[index - 1];
        setAccepted((list) => list.filter((f) => f.name !== back.name));
        setIndex((i) => i - 1);
    };

    if (step === CR_DOC_CONVERT_STEP.CONFIRM) {
        return (
            <Modal title={ headingCase(translation("key_convert_to_pdf")) } width={ 520 } onClose={ onCancel } closeLabel={ translation("key_close") } busy={ converting } className="mcdt-dlg"
                footer={ (
                    <>
                        <span className="grow" />
                        <Btn variant="secondary" type="button" disabled={ converting } onClick={ onCancel }>{ translation("key_cancel") }</Btn>
                        <Btn variant="primary" type="button" disabled={ converting } onClick={ convert }>{ converting ? `${ translation("key_converting") }…` : translation("key_next") }</Btn>
                    </>
                ) }>
                <p className="intro">{ translation("key_following_documents_will_be_converted_to_pdf") }</p>
                <ul className="g1-convert-list">
                    { files.map((file) => (
                        <li key={ file.name }><Icon name="filetext" size={ 14 } strokeWidth={ 1.6 } /><span className="nm">{ file.name }</span><span className="ext mono">{ (file.type || "").split("/")[1] || file.type }</span></li>
                    )) }
                </ul>
            </Modal>
        );
    }
    return (
        <Modal title={ `${ translation("key_preview") } — ${ current?.name || "" }` } width={ 960 } onClose={ onCancel } closeLabel={ translation("key_close") } className="mcdt-dlg g1-preview-modal"
            footer={ (
                <>
                    <Btn variant="secondary" type="button" disabled={ index === 0 } onClick={ previous }><Icon name="chev_left" size={ 12 } />{ translation("key_previous") }</Btn>
                    <span className="grow" />
                    <Btn variant="dangerOutline" type="button" onClick={ discard }>{ translation("key_discard") }</Btn>
                    <Btn variant="primary" type="button" onClick={ accept }>{ isLast ? translation("key_upload") : translation("key_approve") }</Btn>
                </>
            ) }>
            <p className="intro mono">{ index + 1 } { translation("key_of") } { converted.length }</p>
            { previewUrl && <div className="g1-preview-page g1-preview-large frame"><iframe src={ `${ previewUrl }#toolbar=0` } title={ current?.name || "" } /></div> }
        </Modal>
    );
};

DocumentsConvertDialog.propTypes = {
    /* the picked files that need conversion (images); PDFs pass through convertFilesToPdf untouched */
    files: PropTypes.array.isRequired,
    /* (acceptedPdfFiles[]) — the uploader merges them with the files that needed no conversion */
    onDone: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};

export default DocumentsConvertDialog;
