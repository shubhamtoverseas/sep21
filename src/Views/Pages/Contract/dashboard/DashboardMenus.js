import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import translation from "../../../../utils/translation";
import PopMenu from "./PopMenu";
import { columnLabel, compactToken, isHideable, priorityFor } from "./contractDashboardUtils";
import {
    CD_ASSISTANT_UNASSIGNED, CD_OWNER_FILTER_LABEL_KEYS, CD_OWNER_HIDE_BLOCKED_KEYS, CD_OWNER_REGISTER, CD_SORT_DIR, CD_SORT_MODE, CD_STAGE,
    CD_XV_BUCKET_LABEL_KEYS,
} from "../contractConstants";

const Tick = ({ size = 11, strokeWidth = 2.2 }) => <Icon name="check" size={ size } strokeWidth={ strokeWidth } />;
Tick.propTypes = { size: PropTypes.number, strokeWidth: PropTypes.number };

const RadioItem = ({ on, label, onPick }) => (
    <button type="button" className="item" role="menuitemradio" aria-checked={ on } onClick={ onPick }>
        <span className="tick">{ on && <Tick /> }</span>{ label }
    </button>
);
RadioItem.propTypes = { on: PropTypes.bool.isRequired, label: PropTypes.node.isRequired, onPick: PropTypes.func.isRequired };

/* ---- CS Owner / CS Assistant header filter (checkbox multi-select; Inactive tag; italic Unassigned; Clear footer) ---- */
export const OwnerFilterMenu = ({ anchor, register, options, selected, hasUnassigned, onToggle, onClear, onClose }) => {
    const items = [...options];
    if (hasUnassigned) items.push({ id: CD_ASSISTANT_UNASSIGNED, name: translation("key_unassigned"), inactive: false, unassigned: true });
    /* a still-selected person the facet no longer offers stays visible until cleared */
    selected.forEach((id) => {
        if (!items.some((o) => String(o.id) === String(id))) items.push({ id, name: String(id) === CD_ASSISTANT_UNASSIGNED ? translation("key_unassigned") : String(id), inactive: false, unassigned: String(id) === CD_ASSISTANT_UNASSIGNED });
    });
    return (
        <PopMenu anchor={ anchor } onClose={ onClose } ariaLabel={ translation(CD_OWNER_FILTER_LABEL_KEYS[register]) }>
            { items.map((o) => {
                const on = selected.includes(String(o.id));
                return (
                    <button key={ String(o.id) } type="button" className="item" role="menuitemcheckbox" aria-checked={ on } onClick={ () => onToggle(String(o.id)) }>
                        <span className={ `box${ on ? " on" : "" }` }><Tick size={ 10 } strokeWidth={ 2.6 } /></span>
                        <span className={ `csnm${ o.unassigned ? " unasn" : "" }` }>{ o.name }</span>
                        { o.inactive && <span className="cstag">{ translation("key_inactive") }</span> }
                    </button>
                );
            }) }
            <div className="mfoot"><button type="button" onClick={ onClear }>{ translation("key_clear") }</button></div>
        </PopMenu>
    );
};
OwnerFilterMenu.propTypes = {
    anchor: PropTypes.instanceOf(Element),
    register: PropTypes.oneOf(Object.values(CD_OWNER_REGISTER)).isRequired,
    options: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), name: PropTypes.string, inactive: PropTypes.bool })).isRequired,
    selected: PropTypes.arrayOf(PropTypes.string).isRequired,
    hasUnassigned: PropTypes.bool,
    onToggle: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

/* ---- Columns chooser ("Select fields to display"): locked identity columns, filter-active block, Clear footer ---- */
export const ColumnsMenu = ({ anchor, columns, hidden, blockedFilters, onToggle, onReset, onClose }) => (
    <PopMenu anchor={ anchor } onClose={ onClose } className="colsmenu">
        <div className="colslabel">{ translation("key_select_fields_to_display") }</div>
        { columns.map((column) => {
            const on = !hidden[column.key];
            const lock = !isHideable(column.key);
            const blockedBy = column.ownerFilter && on && blockedFilters.includes(column.ownerFilter) ? column.ownerFilter : null;
            const hint = lock ? translation("key_always_shown") : (blockedBy ? translation(CD_OWNER_HIDE_BLOCKED_KEYS[blockedBy]) : "");
            const disabled = lock || Boolean(blockedBy);
            return (
                <button
                    key={ column.key }
                    type="button"
                    className={ `item colitem${ on ? " checked" : "" }` }
                    aria-pressed={ on }
                    aria-disabled={ disabled ? "true" : undefined }
                    title={ blockedBy ? hint : undefined }
                    onClick={ () => !disabled && onToggle(column.key) }
                >
                    <span className="ico">{ on && <Tick size={ 14 } strokeWidth={ 1.6 } /> }</span>
                    <span>{ columnLabel(column) }</span>
                    { hint && <span className="lockhint">{ hint }</span> }
                </button>
            );
        }) }
        <div className="mfoot"><button type="button" onClick={ onReset }>{ translation("key_clear") }</button></div>
    </PopMenu>
);
ColumnsMenu.propTypes = {
    anchor: PropTypes.instanceOf(Element),
    columns: PropTypes.arrayOf(PropTypes.object).isRequired,
    hidden: PropTypes.object.isRequired,
    blockedFilters: PropTypes.arrayOf(PropTypes.string).isRequired,
    onToggle: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

/* ---- ordinary column sort menu: two directions + Clear sort ---- */
export const ColumnSortMenu = ({ anchor, column, sort, onPick, onClose }) => {
    const active = sort.col === column.key && sort.mode === CD_SORT_MODE.DIR;
    const [ascKey, descKey] = column.dirKeys;
    return (
        <PopMenu anchor={ anchor } onClose={ onClose }>
            <RadioItem on={ active && sort.dir === CD_SORT_DIR.ASC } label={ translation(ascKey) } onPick={ () => onPick({ col: column.key, mode: CD_SORT_MODE.DIR, dir: CD_SORT_DIR.ASC }) } />
            <RadioItem on={ active && sort.dir === CD_SORT_DIR.DESC } label={ translation(descKey) } onPick={ () => onPick({ col: column.key, mode: CD_SORT_MODE.DIR, dir: CD_SORT_DIR.DESC }) } />
            <div className="msep" aria-hidden="true" />
            <button type="button" className="item" onClick={ () => onPick(null) }><span className="tick" />{ translation("key_clear_sort") }</button>
        </PopMenu>
    );
};
ColumnSortMenu.propTypes = {
    anchor: PropTypes.instanceOf(Element),
    column: PropTypes.object.isRequired,
    sort: PropTypes.object.isRequired,
    onPick: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

/* ---- stage column sort menu: Status priority · Prioritize <status> · Status changed · Terminal date · Clear sort ---- */
export const StageSortMenu = ({ anchor, column, group, sort, onPick, onClose }) => {
    const mine = sort.col === column.key;
    const is = (mode, extra = {}) => mine && sort.mode === mode && Object.keys(extra).every((k) => sort[k] === extra[k]);
    const isExtendVisa = column.key === CD_STAGE.EXTEND_VISA;
    return (
        <PopMenu anchor={ anchor } onClose={ onClose } className="wide">
            <RadioItem on={ is(CD_SORT_MODE.PRIORITY) } label={ translation("key_cd_status_priority") } onPick={ () => onPick({ col: column.key, mode: CD_SORT_MODE.PRIORITY }) } />
            { priorityFor(group, column.key).map((status) => (
                <RadioItem
                    key={ status }
                    on={ is(CD_SORT_MODE.PRIORITIZE, { status }) }
                    label={ isExtendVisa ? translation(CD_XV_BUCKET_LABEL_KEYS[status]) : `${ translation("key_cd_prioritize") } ${ compactToken(status) }` }
                    onPick={ () => onPick({ col: column.key, mode: CD_SORT_MODE.PRIORITIZE, status }) }
                />
            )) }
            <div className="msep" aria-hidden="true" />
            <RadioItem on={ is(CD_SORT_MODE.CHANGED, { dir: CD_SORT_DIR.ASC }) } label={ translation("key_cd_status_changed_oldest_first") } onPick={ () => onPick({ col: column.key, mode: CD_SORT_MODE.CHANGED, dir: CD_SORT_DIR.ASC }) } />
            <RadioItem on={ is(CD_SORT_MODE.CHANGED, { dir: CD_SORT_DIR.DESC }) } label={ translation("key_cd_status_changed_newest_first") } onPick={ () => onPick({ col: column.key, mode: CD_SORT_MODE.CHANGED, dir: CD_SORT_DIR.DESC }) } />
            <RadioItem on={ is(CD_SORT_MODE.TERMINAL, { dir: CD_SORT_DIR.ASC }) } label={ translation("key_cd_terminal_date_oldest_first") } onPick={ () => onPick({ col: column.key, mode: CD_SORT_MODE.TERMINAL, dir: CD_SORT_DIR.ASC }) } />
            <RadioItem on={ is(CD_SORT_MODE.TERMINAL, { dir: CD_SORT_DIR.DESC }) } label={ translation("key_cd_terminal_date_newest_first") } onPick={ () => onPick({ col: column.key, mode: CD_SORT_MODE.TERMINAL, dir: CD_SORT_DIR.DESC }) } />
            <div className="msep" aria-hidden="true" />
            <button type="button" className="item" onClick={ () => onPick(null) }><span className="tick" />{ translation("key_clear_sort") }</button>
        </PopMenu>
    );
};
StageSortMenu.propTypes = {
    anchor: PropTypes.instanceOf(Element),
    column: PropTypes.object.isRequired,
    group: PropTypes.number.isRequired,
    sort: PropTypes.object.isRequired,
    onPick: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};
