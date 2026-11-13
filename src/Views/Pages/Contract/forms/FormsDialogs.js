import React from "react";
import PropTypes from "prop-types";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import Icon from "../../../../components/Icon/Icon";
import translation from "../../../../utils/translation";
import { CR_FORM_OFFICIAL, CR_FORM_OFFICIAL_PATH } from "../contractConstants";

/**
 * View official form (prototype officialPreviewHTML, B15-27): the blank Immigration Department pages as a reference,
 * with the PDF to download — it does not fill the record's data onto the form.
 */
export const OfficialFormPreview = ({ form, onClose }) => {
    const info = CR_FORM_OFFICIAL[form];
    if (!info) return null;
    const pages = Array.from({ length: info.pages }, (_, i) => `${ CR_FORM_OFFICIAL_PATH }${ info.slug }-p${ i + 1 }.jpg`);
    return (
        <Modal title={ info.file } subtitle={ <span className="g1-tag fx-official-tag">{ translation("key_fx_official_reference") } { info.title }</span> } width={ 960 } onClose={ onClose } closeLabel={ translation("key_close") } className="mcdt-dlg fx-preview"
            footer={ (<><span className="grow" /><Btn as="a" variant="secondary" href={ `${ CR_FORM_OFFICIAL_PATH }${ info.file }` } download={ info.file }><Icon name="download" size={ 12 } strokeWidth={ 1.6 } />{ translation("key_download") }</Btn><Btn variant="primary" type="button" onClick={ onClose }>{ translation("key_close") }</Btn></>) }>
            <div className="g1-official-pages">
                { pages.map((src, i) => <img key={ src } src={ src } alt={ `${ info.title } — ${ i + 1 } / ${ info.pages }` } loading="lazy" />) }
            </div>
        </Modal>
    );
};
OfficialFormPreview.propTypes = { form: PropTypes.string.isRequired, onClose: PropTypes.func.isRequired };

/** Import from document (prototype B14-55 / B15-26): informational only — document-assisted population is a later phase. */
export const ImportFromDocumentDialog = ({ onClose }) => (
    <Modal title={ translation("key_fx_import_from_document") } width={ 440 } onClose={ onClose } closeLabel={ translation("key_close") } className="mcdt-dlg"
        footer={ <><span className="grow" /><Btn variant="primary" type="button" onClick={ onClose }>{ translation("key_close") }</Btn></> }>
        <p className="intro">{ translation("key_fx_import_later_phase") }</p>
    </Modal>
);
ImportFromDocumentDialog.propTypes = { onClose: PropTypes.func.isRequired };
