import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from 'prop-types';
import { fetchDuplicateWorkers } from "../../../../../../redux/Slices/worker/WorkerSlice";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import { getInitials } from "../../../../../../utils/utils";
import translation from "../../../../../../utils/translation";
import { workerProfileStatusLabel } from "../../../workerModuleConstants";

const lockIcon = (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="4" y="7" width="8" height="6.5" rx="1.5" /><path d="M5.5 7V5.5a2.5 2.5 0 0 0 5 0V7" />
    </svg>
);

/* the canonical Profile Status label (one registry) — the API `worker_status` text still carries legacy words */
const statusLabelOf = (row) => workerProfileStatusLabel(row?.worker_status?.id, row?.worker_status?.worker_status);
const metaOf = (row) => [
    row?.type === 1 ? 'Local' : row?.type === 2 ? 'Overseas' : null,
    row?.nationality_info?.name,
    statusLabelOf(row),
].filter(Boolean).join(' · ');

const WkdDuplicatesPanel = ({ userId, currentWorker, onOpenFullList }) => {
    const dispatch = useDispatch();
    const duplicateWorkersList = useSelector((state) => state.worker.duplicateWorkersList);
    const [candidateId, setCandidateId] = useState(null);
    const [primaryId, setPrimaryId] = useState(null);

    useEffect(() => {
        if (userId) {
            dispatchWithHandling(dispatch, fetchDuplicateWorkers({ page: 1, limit: 10, user_id: parseInt(userId) }));
        }
    }, [dispatch, userId]);

    const candidates = useMemo(
        () => (Array.isArray(duplicateWorkersList) ? duplicateWorkersList : []),
        [duplicateWorkersList]
    );
    const candidate = candidates.find((c) => c.id === candidateId) || candidates[0] || null;

    return (
        <>
            <div className="ctx-note warning">
                <strong>{ translation('key_review_evidence_before_acting') }</strong>
                <span>{ translation('key_review_evidence_note') }</span>
            </div>

            <fieldset className="dup-candidate-field">
                <legend>{ translation('key_potential_match') }</legend>
                <div className="dup-list">
                    { candidates.map((row) => (
                        <label key={ row.id } className={ `dup-card dup-select ${ (candidate?.id === row.id) ? 'selected' : '' }` }>
                            <input
                                type="radio"
                                name="wkd-duplicate-candidate"
                                checked={ candidate?.id === row.id }
                                onChange={ () => setCandidateId(row.id) }
                            />
                            <span className="role-avatar">{ getInitials(row?.fullname || '') }</span>
                            <span className="ctx-grow">
                                <strong className="person-name">{ row?.fullname }</strong>
                                <span className="mono-static">{ row?.reference_id }</span>
                                <span className="dup-meta">{ metaOf(row) }</span>
                            </span>
                        </label>
                    )) }
                    { candidates.length === 0 && (
                        <div className="wkd-wx-empty">{ translation('key_no_potential_duplicates') }</div>
                    ) }
                </div>
            </fieldset>

            { candidate && (
                <fieldset className="dup-primary-field">
                    <legend>{ translation('key_choose_primary_worker_record') }</legend>
                    <label className={ `dup-primary-option ${ primaryId === 'current' ? 'selected' : '' }` }>
                        <input
                            type="radio"
                            name="wkd-duplicate-primary"
                            checked={ primaryId === 'current' }
                            onChange={ () => setPrimaryId('current') }
                        />
                        <span>
                            <strong>{ currentWorker?.name }</strong>
                            <span className="mono-static">{ currentWorker?.reference_id }</span>
                        </span>
                    </label>
                    <label className={ `dup-primary-option ${ primaryId === candidate.id ? 'selected' : '' }` }>
                        <input
                            type="radio"
                            name="wkd-duplicate-primary"
                            checked={ primaryId === candidate.id }
                            onChange={ () => setPrimaryId(candidate.id) }
                        />
                        <span>
                            <strong>{ candidate?.fullname }</strong>
                            <span className="mono-static">{ candidate?.reference_id }</span>
                        </span>
                        <span>{ statusLabelOf(candidate) }</span>
                    </label>
                </fieldset>
            ) }

            <div className="dup-actions" aria-label={ translation('key_actions') }>
                <button type="button" className="ctx-btn danger" disabled>{ translation('key_merge_records') }</button>
                <button type="button" className="ctx-btn secondary" disabled>{ translation('key_deactivate_duplicate') }</button>
                <button type="button" className="ctx-btn secondary" disabled>{ translation('key_mark_old_duplicate_create_new') }</button>
            </div>
            <div className="ctx-permission-note">
                { lockIcon } { translation('key_duplicate_resolution_pending_note') }
            </div>

            <button type="button" className="ctx-inline-link" onClick={ onOpenFullList }>
                { translation('key_view_duplicates') } →
            </button>
        </>
    );
};

WkdDuplicatesPanel.propTypes = {
    userId: PropTypes.any,
    currentWorker: PropTypes.object,
    onOpenFullList: PropTypes.func,
};

export default React.memo(WkdDuplicatesPanel);
