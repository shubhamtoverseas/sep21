import React, { useCallback, useMemo } from "react";
import PropTypes from "prop-types";

/*
 * Prototype `multi` control: a grid of native checkboxes (accent #2563eb,
 * 15px) in N columns, gap 8px 24px, red hairline when the field errors.
 * `value` / `onChange` are arrays of option ids; `max` blocks further picks
 * (already-picked options stay enabled so they can be un-picked).
 */
const BioCheckGrid = ({ options, value, onChange, cols, max, disabled, error, ariaLabel, name }) => {
    const selected = useMemo(() => (Array.isArray(value) ? value.map(String) : []), [value]);
    const atMax = max != null && selected.length >= max;
    const toggle = useCallback((id) => {
        const key = String(id);
        const next = selected.includes(key) ? selected.filter((v) => v !== key) : [...selected, key];
        onChange(next.map((v) => (options.find((o) => String(o.id) === v)?.id ?? v)));
    }, [selected, onChange, options]);
    return (
        <div className={ `bio-checkgrid cols-${ cols }${ error ? ' has-error' : '' }` } role="group" aria-label={ ariaLabel }>
            { options.map((o) => {
                const on = selected.includes(String(o.id));
                return (
                    <label key={ o.id } className={ `bio-check${ disabled || o.disabled || (!on && atMax) ? ' is-disabled' : '' }` }>
                        <input
                            type="checkbox"
                            name={ name }
                            value={ o.id }
                            checked={ on }
                            disabled={ disabled || o.disabled || (!on && atMax) }
                            onChange={ () => toggle(o.id) }
                        />
                        <span>{ o.name }</span>
                    </label>
                );
            }) }
        </div>
    );
};

BioCheckGrid.propTypes = {
    options: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.any.isRequired, name: PropTypes.node, disabled: PropTypes.bool })).isRequired,
    value: PropTypes.array,
    onChange: PropTypes.func.isRequired,
    cols: PropTypes.number,
    max: PropTypes.number,
    disabled: PropTypes.bool,
    error: PropTypes.bool,
    ariaLabel: PropTypes.string,
    name: PropTypes.string,
};

BioCheckGrid.defaultProps = { cols: 2, value: [] };

export default React.memo(BioCheckGrid);
