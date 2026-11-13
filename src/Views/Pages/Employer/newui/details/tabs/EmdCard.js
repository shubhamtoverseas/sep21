import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../../../utils/translation";
import { headingCase } from "../../../../../../utils/utils";

const EmdCard = ({ id, title, editing, canEdit, onEdit, onCancel, onSave, saving, onAdd, addLabel, actions, tableBody, children }) => (
    <div className="g2-card" id={ id }>
        <div className="g2-card-header g2-clean-header">
            <h3 className="g2-title">{ typeof title === 'string' ? headingCase(title) : title }</h3>
            <span className="wkd-grow" />
            { actions }
            { onAdd && (
                <button type="button" className="g2-button" onClick={ onAdd }>+ { addLabel || translation('key_add') }</button>
            ) }
            { editing ? (
                <>
                    <button type="button" className="g2-button" onClick={ onCancel } disabled={ saving }>{ translation('key_cancel') }</button>
                    <button type="button" className="g2-button primary" onClick={ onSave } aria-disabled={ saving } disabled={ saving }>
                        { saving ? translation('key_loading') : translation('key_save') }
                    </button>
                </>
            ) : (
                canEdit && onEdit && (
                    <button type="button" className="g2-button" onClick={ onEdit }>{ translation('key_edit') }</button>
                )
            ) }
        </div>
        <div className={ `wkd-card-body${ tableBody ? ' emd-card-body-table' : '' }` }>{ children }</div>
    </div>
);

EmdCard.propTypes = {
    id: PropTypes.string,
    title: PropTypes.node.isRequired,
    editing: PropTypes.bool,
    canEdit: PropTypes.bool,
    onEdit: PropTypes.func,
    onCancel: PropTypes.func,
    onSave: PropTypes.func,
    saving: PropTypes.bool,
    onAdd: PropTypes.func,
    addLabel: PropTypes.string,
    actions: PropTypes.node,
    tableBody: PropTypes.bool,
    children: PropTypes.node,
};

export default React.memo(EmdCard);
