import React, { useCallback, useContext } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import DateInput from "../../../../components/ui/DateInput";
import translation from "../../../../utils/translation";
import { CR_FX_OPTS } from "../contractConstants";

/**
 * The prototype fx-* field kit (fxSection / fxGroup / fxGrid / fxField / fxTable / fxTick / fxBlank / fxSegInline): every
 * control reads and writes ONE key of the canonical Forms model through FormsContext { model, set, readOnly }.
 * `na` dims and disables a control the current answers make inapplicable; `readOnly` (no Forms — Edit) disables everything.
 */
export const FormsContext = React.createContext({ model: {}, set: () => {}, readOnly: true, lookups: {} });
export const useForms = () => useContext(FormsContext);

export const optionsOf = (name) => (CR_FX_OPTS[name] || []).map(([value, key, zh]) => ({ value, label: translation(key), zh }));
const cx = (...a) => a.filter(Boolean).join(" ");
const fid = (k) => `fx-${ k }`;

/* ---- layout ---- */
export const FxSection = ({ num, title, zh, sub, na, plain, children }) => (
    <section className={ cx("fx-sec", na && "fx-sec-na", plain && "fx-sec-plain") }>
        <div className="fx-sec-head">
            { num && <span className="fx-sec-num">{ num }</span> }
            <span className="fx-sec-title">{ zh && <span className="fx-zh">{ zh } </span> }{ title }</span>
            { sub && <span className="fx-sec-sub">{ sub }</span> }
        </div>
        <div className="fx-sec-body">{ children }</div>
    </section>
);
FxSection.propTypes = { num: PropTypes.node, title: PropTypes.node, zh: PropTypes.node, sub: PropTypes.node, na: PropTypes.bool, plain: PropTypes.bool, children: PropTypes.node };

export const FxGroup = ({ num, title, zh, sub, na, children }) => (
    <div className={ cx("fx-group", na && "fx-na fx-na-group") }>
        <div className="fx-group-title">{ num && <span>{ num }</span> }{ zh && <span className="fx-zh">{ zh }</span> }<span>{ title }</span>{ sub && <span className="fx-group-sub">{ sub }</span> }</div>
        { children }
    </div>
);
FxGroup.propTypes = { num: PropTypes.node, title: PropTypes.node, zh: PropTypes.node, sub: PropTypes.node, na: PropTypes.bool, children: PropTypes.node };

export const FxGrid = ({ children }) => <div className="fx-grid">{ children }</div>;
FxGrid.propTypes = { children: PropTypes.node };
export const FxSubtitle = ({ children }) => <div className="fx-subtitle">{ children }</div>;
FxSubtitle.propTypes = { children: PropTypes.node };
export const FxPara = ({ indent, children }) => <p className={ cx("fx-legal", indent && "fx-indent") }>{ children }</p>;
FxPara.propTypes = { indent: PropTypes.bool, children: PropTypes.node };
export const FxItem = ({ num, note, na, children }) => (
    <div className={ cx("fx-item", note && "fx-item-note", na && "fx-na") }>{ num && <span className="fx-item-num">{ num }</span> }<div className="fx-item-body">{ children }</div></div>
);
FxItem.propTypes = { num: PropTypes.node, note: PropTypes.bool, na: PropTypes.bool, children: PropTypes.node };
export const FxLabel = ({ htmlFor, zh, req, children }) => (
    <label className="fx-lab" htmlFor={ htmlFor }>{ zh && <span className="fx-zh">{ zh } </span> }{ children }{ req && <span className="fx-req">&nbsp;*</span> }</label>
);
FxLabel.propTypes = { htmlFor: PropTypes.string, zh: PropTypes.node, req: PropTypes.bool, children: PropTypes.node };

/* ---- the one field: label + control in a grid cell ---- */
const Seg = ({ k, value, options, disabled, onPick, inline, ariaLabel }) => (
    <div className={ cx("fx-seg", inline && "fx-seg-inline", disabled && "fx-na") } role="radiogroup" aria-label={ ariaLabel }>
        { options.map((o, i) => (
            <button key={ String(o.value) } type="button" role="radio" aria-checked={ value === o.value } disabled={ disabled } data-fid={ `${ fid(k) }-${ i }` } onClick={ () => onPick(o.value) }>{ o.label }</button>
        )) }
    </div>
);
Seg.propTypes = { k: PropTypes.string.isRequired, value: PropTypes.string, options: PropTypes.array.isRequired, disabled: PropTypes.bool, onPick: PropTypes.func.isRequired, inline: PropTypes.bool, ariaLabel: PropTypes.string };

export const FxField = ({ k, label, zh, type = "text", w = "m", opts, options, req, na, note, rows, placeholder, blank = true, maxLength, min, max, value: ro }) => {
    const { model, set, readOnly, lookups } = useForms();
    const disabled = readOnly || Boolean(na);
    const value = model[k] ?? "";
    const list = options || (opts ? (lookups[opts] || optionsOf(opts)) : []);
    const onText = useCallback((e) => set(k, e.target.value), [set, k]);
    let control;
    if (type === "ro") control = <div className="fx-ro" data-fxro={ k }>{ ro || value ? (ro || value) : <span className="fx-empty">—</span> }</div>;
    else if (type === "seg") control = <Seg k={ k } value={ value } options={ list } disabled={ disabled } onPick={ (v) => set(k, v) } ariaLabel={ label } />;
    else if (type === "radio") control = (
        <div className="fx-radios" role="radiogroup" aria-label={ label }>
            { list.map((o, i) => (
                <label key={ String(o.value) } className="fx-radio">
                    <input type="radio" name={ fid(k) } value={ o.value } checked={ value === o.value } disabled={ disabled } data-fid={ `${ fid(k) }-${ i }` } onChange={ () => set(k, o.value) } />
                    { o.zh && <span className="fx-zh">{ o.zh }</span> }{ o.label }
                </label>
            )) }
        </div>
    );
    else if (type === "select") control = (
        <select id={ fid(k) } className={ cx("fx-in", disabled && "fx-na") } value={ value } disabled={ disabled } data-fid={ fid(k) } onChange={ onText }>
            { blank && <option value="">{ translation("key_fx_select_blank") }</option> }
            { list.map((o) => <option key={ String(o.value) } value={ o.value }>{ o.label }</option>) }
        </select>
    );
    else if (type === "textarea") control = <textarea id={ fid(k) } className={ cx("fx-in", disabled && "fx-na") } rows={ rows || 2 } value={ value } disabled={ disabled } maxLength={ maxLength } placeholder={ placeholder } data-fid={ fid(k) } onChange={ onText } />;
    else if (type === "date") control = <DateInput id={ fid(k) } value={ value } min={ min } max={ max } disabled={ disabled } className={ cx("fx-datewrap", disabled && "fx-na") } onChange={ (v) => set(k, v) } />;
    else if (type === "money") control = (
        <div className={ cx("fx-money", disabled && "fx-na") }><span className="fx-cur">HK$</span>
            <input id={ fid(k) } className="fx-in" inputMode="decimal" value={ value } disabled={ disabled } maxLength={ maxLength || 12 } data-fid={ fid(k) } onChange={ onText } />
        </div>
    );
    else control = (
        <input id={ fid(k) } type="text" className={ cx("fx-in", type === "mono" && "mono", disabled && "fx-na") } inputMode={ type === "num" ? "numeric" : undefined } value={ value }
            disabled={ disabled } maxLength={ maxLength } placeholder={ placeholder } data-fid={ fid(k) } onChange={ onText } />
    );
    return (
        <div className={ cx("fx-cell", `fx-w-${ w }`, na && "fx-na") }>
            { label && <FxLabel htmlFor={ type === "seg" || type === "radio" || type === "ro" ? undefined : fid(k) } zh={ zh } req={ req }>{ label }</FxLabel> }
            { control }
            { note && <div className="fx-note">{ note }</div> }
        </div>
    );
};
FxField.propTypes = {
    k: PropTypes.string.isRequired, label: PropTypes.node, zh: PropTypes.node, type: PropTypes.oneOf(["text", "mono", "date", "select", "radio", "seg", "textarea", "num", "money", "ro"]),
    w: PropTypes.oneOf(["xs", "s", "m", "l", "xl", "full"]), opts: PropTypes.string, options: PropTypes.array, req: PropTypes.bool, na: PropTypes.bool, note: PropTypes.node,
    rows: PropTypes.number, placeholder: PropTypes.string, blank: PropTypes.bool, maxLength: PropTypes.number, min: PropTypes.string, max: PropTypes.string, value: PropTypes.node,
};

/* ---- inline blank inside legal text (fxBlank) ---- */
export const FxBlank = ({ k, size = "m", type = "text", na, label }) => {
    const { model, set, readOnly } = useForms();
    const disabled = readOnly || Boolean(na);
    const value = model[k] ?? "";
    if (type === "date") return <DateInput id={ fid(k) } value={ value } disabled={ disabled } className={ cx("fx-blank fx-datewrap fx-datewrap-sm", disabled && "fx-na") } onChange={ (v) => set(k, v) } />;
    return <input type="text" className={ cx("fx-in fx-in-inline", `fx-in-${ size }`, type === "mono" && "mono", disabled && "fx-na") } aria-label={ label } value={ value } disabled={ disabled } data-fid={ fid(k) } onChange={ (e) => set(k, e.target.value) } />;
};
FxBlank.propTypes = { k: PropTypes.string.isRequired, size: PropTypes.oneOf(["xs", "s", "m", "l", "xl"]), type: PropTypes.oneOf(["text", "mono", "date"]), na: PropTypes.bool, label: PropTypes.string };

export const FxRo = ({ value, inline }) => <span className={ cx("fx-ro", inline && "fx-ro-inline") }>{ value || <span className="fx-empty">—</span> }</span>;
FxRo.propTypes = { value: PropTypes.node, inline: PropTypes.bool };

/* ---- a tick row bound to one value of a key (fxTick): radio semantics, bilingual body ---- */
export const FxTick = ({ k, value, zh, na, children, derived }) => {
    const { model, set, readOnly } = useForms();
    const on = model[k] === value;
    if (derived) return <div className={ cx("fx-tick fx-derived", na && "fx-na") }><span className="fx-tickbox" role="checkbox" aria-checked={ on } /><div className="fx-tick-body">{ zh && <span className="fx-zh">{ zh }</span> }{ children }</div></div>;
    return (
        <label className={ cx("fx-tick", na && "fx-na") }>
            <input type="radio" name={ fid(k) } value={ value } checked={ on } disabled={ readOnly || Boolean(na) } data-fid={ `${ fid(k) }-${ value }` } onChange={ () => set(k, value) } />
            <div className="fx-tick-body">{ zh && <span className="fx-zh">{ zh }</span> }{ children }</div>
        </label>
    );
};
FxTick.propTypes = { k: PropTypes.string.isRequired, value: PropTypes.string, zh: PropTypes.node, na: PropTypes.bool, children: PropTypes.node, derived: PropTypes.bool };

/* ---- a yes / no checkbox on one key (fxCheck): unticked strikes the text (ID 988A undertaking (ii)) ---- */
export const FxCheck = ({ k, yes, no, children }) => {
    const { model, set, readOnly } = useForms();
    const on = model[k] !== no;
    return (
        <label className="fx-tick fx-item-delete">
            <input type="checkbox" checked={ on } disabled={ readOnly } data-fid={ fid(k) } onChange={ () => set(k, on ? no : yes) } />
            <div className={ cx("fx-tick-body", !on && "fx-struck") }>{ children }</div>
        </label>
    );
};
FxCheck.propTypes = { k: PropTypes.string.isRequired, yes: PropTypes.string.isRequired, no: PropTypes.string.isRequired, children: PropTypes.node };

export const FxSegInline = ({ k, opts, na, ariaLabel }) => {
    const { model, set, readOnly } = useForms();
    return <Seg k={ k } inline value={ model[k] ?? "" } options={ optionsOf(opts) } disabled={ readOnly || Boolean(na) } onPick={ (v) => set(k, v) } ariaLabel={ ariaLabel } />;
};
FxSegInline.propTypes = { k: PropTypes.string.isRequired, opts: PropTypes.string.isRequired, na: PropTypes.bool, ariaLabel: PropTypes.string };

/* ---- repeating rows (fxTable): columns [{ key, label, zh, width, type, placeholder }], add / remove ---- */
export const FxTable = ({ k, columns, blank, addLabel, emptyLabel, na }) => {   /* column widths live in contract-forms.css per data-fx-table */
    const { model, set, readOnly } = useForms();
    const rows = Array.isArray(model[k]) ? model[k] : [];
    const disabled = readOnly || Boolean(na);
    const update = (i, col, value) => set(k, rows.map((r, j) => (j === i ? { ...r, [col]: value } : r)));
    const remove = (i) => set(k, rows.filter((_, j) => j !== i));
    return (
        <div className={ cx("fx-tablewrap", na && "fx-na") }>
            <table className="fx-table" data-fx-table={ k }>
                <thead><tr>{ columns.map((c) => <th key={ c.key }>{ c.zh && <span className="fx-zh">{ c.zh }</span> }{ c.label }</th>) }{ !readOnly && <th className="fx-th-act" aria-label={ translation("key_actions") } /> }</tr></thead>
                <tbody>
                    { rows.length === 0 && <tr className="fx-tr-empty"><td colSpan={ columns.length + (readOnly ? 0 : 1) }>{ emptyLabel }</td></tr> }
                    { rows.map((r, i) => (
                        <tr key={ r.id ? `id-${ r.id }` : `new-${ i }` }>
                            { columns.map((c) => (
                                <td key={ c.key }>
                                    { c.type === "date"
                                        ? <DateInput id={ `${ fid(k) }-${ i }-${ c.key }` } value={ r[c.key] || "" } disabled={ disabled } className="fx-datewrap fx-datewrap-sm" onChange={ (v) => update(i, c.key, v) } />
                                        : <input type="text" className={ cx("fx-in fx-in-sm", c.type === "mono" && "mono") } aria-label={ c.label } value={ r[c.key] ?? "" } disabled={ disabled } placeholder={ c.placeholder } maxLength={ c.maxLength } inputMode={ c.type === "num" ? "numeric" : undefined } data-fid={ `${ fid(k) }-${ i }-${ c.key }` } onChange={ (e) => update(i, c.key, e.target.value) } /> }
                                </td>
                            )) }
                            { !readOnly && <td className="fx-td-act"><button type="button" className="fx-icon" aria-label={ translation("key_fx_remove_row") } disabled={ disabled } onClick={ () => remove(i) }><Icon name="trash" size={ 13 } strokeWidth={ 1.6 } /></button></td> }
                        </tr>
                    )) }
                </tbody>
            </table>
            { !readOnly && <button type="button" className="g1-btn fx-addrow" disabled={ disabled } onClick={ () => set(k, [...rows, blank()]) }><Icon name="plus" size={ 11 } strokeWidth={ 1.8 } />{ addLabel }</button> }
        </div>
    );
};
FxTable.propTypes = { k: PropTypes.string.isRequired, columns: PropTypes.array.isRequired, blank: PropTypes.func.isRequired, addLabel: PropTypes.node, emptyLabel: PropTypes.node, na: PropTypes.bool };
