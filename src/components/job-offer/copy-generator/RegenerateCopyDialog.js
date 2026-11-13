import React, { useState } from 'react';
import PropTypes from 'prop-types';
import translation from '../../../utils/translation';
import { REGEN_INSTRUCTION_MAX, REGEN_REASON_KEYS } from './copyGeneratorConfig';

/* prototype regen panel: "Why regenerate?" reason chips, a free note, or both — whatever is chosen goes to the agent and
   is kept with the round in the history */
function RegenerateCopyDialog({ currentVersionNumber, onCancel, onRegenerate }) {
    const [reason, setReason] = useState(null);
    const [note, setNote] = useState('');
    const instruction = [reason ? translation(REGEN_REASON_KEYS[reason]) : '', note.trim()].filter(Boolean).join(' — ');

    return (
        <div className="jocopy-popup-backdrop" role="dialog" aria-modal="true">
            <div className="jocopy-popup">
                <div className="jocopy-popup-title">{translation('key_regenerate_copy')}</div>
                <div className="jocopy-popup-body">
                    {translation('key_regenerate_copy_replaces_version').replace('{n}', currentVersionNumber)}
                </div>
                <div className="jocopy-field-label">{translation('key_jo_editor_why_regenerate')}</div>
                <div className="jocopy-reasons" role="group" aria-label={translation('key_jo_editor_why_regenerate')}>
                    {Object.keys(REGEN_REASON_KEYS).map((id) => (
                        <button key={id} type="button" className={`jocopy-reason${reason === id ? ' on' : ''}`} aria-pressed={reason === id} onClick={() => setReason((r) => (r === id ? null : id))}>
                            {translation(REGEN_REASON_KEYS[id])}
                        </button>
                    ))}
                </div>
                <label className="jocopy-field-label" htmlFor="jocopy-regen-note">
                    {translation('key_how_should_copy_be_improved')}
                </label>
                <textarea
                    id="jocopy-regen-note"
                    className="jocopy-regen-ta"
                    placeholder={translation('key_jo_editor_regen_note_placeholder')}
                    value={note}
                    maxLength={REGEN_INSTRUCTION_MAX}
                    onChange={(e) => setNote(e.target.value)}
                />
                <div className="jocopy-popup-hint">{translation('key_jo_editor_regen_hint')}</div>
                <div className="jocopy-popup-acts">
                    <button type="button" className="btn btn-outline jocopy-btn-sm" onClick={onCancel}>
                        {translation('key_cancel')}
                    </button>
                    <button type="button" className="btn filled-btn jocopy-btn-sm" onClick={() => onRegenerate(instruction, { reason: reason ? translation(REGEN_REASON_KEYS[reason]) : null, note: note.trim() || null })}>
                        {translation('key_regenerate')}
                    </button>
                </div>
            </div>
        </div>
    );
}

RegenerateCopyDialog.propTypes = {
    currentVersionNumber: PropTypes.number,
    onCancel: PropTypes.func.isRequired,
    onRegenerate: PropTypes.func.isRequired,
};

export default RegenerateCopyDialog;
