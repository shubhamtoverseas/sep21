import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../utils/translation";
import { SIGN_OFF_BLOCKER, SIGN_OFF_HINT_KEYS, SIGN_OFF_REFUSAL_CODES, SIGN_OFF_REGISTER } from "../processingConstants";

/**
 * Prepared / Ready marks are the register owner's act (CPERM §8, OWNERS.md "Prepared and Ready"; admin API CHANGE_HISTORY 252).
 * `GET /get-processing-details/:contract_id/:type` carries `sign_off { can_mark_prepared, can_mark_ready, prepared_blocker,
 * ready_blocker, prepared_owner_staff_id, ready_owner_staff_id }`; each blocker is null (may mark) · "no_edit" · "unassigned" ·
 * "not_holder". The tick columns read this per viewer — Stage Actions — Edit alone no longer enables them.
 */

/* An older admin API without `sign_off` keeps the previous rule (Edit), so the columns never go dark on a stale server. */
export const signOffOf = (details, legacyCanTick) => {
    const so = details?.sign_off;
    if (!so) {
        return {
            canPrepared: Boolean(legacyCanTick), canReady: Boolean(legacyCanTick),
            preparedBlocker: legacyCanTick ? null : SIGN_OFF_BLOCKER.NO_EDIT, readyBlocker: legacyCanTick ? null : SIGN_OFF_BLOCKER.NO_EDIT,
        };
    }
    return {
        canPrepared: Boolean(so.can_mark_prepared), canReady: Boolean(so.can_mark_ready),
        preparedBlocker: so.prepared_blocker ?? null, readyBlocker: so.ready_blocker ?? null,
    };
};

/* The one-line reason a column is read-only; `no_edit` has no copy of its own today (the ticks were silently disabled before). */
export const signOffHint = (register, blocker, holderName) => {
    const key = SIGN_OFF_HINT_KEYS[register]?.[blocker];
    if (!key) return "";
    const text = translation(key);
    return blocker === SIGN_OFF_BLOCKER.NOT_HOLDER && holderName ? `${ text } (${ holderName })` : text;
};

/* The save refusal codes of POST /update-processing-full-details (HTTP 403): the stored marks did not change. */
export const signOffRefusalCode = (res) => {
    const code = res?.payload?.data?.data?.code || res?.payload?.data?.code || null;
    return code && SIGN_OFF_REFUSAL_CODES.includes(code) ? code : null;
};

/* Column header tooltips: the same sentence as the note, so a hover on the disabled column explains it. */
export const signOffColumnTitles = (signOff, holders = {}) => ({
    prepared: signOff.canPrepared ? undefined : signOffHint(SIGN_OFF_REGISTER.PREPARED, signOff.preparedBlocker, holders.prepared) || undefined,
    ready: signOff.canReady ? undefined : signOffHint(SIGN_OFF_REGISTER.READY, signOff.readyBlocker, holders.ready) || undefined,
});

/** One line per blocked register under the stage panel head. Renders nothing when both columns are open or the only blocker is `no_edit`. */
export const SignOffNote = ({ signOff, holders = {} }) => {
    const lines = [
        !signOff.canPrepared && signOffHint(SIGN_OFF_REGISTER.PREPARED, signOff.preparedBlocker, holders.prepared),
        !signOff.canReady && signOffHint(SIGN_OFF_REGISTER.READY, signOff.readyBlocker, holders.ready),
    ].filter(Boolean);
    if (!lines.length) return null;
    return (
        <div className="g1-note g1-signoff" role="note" data-mc-signoff="">
            { lines.map((line) => <div key={ line }>{ line }</div>) }
        </div>
    );
};
SignOffNote.propTypes = {
    signOff: PropTypes.shape({ canPrepared: PropTypes.bool, canReady: PropTypes.bool, preparedBlocker: PropTypes.string, readyBlocker: PropTypes.string }).isRequired,
    holders: PropTypes.shape({ prepared: PropTypes.string, ready: PropTypes.string }),
};
