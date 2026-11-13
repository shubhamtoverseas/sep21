import React, { useMemo } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../../../components/ui/Modal";
import Btn from "../../../../../../components/ui/Btn";
import { PERM_COPY_KEYS, t } from "./permissionCatalogue";
import { screenName, shownValue } from "./permissionStructure";
import { formatStored, formatWhen, keyIndex, labelForKey } from "./permissionHistory";

/*
 * 409 STALE_VERSION (backend 263, AT-032): another save landed first and nothing was written. Their changes (changed_since)
 * beside the admin's pending ones; the draft is kept. Reload and review re-reads the account and re-applies the draft where
 * the key was not among their changes; Discard my changes drops the draft. The save is never retried automatically.
 */
const PermissionStaleDialog = ({ stale, engine, rows, bindingOf, audience, template, saved, draft, who, busy, onReload, onDiscard, onClose }) => {
    const index = useMemo(() => keyIndex(rows, bindingOf, audience), [rows, bindingOf, audience]);
    const mine = useMemo(() => engine.diff(saved, draft, audience).filter((d) => d.before !== d.after), [engine, saved, draft, audience]);
    const theirs = stale?.changedSince || [];
    return (
        <Modal title={ t(PERM_COPY_KEYS.staleTitle) } width={ 640 } onClose={ onClose } closeLabel={ t(PERM_COPY_KEYS.close) } busy={ busy } className="upm upm-dlg"
            footer={ (
                <>
                    <span className="grow" />
                    <Btn variant="secondary" type="button" onClick={ onDiscard } disabled={ busy }>{ t(PERM_COPY_KEYS.discardMine) }</Btn>
                    <Btn variant="primary" type="button" onClick={ onReload } disabled={ busy }>{ t(PERM_COPY_KEYS.reloadReview) }</Btn>
                </>
            ) }>
            <p className="rv-who">{ t(PERM_COPY_KEYS.reviewFor) } <b>{ who.name }</b> · { who.type }</p>
            <p>{ t(PERM_COPY_KEYS.staleIntro) }</p>
            <section className="rv-mod">
                <h3>{ t(PERM_COPY_KEYS.staleTheirs) }</h3>
                { theirs.map((e) => (
                    <div key={ `${ e.key_value }-${ e.version }-${ e.created_at }` } className="rv-row" data-key={ e.key_value }>
                        <div><span className="rv-l">{ labelForKey(e.key_value, index) }</span><span className="rv-g">{ e.actor_name } · { formatWhen(e.created_at) }</span></div>
                        <div className="rv-v">{ formatStored(e.key_value, e.old_value, index, template) } → { formatStored(e.key_value, e.new_value, index, template) }</div>
                    </div>
                )) }
            </section>
            <section className="rv-mod">
                <h3>{ t(PERM_COPY_KEYS.staleMine) }</h3>
                { mine.length === 0 && <p className="rv-none">{ t(PERM_COPY_KEYS.noChange) }</p> }
                { mine.map((d) => {
                    const r = engine.index[d.id];
                    return (
                        <div key={ `${ d.id }|${ d.context }` } className="rv-row" data-key={ `${ d.id }|${ d.context }` }>
                            <div><span className="rv-l">{ screenName(r) }</span></div>
                            <div className="rv-v">{ shownValue(engine, r, d.context, d.before) } → { shownValue(engine, r, d.context, d.after) }</div>
                        </div>
                    );
                }) }
            </section>
        </Modal>
    );
};

PermissionStaleDialog.propTypes = {
    stale: PropTypes.shape({ changedSince: PropTypes.array, currentVersion: PropTypes.number, message: PropTypes.string }).isRequired,
    engine: PropTypes.object.isRequired,
    rows: PropTypes.array.isRequired,
    bindingOf: PropTypes.func.isRequired,
    audience: PropTypes.string.isRequired,
    template: PropTypes.object,
    saved: PropTypes.object.isRequired,
    draft: PropTypes.object.isRequired,
    who: PropTypes.shape({ name: PropTypes.string, type: PropTypes.string }).isRequired,
    busy: PropTypes.bool,
    onReload: PropTypes.func.isRequired,
    onDiscard: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default PermissionStaleDialog;
