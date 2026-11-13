import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../../components/Icon/Icon";
import Btn from "../../../../../../components/ui/Btn";
import { groupTitle, PERM_AUDIENCE, PERM_COPY_KEYS, PERM_DEFAULT_MODULE, PERM_SCROLL_TOP_PX, PERM_SEARCH_ANNOUNCE_MS, PERM_ASSIGNMENT_MODULE, sectionTitle, t, tx, visibleModules } from "./permissionCatalogue";
import { buildStructure, computeNotes, filterStructure, hasLevels, isCommunications, placeNotes } from "./permissionStructure";
import PermissionRow from "./PermissionRow";
import PermissionCopyDialog from "./PermissionCopyDialog";
import "./UserPermissionsEditor.css";

/*
 * Settings → People → Users → Permissions (client preview, 22 Oct 2026) embedded in tab 4 of Add / Edit User:
 * identity line + Copy permissions, the module list (a select below 1100px), the module title with "Find a permission",
 * one card per ownership section with every section visible, dependency notes and tags. Draft state lives in the
 * wizard (useUserForm); this component renders it and reports changes.
 */
const UserPermissionsEditor = ({ engine, rows, bindingOf, audience, draft, saved, who, onChange, onApplyCopy, copyUsers, currentProfileId, loadUserGrants, alert, onHistory, readOnlyModules = [], readOnlyNote }) => {
    const [moduleId, setModuleId] = useState(PERM_DEFAULT_MODULE);
    const [search, setSearch] = useState("");
    const [copyOpen, setCopyOpen] = useState(false);
    const [announce, setAnnounce] = useState("");
    const announceTimer = useRef(0);
    const panelRef = useRef(null);
    const modules = useMemo(() => visibleModules(audience), [audience]);

    useEffect(() => { if (!modules.some((m) => m.id === moduleId)) setModuleId(modules[0]?.id || PERM_DEFAULT_MODULE); }, [modules, moduleId]);

    const structure = useMemo(() => (isCommunications(moduleId) ? [] : buildStructure({ engine, rows, moduleId, audience, bindingOf })), [engine, rows, moduleId, audience, bindingOf]);
    const notes = useMemo(() => computeNotes({ engine, draft, struct: structure, moduleId, audience }), [engine, draft, structure, moduleId, audience]);
    const shown = useMemo(() => filterStructure(structure, search, moduleId), [structure, search, moduleId]);
    const visibleRows = useMemo(() => (search.trim() ? new Set(shown.flatMap((s) => s.groups.flatMap((g) => g.features.map((f) => f.rowId)))) : null), [shown, search]);
    const placed = useMemo(() => placeNotes(notes, visibleRows), [notes, visibleRows]);
    const dirtyModules = useMemo(() => new Set(engine.diff(saved, draft, audience).filter((d) => d.before !== d.after).map((d) => engine.index[d.id].module)), [engine, saved, draft, audience]);

    const moduleReadOnly = readOnlyModules.includes(moduleId);
    const setPermission = useCallback((key, value) => {
        const [id, c] = key.split("|");
        const r = engine.index[id];
        if (!r || !engine.supported(r, audience) || !engine.contexts(r, audience).includes(c) || readOnlyModules.includes(r.module)) return;
        if (r.held || engine.locked(r, c) || engine.blocking(draft, r, c, audience)) return;
        if (r.type === "level" ? (engine.floor(r, c) && value === "Off") : typeof value !== "boolean") return;
        onChange({ ...draft, [key]: value });
    }, [engine, audience, draft, onChange, readOnlyModules]);

    /* prototype selectModule → scrollTo(0,0): the editor sits under the account fields here, so a module switch brings the
       editor's top back under the topbar only when the person has scrolled past it (scroll-margin-top on the panel) */
    const selectModule = (id) => {
        setModuleId(id);
        setSearch("");
        const top = panelRef.current?.getBoundingClientRect().top;
        if (top != null && top < PERM_SCROLL_TOP_PX) panelRef.current.scrollIntoView({ block: "start" });
    };
    const onSearch = (value) => {
        setSearch(value);
        window.clearTimeout(announceTimer.current);
        announceTimer.current = window.setTimeout(() => {
            const q = value.trim();
            if (q) setAnnounce(t(shown.length ? PERM_COPY_KEYS.showingMatching : PERM_COPY_KEYS.noMatching, { q }));
        }, PERM_SEARCH_ANNOUNCE_MS);
    };
    useEffect(() => () => window.clearTimeout(announceTimer.current), []);

    const q = search.trim();
    const moduleLabel = tx(modules.find((m) => m.id === moduleId)?.name || "");
    const communicationsText = audience === PERM_AUDIENCE.PARTNER ? t(PERM_COPY_KEYS.communicationsPartner) : t(PERM_COPY_KEYS.communicationsInternal);

    return (
        <div className="upm upm-panel" data-mc-module="user-permissions" ref={ panelRef }>
            { alert && <p className="upm-alert" role="alert">{ alert }</p> }
            <div className="upm-layout">
                <div className="upm-navcol">
                    <nav className="upm-nav" aria-label={ t(PERM_COPY_KEYS.area) }>
                        <ul>
                            { modules.map((m) => (
                                <li key={ m.id }>
                                    <button type="button" aria-current={ m.id === moduleId ? "page" : undefined } onClick={ () => selectModule(m.id) }>
                                        <span>{ tx(m.name) }</span>
                                        { dirtyModules.has(m.id) && <><span className="unsaved" aria-hidden="true" /><span className="sr">, { t(PERM_COPY_KEYS.unsavedSuffix) }</span></> }
                                    </button>
                                </li>
                            )) }
                        </ul>
                    </nav>
                    <label className="upm-modsel">
                        <span>{ t(PERM_COPY_KEYS.area) }</span>
                        <select value={ moduleId } onChange={ (e) => selectModule(e.target.value) }>
                            { modules.map((m) => <option key={ m.id } value={ m.id }>{ tx(m.name) }{ dirtyModules.has(m.id) ? ` • ${ t(PERM_COPY_KEYS.unsaved).toLowerCase() }` : "" }</option>) }
                        </select>
                    </label>
                </div>
                <section className="upm-content" aria-labelledby="upm-module-title">
                    <div className="upm-modhead">
                        <h3 id="upm-module-title">{ moduleLabel }</h3>
                        <div className="upm-modtools">
                            { !isCommunications(moduleId) && (
                                <div className="upm-search">
                                    <Icon name="search" size={ 15 } />
                                    <label className="sr" htmlFor="upm-search">{ t(PERM_COPY_KEYS.findIn, { module: moduleLabel }) }</label>
                                    <input id="upm-search" type="search" placeholder={ t(PERM_COPY_KEYS.find) } autoComplete="off" value={ search } onChange={ (e) => onSearch(e.target.value) } />
                                    { search && <button type="button" className="clear" aria-label={ t(PERM_COPY_KEYS.clearSearch) } onClick={ () => setSearch("") }><Icon name="x" size={ 12 } /></button> }
                                </div>
                            ) }
                            { onHistory && <Btn variant="secondary" type="button" onClick={ onHistory }><Icon name="list" size={ 13 } />{ t(PERM_COPY_KEYS.history) }</Btn> }
                            <Btn variant="secondary" type="button" onClick={ () => setCopyOpen(true) }><Icon name="copy" size={ 13 } />{ t(PERM_COPY_KEYS.copy) }</Btn>
                        </div>
                    </div>
                    { hasLevels(structure) && <p className="upm-help">{ t(PERM_COPY_KEYS.levelsHelp) }</p> }
                    { moduleReadOnly && readOnlyNote && <p className="upm-help" role="note">{ readOnlyNote }</p> }
                    { isCommunications(moduleId) && <div className="upm-empty"><h4>{ t(PERM_COPY_KEYS.communicationsTitle) }</h4><p>{ communicationsText }</p></div> }
                    { !isCommunications(moduleId) && q && (
                        <div className="upm-results"><span>{ t(shown.length ? PERM_COPY_KEYS.showingMatching : PERM_COPY_KEYS.noMatching, { q }) }</span><button type="button" className="upm-linkbtn" onClick={ () => setSearch("") }>{ t(PERM_COPY_KEYS.clearSearch) }</button></div>
                    ) }
                    { !isCommunications(moduleId) && shown.length === 0 && q && <div className="upm-empty"><p>{ t(PERM_COPY_KEYS.tryAnotherWord, { module: moduleLabel }) }</p></div> }
                    { shown.map((sec) => {
                        const headed = (structure.find((s) => s.id === sec.id)?.groups.length || 0) > 1;
                        return (
                            <section key={ sec.id } className={ `upm-sec${ moduleId === PERM_ASSIGNMENT_MODULE ? " wide" : "" }` } data-section={ sec.id } aria-labelledby={ `upm-sec-${ sec.id }` }>
                                <div className="upm-sec-head"><h4 id={ `upm-sec-${ sec.id }` }>{ sectionTitle(sec.id, moduleId) }</h4></div>
                                { sec.groups.map((g) => (
                                    <div key={ g.name } className="upm-grp" data-group={ `${ sec.id }::${ g.name }` } data-cols={ g.columns.length ? Math.min(4, g.columns.length) : undefined }>
                                        { headed && <h5 className="upm-grp-h">{ groupTitle(g.name, sec.id) }</h5> }
                                        { g.features.map((f) => <PermissionRow key={ f.rowId } feature={ f } group={ g } headed={ headed } engine={ engine } draft={ draft } audience={ audience } notes={ notes } placed={ placed } onChange={ setPermission } readOnly={ moduleReadOnly } />) }
                                    </div>
                                )) }
                            </section>
                        );
                    }) }
                </section>
            </div>
            <div className="sr" role="status" aria-live="polite">{ announce }</div>
            { copyOpen && (
                <PermissionCopyDialog engine={ engine } rows={ rows } bindingOf={ bindingOf } audience={ audience } draft={ draft } who={ who } users={ copyUsers } currentProfileId={ currentProfileId }
                    loadUserGrants={ loadUserGrants } onApply={ onApplyCopy } onClose={ () => setCopyOpen(false) } />
            ) }
        </div>
    );
};

UserPermissionsEditor.propTypes = {
    engine: PropTypes.object.isRequired,
    rows: PropTypes.array.isRequired,
    bindingOf: PropTypes.func.isRequired,
    audience: PropTypes.string.isRequired,
    draft: PropTypes.object.isRequired,
    saved: PropTypes.object.isRequired,
    who: PropTypes.shape({ name: PropTypes.string, initials: PropTypes.string, type: PropTypes.string, org: PropTypes.string }).isRequired,
    onChange: PropTypes.func.isRequired,
    onApplyCopy: PropTypes.func.isRequired,
    copyUsers: PropTypes.array.isRequired,
    currentProfileId: PropTypes.string,
    loadUserGrants: PropTypes.func.isRequired,
    alert: PropTypes.string,
    onHistory: PropTypes.func,                    /* opens the change-history drawer (shown only when the actor may view it) */
    readOnlyModules: PropTypes.arrayOf(PropTypes.string),
    readOnlyNote: PropTypes.string,
};

export default UserPermissionsEditor;
