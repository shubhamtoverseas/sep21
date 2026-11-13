import React from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import translation from '../../../utils/translation';
import { COPY_FIELD_LABEL_KEYS, ORIGIN_LABEL_KEYS } from './copyGeneratorConfig';

const changedFieldLabels = (changedFields) => (changedFields || [])
    .map((field) => translation(COPY_FIELD_LABEL_KEYS[field] || field))
    .join(', ');

function CopyVersionsDialog({ versions, currentId, currentHash, busy, onRestore, onClose }) {
    const rows = [...versions].reverse();

    return (
        <div className="jocopy-popup-backdrop" role="dialog" aria-modal="true">
            <div className="jocopy-popup">
                <div className="jocopy-popup-title">{translation('key_copy_versions')}</div>
                <div className="jocopy-popup-body">{translation('key_copy_versions_intro')}</div>
                <div className="jocopy-histpanel">
                    {rows.map((version) => {
                        const isCurrent = version.id === currentId;
                        const isFailed = version.state === 'FAILED';
                        return (
                            <div className="jocopy-histrow" key={version.id}>
                                <span className={`jocopy-roundtag ${isFailed ? 'jocopy-failedtag' : ''}`}>
                                    {isFailed ? translation('key_attempt') : `${translation('key_version')} ${version.number}`}
                                </span>
                                <div className="jocopy-histbody">
                                    <div className="jocopy-histmain">
                                        {isFailed
                                            ? translation(version.kind === 'generate' ? 'key_generation_failed' : 'key_regeneration_failed')
                                            : translation(ORIGIN_LABEL_KEYS[version.origin])}
                                        {` · ${dayjs(version.at).format('HH:mm')}`}
                                        {version.instruction ? ` · "${version.instruction}"` : ''}
                                        {version.approved ? ` · ${translation('key_approved')}${version.approvedBy ? ` · ${version.approvedBy}` : ''}${version.approvedAt && dayjs(version.approvedAt).isValid() ? ` · ${dayjs(version.approvedAt).format('DD/MM/YYYY HH:mm')}` : ''}` : ''}
                                    </div>
                                    <div className="jocopy-histmeta">
                                        {version.parentNumber
                                            ? translation('key_from_version').replace('{n}', version.parentNumber)
                                            : translation('key_first_version')}
                                        {version.restoredFromNumber
                                            ? ` · ${translation('key_restored_from_version').replace('{n}', version.restoredFromNumber)}`
                                            : ''}
                                        {version.changedFields?.length
                                            ? ` · ${translation('key_job_details_changed')}: ${changedFieldLabels(version.changedFields)}`
                                            : ''}
                                        {isFailed
                                            ? ` · ${translation('key_failed_attempt_result')}`
                                            : ` · ${version.sourceHash === currentHash
                                                ? translation('key_synchronized_with_current_details')
                                                : translation('key_not_synchronized_with_current_details')}`}
                                    </div>
                                </div>
                                <div className="jocopy-histside">
                                    {isCurrent && <span className="jocopy-langtag jocopy-pub">{translation('key_current')}</span>}
                                    {isFailed && <span className="jocopy-histhint">{translation('key_not_restorable')}</span>}
                                    {!isCurrent && !isFailed && (
                                        <button
                                            type="button"
                                            className="btn btn-outline jocopy-btn-sm"
                                            disabled={busy}
                                            onClick={() => onRestore(version.id)}
                                        >
                                            {translation('key_restore')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="jocopy-popup-acts">
                    <button type="button" className="btn filled-btn jocopy-btn-sm" onClick={onClose}>
                        {translation('key_close')}
                    </button>
                </div>
            </div>
        </div>
    );
}

CopyVersionsDialog.propTypes = {
    versions: PropTypes.array.isRequired,
    currentId: PropTypes.string,
    currentHash: PropTypes.string,
    busy: PropTypes.bool,
    onRestore: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default CopyVersionsDialog;
