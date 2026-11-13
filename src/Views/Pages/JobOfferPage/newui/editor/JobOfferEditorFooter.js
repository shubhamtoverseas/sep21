import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../components/ui/Btn";
import { JO_EDITOR_COPY } from "../../jobOfferConstants";

const C = JO_EDITOR_COPY;

/*
 * Prototype footer (Draft / In Review): Close · Save as Draft · Generate copy · Approve & Open. Approve & Open is present only with
 * the Change JO Status grant (U-0251), disabled while the copy is not ready. An Open record's footer is Cancel · Save changes (U-0243):
 * ordinary save of the changed fields, status moves only through Change Status.
 * Every dismissal of a dirty form — footer Close, Back, crumb, drawer Escape / backdrop / ✕ — lands on the same
 * "Close without saving?" bar: the host bumps `closeRequest` and the bar opens here. Read-only hosts show Close alone.
 */
const JobOfferEditorFooter = ({ copyState, approved, canGenerate, canApprove, approveAllowed = true, approveTitle, isDirty, isSaving, readOnly = false, openRecord = false, closeRequest = 0, onGenerate, onSaveDraft, onSave, onApprove, onClose, variant = 'page' }) => {
    const [confirmClose, setConfirmClose] = useState(false);
    const footnote = approved ? C.footApproved : copyState === 'none' || copyState === 'pending' ? C.footNone : copyState === 'review' ? C.footStale : C.footReady;

    const requestClose = useCallback(() => { if (isDirty && !confirmClose) { setConfirmClose(true); return; } onClose(); }, [isDirty, confirmClose, onClose]);
    useEffect(() => { if (closeRequest > 0) requestClose(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [closeRequest]);

    return (
        <div className={ `joe-foot ${ variant }` }>
            { confirmClose && (
                <div className="discardbar" role="alertdialog" aria-label={ C.discard }>
                    <span>{ C.discard }</span>
                    <Btn variant="secondary" onClick={ () => setConfirmClose(false) }>{ C.keepEditing }</Btn>
                    { openRecord
                        ? <Btn variant="secondary" disabled={ isSaving } aria-disabled={ isSaving } onClick={ onSave }>{ C.saveChanges }</Btn>
                        : <Btn variant="secondary" disabled={ isSaving } aria-disabled={ isSaving } title={ C.draftTitle } onClick={ onSaveDraft }>{ C.saveDraft }</Btn> }
                    <Btn variant="danger" onClick={ onClose }>{ C.discardBtn }</Btn>
                </div>
            ) }
            { !readOnly && !openRecord && <span className="hint">{ footnote }</span> }
            <span className="spacer" />
            <Btn variant="secondary" onClick={ readOnly ? onClose : requestClose }>{ openRecord && !readOnly ? C.cancel : C.close }</Btn>
            { !readOnly && openRecord && (
                <Btn variant="primary" disabled={ isSaving } aria-disabled={ isSaving } onClick={ onSave }>{ C.saveChanges }</Btn>
            ) }
            { !readOnly && !openRecord && (
                <>
                    <Btn variant="secondary" disabled={ isSaving } aria-disabled={ isSaving } title={ C.draftTitle } onClick={ onSaveDraft }>{ C.saveDraft }</Btn>
                    <Btn variant="primary" disabled={ !canGenerate } aria-disabled={ !canGenerate } onClick={ onGenerate }>{ C.generate }</Btn>
                    { approveAllowed && (
                        <Btn variant="primary" disabled={ !canApprove || isSaving } aria-disabled={ !canApprove || isSaving } title={ approveTitle } onClick={ onApprove }>{ C.approve }</Btn>
                    ) }
                </>
            ) }
        </div>
    );
};

JobOfferEditorFooter.propTypes = {
    copyState: PropTypes.string,
    approved: PropTypes.bool,
    canGenerate: PropTypes.bool,
    canApprove: PropTypes.bool,
    /* the Change JO Status grant: without it Approve & Open is absent, not disabled (U-0251) */
    approveAllowed: PropTypes.bool,
    approveTitle: PropTypes.string,
    isDirty: PropTypes.bool,
    isSaving: PropTypes.bool,
    readOnly: PropTypes.bool,
    /* an Open record: Cancel · Save changes (U-0243) */
    openRecord: PropTypes.bool,
    onSave: PropTypes.func,
    /* bumped by the host to route an external dismissal through the unsaved-changes bar */
    closeRequest: PropTypes.number,
    onGenerate: PropTypes.func.isRequired,
    onSaveDraft: PropTypes.func.isRequired,
    onApprove: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    variant: PropTypes.oneOf(['page', 'drawer']),
};

export default React.memo(JobOfferEditorFooter);
