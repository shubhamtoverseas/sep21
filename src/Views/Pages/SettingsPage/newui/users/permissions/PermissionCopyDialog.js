import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../../../components/ui/Modal";
import Btn from "../../../../../../components/ui/Btn";
import { SelectBox } from "../../../../../../components/ui/FormControls";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { featureFor, groupTitle, moduleName, PERM_COPY_KEYS, PERM_COPY_EXCLUDED_IDS, PERM_LEVELS, profileLabel, profilesFor, t } from "./permissionCatalogue";
import PermissionReviewDialog from "./PermissionReviewDialog";
import { screenName } from "./permissionStructure";
import { truth } from "./permissionEngine";

/*
 * Copy permissions — one-time, reviewed: a starting profile or a same-type user → "Review copied permissions" (diff +
 * what was not copied) → Apply into the draft. The engine never copies ownership eligibility, branch / location scope,
 * Manage permissions or Manage assignment eligibility: the target keeps its values (requirements "Copy permissions").
 */
const USER_PREFIX = "user:";
const STEP = Object.freeze({ PICK: "pick", REVIEW: "review", NOTHING: "nothing", FAILED: "failed" });

/** source grants → the draft after the copy, with the review inputs */
export const prepareCopy = ({ engine, audience, draft, source }) => {
    const unsupported = [];
    const clean = {};
    Object.entries(source || {}).forEach(([k, v]) => {
        const [id, c] = k.split("|");
        const r = engine.index[id];
        if (!r) { if (truth(v)) unsupported.push({ key: k, kind: "unknown" }); return; }
        if (!engine.supported(r, audience) || !engine.contexts(r, audience).includes(c)) { if (truth(v)) unsupported.push({ key: k, r, context: c, kind: "type" }); return; }
        if (r.type === "level" ? !PERM_LEVELS.includes(v) : typeof v !== "boolean") { unsupported.push({ key: k, r, context: c, kind: "invalid" }); return; }
        if (r.held && truth(v)) { unsupported.push({ key: k, r, context: c, kind: "held" }); return; }
        if (PERM_COPY_EXCLUDED_IDS.includes(r.id) && v !== engine.raw(draft, id, c)) { unsupported.push({ key: k, r, context: c, kind: "protected" }); return; }
        clean[k] = v;
    });
    const copied = engine.copy(draft, clean, audience);
    const routine = Object.entries(clean).some(([k, v]) => { const [id, c] = k.split("|"); const r = engine.index[id]; return engine.copyExcluded(r) && v !== engine.raw(draft, id, c); });
    return { grants: copied.grants, diffs: engine.diff(draft, copied.grants, audience), unsupported, routine };
};

const WHY = { held: PERM_COPY_KEYS.whyHeld, invalid: PERM_COPY_KEYS.whyInvalid, type: PERM_COPY_KEYS.whyType, unknown: PERM_COPY_KEYS.whyUnknown, protected: PERM_COPY_KEYS.whyProtected };

const NotCopied = ({ list }) => (list.length ? (
    <section className="rv-out">
        <h3>{ t(PERM_COPY_KEYS.notCopied) }</h3>
        { list.map((u) => (
            <div key={ u.key } className="rv-row" data-unsupported={ u.key }>
                <div>
                    <span className="rv-l">{ u.r ? screenName(u.r) : u.key }</span>
                    <span className="rv-g">{ u.r ? `${ moduleName(u.r.module) } · ${ groupTitle(featureFor(u.r).group, u.context) }` : t(PERM_COPY_KEYS.whyUnknown) }</span>
                </div>
                <div className="rv-v">{ t(WHY[u.kind]) }</div>
            </div>
        )) }
    </section>
) : null);
NotCopied.propTypes = { list: PropTypes.array.isRequired };

const PermissionCopyDialog = ({ engine, rows, bindingOf, audience, draft, who, users, currentProfileId, loadUserGrants, onApply, onClose }) => {
    const profiles = useMemo(() => profilesFor(audience), [audience]);
    const [value, setValue] = useState(profiles.some((p) => p.id === currentProfileId) ? currentProfileId : (profiles[0]?.id || ""));
    const [step, setStep] = useState(STEP.PICK);
    const [busy, setBusy] = useState(false);
    const [prep, setPrep] = useState(null);
    const [from, setFrom] = useState(null);

    const review = async () => {
        setBusy(true);
        try {
            let source;
            let sourceUser = null;
            if (value.startsWith(USER_PREFIX)) {
                const id = value.slice(USER_PREFIX.length);
                sourceUser = users.find((u) => String(u.id) === id) || null;
                source = await loadUserGrants(id);
                if (!source) { setStep(STEP.FAILED); return; }
            } else {
                source = profiles.find((p) => p.id === value)?.grants || {};
            }
            const prepared = prepareCopy({ engine, audience, draft, source });
            setFrom(sourceUser);
            setPrep(prepared);
            setStep(prepared.diffs.length ? STEP.REVIEW : STEP.NOTHING);
        } catch {
            setStep(STEP.FAILED);
        } finally { setBusy(false); }
    };
    const apply = () => {
        onApply(prep.grants);
        ShowToast("success", t(PERM_COPY_KEYS.copyApplied));
        onClose();
    };
    const lead = from ? <p className="rv-who">{ t(PERM_COPY_KEYS.copyingFrom) } <b>{ from.name }</b> · { who.type }</p> : null;

    if (step === STEP.REVIEW) {
        return (
            <PermissionReviewDialog title={ t(PERM_COPY_KEYS.copyReviewTitle) } engine={ engine } rows={ rows } bindingOf={ bindingOf } audience={ audience } diffs={ prep.diffs } who={ who }
                lead={ lead } kept={ prep.routine } extra={ <NotCopied list={ prep.unsupported } /> } onClose={ onClose }
                footer={ <><span className="grow" /><Btn variant="secondary" type="button" onClick={ onClose }>{ t(PERM_COPY_KEYS.cancel) }</Btn><Btn variant="primary" type="button" onClick={ apply }>{ t(PERM_COPY_KEYS.apply) }</Btn></> } />
        );
    }
    if (step === STEP.NOTHING || step === STEP.FAILED) {
        const text = step === STEP.FAILED ? t(PERM_COPY_KEYS.copyUnreadable) : (from ? t(PERM_COPY_KEYS.copyUnchangedUser, { name: from.name }) : t(PERM_COPY_KEYS.copyUnchangedProfile));
        return (
            <Modal title={ t(step === STEP.FAILED ? PERM_COPY_KEYS.copyNotApplied : PERM_COPY_KEYS.copyReviewTitle) } width={ 520 } onClose={ onClose } closeLabel={ t(PERM_COPY_KEYS.close) } className="upm upm-dlg"
                footer={ <><span className="grow" /><Btn variant="secondary" type="button" onClick={ onClose }>{ t(PERM_COPY_KEYS.close) }</Btn></> }>
                <p>{ text }</p>
                { step === STEP.FAILED && <p>{ t(PERM_COPY_KEYS.copyUnchanged) }</p> }
                { step === STEP.NOTHING && prep?.routine && <p className="rv-kept">{ t(PERM_COPY_KEYS.copyKept) }</p> }
                { step === STEP.NOTHING && <NotCopied list={ prep?.unsupported || [] } /> }
            </Modal>
        );
    }
    return (
        <Modal title={ t(PERM_COPY_KEYS.copy) } width={ 520 } onClose={ onClose } closeLabel={ t(PERM_COPY_KEYS.close) } busy={ busy } className="upm upm-dlg"
            footer={ <><span className="grow" /><Btn variant="secondary" type="button" disabled={ busy } onClick={ onClose }>{ t(PERM_COPY_KEYS.cancel) }</Btn><Btn variant="primary" type="button" disabled={ busy || !value } onClick={ review }>{ t(PERM_COPY_KEYS.reviewCopy) }</Btn></> }>
            <label className="fld" htmlFor="upm-copy-source">
                <span>{ t(PERM_COPY_KEYS.copyFrom) }</span>
                <SelectBox id="upm-copy-source" value={ value } onChange={ (e) => setValue(e.target.value) }>
                    <optgroup label={ t(PERM_COPY_KEYS.startingProfiles) }>{ profiles.map((p) => <option key={ p.id } value={ p.id }>{ profileLabel(p) }</option>) }</optgroup>
                    { users.length > 0 && <optgroup label={ t(PERM_COPY_KEYS.users) }>{ users.map((u) => <option key={ u.id } value={ `${ USER_PREFIX }${ u.id }` }>{ u.name }</option>) }</optgroup> }
                </SelectBox>
            </label>
            <p>{ t(PERM_COPY_KEYS.copyIntro) }</p>
        </Modal>
    );
};

PermissionCopyDialog.propTypes = {
    engine: PropTypes.object.isRequired,
    rows: PropTypes.array.isRequired,
    bindingOf: PropTypes.func.isRequired,
    audience: PropTypes.string.isRequired,
    draft: PropTypes.object.isRequired,
    who: PropTypes.shape({ name: PropTypes.string, type: PropTypes.string }).isRequired,
    /* same-type active users the person may copy from: [{ id, name }] */
    users: PropTypes.array.isRequired,
    currentProfileId: PropTypes.string,
    /* (userId) → Promise<grants | null> */
    loadUserGrants: PropTypes.func.isRequired,
    onApply: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default PermissionCopyDialog;
