import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../utils/translation";
import { CD_OWNER_REGISTER } from "../contractConstants";

/**
 * Selection mode bar (prototype selbarHTML): the count, `Select all N matching records` only while more rows are
 * visible than selected, the Prepared / Ready owner runs (their register granted), Clear and Done.
 */
const SelectionBar = ({ count, visibleCount, registers = {}, onBulk, onSelectAll, onClear, onDone }) => (
    <div className="selbar" data-list-selbar="" role="region" aria-label={ translation("key_select_records") }>
        <span className="selcount">{ count } { translation("key_selected").toLowerCase() }</span>
        <span className="selgrow" />
        { registers[CD_OWNER_REGISTER.PREPARED] && <button type="button" className="g1-btn" aria-disabled={ count === 0 } onClick={ () => count && onBulk?.(CD_OWNER_REGISTER.PREPARED) }>{ translation("key_change_prepared_owner") }</button> }
        { registers[CD_OWNER_REGISTER.READY] && <button type="button" className="g1-btn" aria-disabled={ count === 0 } onClick={ () => count && onBulk?.(CD_OWNER_REGISTER.READY) }>{ translation("key_change_ready_owner") }</button> }
        { visibleCount > count && (
            <button type="button" className="g1-btn link" onClick={ onSelectAll }>
                { translation("key_select_all_matching") } { visibleCount } { translation("key_cd_matching_records") }
            </button>
        ) }
        <button type="button" className="g1-btn plain" onClick={ onClear }>{ translation("key_clear") }</button>
        <button type="button" className="g1-btn" onClick={ onDone }>{ translation("key_done") }</button>
    </div>
);

SelectionBar.propTypes = {
    count: PropTypes.number.isRequired,
    visibleCount: PropTypes.number.isRequired,
    registers: PropTypes.object,
    onBulk: PropTypes.func,
    onSelectAll: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default React.memo(SelectionBar);
