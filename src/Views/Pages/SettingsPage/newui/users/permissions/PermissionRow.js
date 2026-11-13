import React from "react";
import PropTypes from "prop-types";
import { featureLabel, idSafe, PERM_LEVELS, tx } from "./permissionCatalogue";
import { ariaName, levelLabel, tagList } from "./permissionStructure";

/*
 * One feature row of a group: a single checkbox beside its label, a level as three radios (No access · Restricted ·
 * Full access — Shubham, 22 Oct: no dropdowns), an option list, a wide list of actions, or aligned action columns
 * (View · Edit · Send Template · Change Status). Dependency notes render around it.
 * All decisions (raw value, blocked, locked, floor) come from the engine; nothing is auto-ticked or cleared here.
 */
const Tag = ({ id, list }) => (list.length ? <span className="upm-tag" id={ id }>{ list.join(" · ") }</span> : null);
Tag.propTypes = { id: PropTypes.string.isRequired, list: PropTypes.arrayOf(PropTypes.string).isRequired };

const PermissionRow = ({ feature, group, headed, engine, draft, audience, notes, placed, onChange, readOnly = false }) => {
    const first = feature.items[0];
    const lblId = `upm-lbl-${ idSafe(first.key) }`;
    const name = featureLabel(feature.name, first.r);
    const allOff = readOnly || feature.items.every((i) => i.r.held || !i.storable || engine.blocking(draft, i.r, i.context, audience));
    const labelClass = `upm-row-l${ headed && feature.multi && group.lone ? " sr" : "" }`;

    const tagsOf = (item) => tagList({ engine, draft, item, audience });
    const tagId = (item) => `upm-tag-${ idSafe(item.key) }`;
    const describedBy = (item, tags) => [notes.describe.get(item.key), tags.length ? tagId(item) : ""].filter(Boolean).join(" ") || undefined;

    /* `sharedTagId`: an option list whose items all carry the same tags shows the tag once (under the list), not per option */
    const checkbox = (item, withText, sharedTagId = null) => {
        const { r, context: c, key } = item;
        const value = engine.raw(draft, r.id, c);
        const isLocked = engine.locked(r, c);
        const off = readOnly || r.held || isLocked || !item.storable || Boolean(engine.blocking(draft, r, c, audience));
        const tags = tagsOf(item);
        const input = (
            <input type="checkbox" id={ `upm-perm-${ idSafe(key) }` } aria-label={ ariaName(item) } aria-describedby={ sharedTagId || describedBy(item, tags) }
                checked={ Boolean(value) || isLocked } disabled={ off } onChange={ (e) => onChange(key, e.target.checked) } />
        );
        const dim = r.held || !item.storable || Boolean(engine.blocking(draft, r, c, audience));
        const tag = sharedTagId ? null : <Tag id={ tagId(item) } list={ tags } />;
        if (!withText) return <>{ input }{ tag }</>;
        return <><label className={ `upm-act${ dim ? " off" : "" }` }>{ input }<span>{ tx(item.action) }</span></label>{ tag }</>;
    };
    /* the one tag list every item of this row shares (e.g. "Awaiting backend support" on a whole option list), or null */
    const sharedTags = () => {
        const lists = feature.items.map(tagsOf);
        return lists.length > 1 && lists[0].length && lists.every((l) => l.join("|") === lists[0].join("|")) ? lists[0] : null;
    };
    /* a level reads as one radio group; an owner's floor keeps No access unavailable, the shown value never drops below Restricted */
    const levelRadios = (item) => {
        const { r, context: c, key } = item;
        const value = engine.raw(draft, r.id, c);
        const min = engine.floor(r, c);
        const off = readOnly || r.held || !item.storable || Boolean(engine.blocking(draft, r, c, audience));
        const shown = min && value === "Off" ? "Restricted" : value;
        const tags = tagsOf(item);
        const groupName = `upm-perm-${ idSafe(key) }`;
        return (
            <>
                <div className="upm-lvl" role="radiogroup" aria-label={ ariaName(item) } aria-describedby={ describedBy(item, tags) }>
                    { PERM_LEVELS.map((o) => (
                        <label key={ o } className={ `upm-act${ off ? " off" : "" }` }>
                            <input type="radio" name={ groupName } id={ `${ groupName }-${ o }` } value={ o } checked={ shown === o } disabled={ off || (o === "Off" && min) } onChange={ () => onChange(key, o) } />
                            <span>{ levelLabel(o) }</span>
                        </label>
                    )) }
                </div>
                <Tag id={ tagId(item) } list={ tags } />
            </>
        );
    };

    let inner;
    let kind;
    if (!feature.multi && first.r.type === "level") {
        kind = "upm-row-level";
        inner = (
            <>
                <span className={ labelClass } id={ lblId }>{ name }</span>
                <div className="upm-cell">{ levelRadios(first) }</div>
            </>
        );
    } else if (!feature.multi) {
        kind = "upm-row-check";
        inner = (
            <>
                <label className={ labelClass } htmlFor={ `upm-perm-${ idSafe(first.key) }` }>{ name }</label>
                <div className="upm-cell">{ checkbox(first, false) }</div>
            </>
        );
    } else if (feature.option || feature.wide) {
        kind = feature.option ? "upm-row-opts" : "upm-row-wide";
        const common = sharedTags();
        const sharedId = common ? `upm-tag-${ idSafe(first.key) }-all` : null;
        inner = (
            <>
                <span className={ labelClass } id={ lblId }>{ name }</span>
                <div className={ feature.option ? "upm-opts" : "upm-wrap" } role="group" aria-labelledby={ lblId }>
                    { feature.items.map((i) => <React.Fragment key={ i.key }>{ checkbox(i, true, sharedId) }</React.Fragment>) }
                    { common && <Tag id={ sharedId } list={ common } /> }
                </div>
            </>
        );
    } else {
        kind = "upm-row-acts";
        const last = Math.max(...feature.items.map((i) => group.columns.indexOf(i.action)));
        inner = (
            <>
                <span className={ labelClass } id={ lblId }>{ name }</span>
                { group.columns.slice(0, last + 1).map((col, ci) => {
                    const item = feature.items.find((x) => x.action === col);
                    return item
                        ? <span key={ col } className="upm-slot" data-c={ ci + 1 }>{ checkbox(item, true) }</span>
                        : <span key={ col } className="upm-slot upm-slot-gap" aria-hidden="true" />;
                }) }
            </>
        );
    }
    const before = placed.before.get(feature.rowId) || [];
    const after = placed.after.get(feature.rowId) || [];
    return (
        <>
            { before.map((n) => <p key={ n.id } className="upm-note upm-note-before" id={ n.id }>{ n.text }</p>) }
            <div className={ `upm-row ${ feature.multi ? "upm-row-multi" : "upm-row-single" } ${ kind }${ allOff ? " off" : "" }` } data-row={ feature.rowId }
                role={ kind === "upm-row-acts" ? "group" : undefined } aria-labelledby={ kind === "upm-row-acts" ? lblId : undefined }>
                { inner }
            </div>
            { after.map((n) => <p key={ n.id } className="upm-note upm-note-after" id={ n.id }>{ n.text }</p>) }
        </>
    );
};

PermissionRow.propTypes = {
    feature: PropTypes.object.isRequired,
    group: PropTypes.object.isRequired,
    headed: PropTypes.bool,
    engine: PropTypes.object.isRequired,
    draft: PropTypes.object.isRequired,
    audience: PropTypes.string.isRequired,
    notes: PropTypes.object.isRequired,
    placed: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    readOnly: PropTypes.bool,   /* the whole module is read-only for this actor (Ownership eligibility without the authority, backend 267) */
};

export default React.memo(PermissionRow);
