import React, { useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import { Field, SelectBox } from "../../../../components/ui/FormControls";
import translation from "../../../../utils/translation";
import { CR_DOC_FOLDER_ONLY } from "../contractConstants";

/**
 * "Upload to Immigration" (prototype v210 / v211 classification step): which checklist item the file is for, chosen
 * BEFORE the file chooser as one operation. Current requirements first (the first one preselected), the other checklist
 * items, then "Not a checklist item (keep in the folder only)". Without Documents — Manage, or while the submitted
 * requirement snapshot is immutable, only the folder-only choice is offered.
 */
const DocumentsUploadDialog = ({ current, others, restriction, onChoose, onClose }) => {
    const canAssociate = !restriction;
    const [pick, setPick] = useState(() => (canAssociate && current.length ? current[0].value : CR_DOC_FOLDER_ONLY));
    const option = (o) => <option key={ o.value } value={ o.value }>{ o.label }{ o.file ? ` — ${ translation("key_cr_doc_replaces") } ${ o.file }` : "" }</option>;
    const hint = canAssociate
        ? translation("key_cr_doc_classify_help")
        : `${ translation(restriction) } ${ translation("key_cr_doc_folder_only_help") }`;
    return (
        <Modal title={ translation("key_cr_upload_to_immigration") } width={ 560 } onClose={ onClose } closeLabel={ translation("key_close") } className="mcdt-dlg"
            footer={ (
                <>
                    <span className="grow" />
                    <Btn variant="secondary" type="button" onClick={ onClose }>{ translation("key_cancel") }</Btn>
                    <Btn variant="primary" type="button" onClick={ () => onChoose(pick === CR_DOC_FOLDER_ONLY ? null : pick) }>{ translation("key_choose_file") }</Btn>
                </>
            ) }>
            <Field label={ translation("key_cr_document") } htmlFor="cr-doc-classify" full className="f-full" hint={ hint }>
                <SelectBox id="cr-doc-classify" value={ pick } onChange={ (e) => setPick(e.target.value) }>
                    { canAssociate && current.length > 0 && <optgroup label={ translation("key_cr_current_requirements") }>{ current.map(option) }</optgroup> }
                    { canAssociate && others.length > 0 && <optgroup label={ translation("key_cr_other_checklist_items") }>{ others.map(option) }</optgroup> }
                    <option value={ CR_DOC_FOLDER_ONLY }>{ translation("key_cr_not_a_checklist_item") }</option>
                </SelectBox>
            </Field>
        </Modal>
    );
};

const optionShape = PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired, file: PropTypes.string }));
DocumentsUploadDialog.propTypes = {
    current: optionShape.isRequired,
    others: optionShape.isRequired,
    restriction: PropTypes.string,          /* en key of the reason association is withheld; empty = allowed */
    onChoose: PropTypes.func.isRequired,    /* (requirementKey | null) */
    onClose: PropTypes.func.isRequired,
};

export default React.memo(DocumentsUploadDialog);
