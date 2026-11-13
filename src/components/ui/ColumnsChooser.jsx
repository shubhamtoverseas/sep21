import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../Icon/Icon";
import useOutsideClick from "../../hooks/useOutsideClick";
import listStyles from "../../Views/Pages/Invoice/InvoiceList.module.css";

/**
 * Listing column chooser (SH-06 / N-02; Job Offer U-0252, Worker U-0336): a filter-bar control listing `order` with the
 * selected ones ticked; `mandatory` keys render locked. Presentation only — the caller decides the permitted set and
 * remembers the choice (keys, never labels).
 */
const ColumnsChooser = ({ order, mandatory = [], selected, labels, label, title, onToggle }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    useOutsideClick(wrapRef, () => setOpen(false), open);
    return (
        <div ref={ wrapRef } className={ listStyles.columnsDropWrap } data-mc-columns-chooser="">
            <button type="button" className={ `${ listStyles.btn } ${ listStyles.btnSecondary } ${ listStyles.filterCtl }` } aria-haspopup="true" aria-expanded={ open } title={ title } onClick={ () => setOpen((o) => !o) }>
                <Icon name="columns" size={ 13 } />{ label }<span className={ listStyles.columnsCount }>{ selected.length }</span>
            </button>
            { open && (
                <div className={ listStyles.columnsPanel } role="group" aria-label={ title }>
                    <div className={ listStyles.columnsPanelHeader }>{ title }</div>
                    { order.map((key) => {
                        const on = selected.includes(key);
                        const locked = mandatory.includes(key);
                        return (
                            <button key={ key } type="button" className={ listStyles.columnsItem } disabled={ locked } aria-pressed={ on } data-mc-column={ key } onClick={ () => onToggle(key) }>
                                <span className={ `${ listStyles.columnsItemCheck } ${ on ? listStyles.columnsItemCheckOn : '' }` }>{ on && <Icon name="check" size={ 14 } /> }</span>
                                { labels[key] }
                            </button>
                        );
                    }) }
                </div>
            ) }
        </div>
    );
};

ColumnsChooser.propTypes = {
    order: PropTypes.array.isRequired,
    mandatory: PropTypes.array,
    selected: PropTypes.array.isRequired,
    labels: PropTypes.object.isRequired,
    label: PropTypes.node.isRequired,
    title: PropTypes.string,
    onToggle: PropTypes.func.isRequired,
};

export default ColumnsChooser;
