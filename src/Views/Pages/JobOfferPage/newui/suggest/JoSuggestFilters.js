import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import useOutsideClick from "../../../../../hooks/useOutsideClick";
import { JO_SUGGEST_COPY, JO_SUGGEST_FIELD_KIND, JO_SUGGEST_FIELDS, JO_SUGGEST_GROUPS } from "../../jobOfferConstants";
import { depOpen, fieldHint, fieldLabel, fieldOptions, fieldVisible, isUnset, multiSummary, toggleMulti } from "./jobOfferSuggestConfig";

const digits = (value) => String(value || '').replace(/\D/g, '').slice(0, 2);

const MultiField = ({ field, value, lists, open, disabled, onOpen, onChange }) => {
    const ref = useRef(null);
    useOutsideClick(ref, () => onOpen(null), open);
    const options = fieldOptions(field, lists);
    const summary = multiSummary(field, value, lists);
    const label = fieldLabel(field);
    return (
        <div ref={ ref } className="mc-sw-selwrap">
            <button
                type="button"
                className={ `mc-sw-ctl multi${ isUnset(field, value) ? ' ph' : '' }` }
                data-sw-pop={ field.k }
                aria-expanded={ open }
                aria-haspopup="true"
                aria-label={ `${ label }, ${ summary }` }
                title={ summary }
                disabled={ disabled }
                onClick={ () => onOpen(open ? null : field.k) }
            >
                <span className="t">{ summary }</span>
                <span className="ic"><Icon name="chev_down" size={ 12 } /></span>
            </button>
            { open && (
                <div className="mc-sw-pop" role="group" aria-label={ label }>
                    { options.length ? options.map((o) => {
                        const on = Array.isArray(value) && value.map(String).includes(String(o.value));
                        return (
                            <button type="button" key={ o.value } className="mc-sw-opt" aria-pressed={ on } onClick={ () => onChange(toggleMulti(value, o.value)) }>
                                <span className="bx" aria-hidden="true" />{ o.label }
                            </button>
                        );
                    }) : <span className="hint">{ JO_SUGGEST_COPY.noOptions }</span> }
                </div>
            ) }
        </div>
    );
};
MultiField.propTypes = { field: PropTypes.object.isRequired, value: PropTypes.array, lists: PropTypes.object.isRequired, open: PropTypes.bool, disabled: PropTypes.bool, onOpen: PropTypes.func.isRequired, onChange: PropTypes.func.isRequired };

/* a field whose gate is closed (`dep`, prototype `off`) is rendered disabled — never hidden, never active */
const SuggestField = ({ field, value, filters, lists, popKey, onPop, onChange }) => {
    const label = fieldLabel(field);
    const off = !depOpen(field, filters);
    let control;
    if (field.kind === JO_SUGGEST_FIELD_KIND.NUMBER) {
        control = <input type="text" className="mc-sw-ctl num" inputMode="numeric" aria-label={ label } value={ value || '' } disabled={ off } onChange={ (e) => onChange(digits(e.target.value)) } />;
    } else if (field.kind === JO_SUGGEST_FIELD_KIND.RANGE) {
        control = (
            <div className="mc-sw-range">
                <input type="text" className="mc-sw-ctl num" inputMode="numeric" aria-label={ `${ label } ${ JO_SUGGEST_COPY.min }` } placeholder={ JO_SUGGEST_COPY.min } value={ value?.min || '' } onChange={ (e) => onChange({ ...value, min: digits(e.target.value) }) } />
                <span className="dash" aria-hidden="true">–</span>
                <input type="text" className="mc-sw-ctl num" inputMode="numeric" aria-label={ `${ label } ${ JO_SUGGEST_COPY.max }` } placeholder={ JO_SUGGEST_COPY.max } value={ value?.max || '' } onChange={ (e) => onChange({ ...value, max: digits(e.target.value) }) } />
            </div>
        );
    } else if (field.kind === JO_SUGGEST_FIELD_KIND.SINGLE) {
        control = (
            <select className="mc-sw-ctl" aria-label={ label } value={ value ?? '' } disabled={ off } onChange={ (e) => onChange(e.target.value) }>
                { fieldOptions(field, lists).map((o) => <option key={ o.value } value={ o.value }>{ o.label }</option>) }
            </select>
        );
    } else {
        control = <MultiField field={ field } value={ value } lists={ lists } open={ popKey === field.k } disabled={ off } onOpen={ onPop } onChange={ onChange } />;
    }
    return (
        <div className={ `mc-sw-fg${ field.wide ? ' w2' : '' }${ off ? ' off' : '' }` } data-sw-field={ field.k }>
            <span className="l" title={ fieldHint(field) }>{ label }</span>
            { control }
        </div>
    );
};
SuggestField.propTypes = { field: PropTypes.object.isRequired, value: PropTypes.any, filters: PropTypes.object.isRequired, lists: PropTypes.object.isRequired, popKey: PropTypes.string, onPop: PropTypes.func.isRequired, onChange: PropTypes.func.isRequired };

const JoSuggestFilters = ({ mode, filters, lists, onChange }) => {
    const rootRef = useRef(null);
    const [popKey, setPopKey] = useState(null);
    const onPop = useCallback((key) => setPopKey(key), []);
    /* Escape closes the open choice list and returns focus to its button; the workspace itself closes on the modal's Escape */
    const onKeyDown = useCallback((event) => {
        if (event.key !== 'Escape' || !popKey) return;
        event.preventDefault();
        const button = rootRef.current?.querySelector(`[data-sw-pop="${ popKey }"]`);
        setPopKey(null);
        button?.focus();
    }, [popKey]);
    return (
        <div ref={ rootRef } className="mc-sw-filters" id="jo-sw-filters" role="group" aria-label={ JO_SUGGEST_COPY.filters } onKeyDown={ onKeyDown }>
            { JO_SUGGEST_GROUPS.filter((g) => !g.scope || g.scope === mode).map((group) => {
                const fields = JO_SUGGEST_FIELDS.filter((f) => f.group === group.id && fieldVisible(f, mode));
                if (!fields.length) return null;
                return (
                    <div className="mc-sw-fgroup" key={ group.id }>
                        <span className="g">{ group.label }</span>
                        <div className="mc-sw-fgrid">
                            { fields.map((field) => (
                                <SuggestField key={ field.k } field={ field } value={ filters[field.k] } filters={ filters } lists={ lists } popKey={ popKey } onPop={ onPop } onChange={ (value) => onChange(field.k, value) } />
                            )) }
                        </div>
                    </div>
                );
            }) }
        </div>
    );
};

JoSuggestFilters.propTypes = {
    mode: PropTypes.string.isRequired,
    filters: PropTypes.object.isRequired,
    lists: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
};

export default React.memo(JoSuggestFilters);
