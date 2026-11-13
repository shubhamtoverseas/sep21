import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import SearchSelect from "../../../../components/ui/SearchSelect";
import { TextInput } from "../../../../components/ui/FormControls";
import constData from "../../../../components/ReusableComponents/constants";
import { hk } from "./contractSetup";
import { CUSTOM_DESCRIPTION_MAX, customEntry, offeredTypes, typeCandidates } from "./invoiceItems";
import "../new-ui-shared.css";
import "../new-ui-create.css";

/*
 * Contract Invoice · Invoice items · the empty rows (ITEMS-ROW-1; the 21 Sept package's inline rows, in place of the Add Item
 * and Add Custom Item panels). An Add Item row: Item Type (the types the engine offers an item of for this invoice, even an
 * unpriced one, OP-27-134) → Description (that type's candidates, each with the engine's amount; one with no amount, or already on the
 * invoice, listed but not choosable) → the amount, read-only, from the engine. Choosing the Description commits the row.
 * An Add Custom Item row: Item Type "Custom Item", a description and an HK$ amount, committed on blur of the amount or
 * Enter once both pass the server's check (R-I4). Until it commits a row is the screen's only: never priced, not in the
 * totals, removed by its cross.
 */

const Cross = ({ onClick, disabled }) => {
    const { t } = useTranslation();
    return (
        <td className="act">
            <span className="acts">
                <button type="button" className="ibtn" disabled={ disabled } onClick={ onClick } title={ t("key_inv_remove_line") } aria-label={ t("key_inv_remove_line") }>
                    <i className="ri-close-line" />
                </button>
            </span>
        </td>
    );
};
Cross.propTypes = { onClick: PropTypes.func.isRequired, disabled: PropTypes.bool };

export const DraftItemRow = ({ draft, result, onType, onPick, onDrop }) => {
    const { t } = useTranslation();
    const types = useMemo(() => offeredTypes(result), [result]);
    /* a type no longer offered (another change took its last item) reads as not chosen */
    const type = types.includes(draft.type) ? draft.type : "";
    const candidates = useMemo(() => (type ? typeCandidates(result, type) : []), [result, type]);
    const picked = candidates.find((o) => o.id === draft.picked) || null;
    const id = `inv-draft-${ draft.key }`;
    return (
        <tr className="draft-row" data-draft="item" aria-busy={ draft.busy || undefined }>
            <td className="primary">
                <label className="sr-only" htmlFor={ `${ id }-type` }>{ t("key_item_type") }</label>
                <SearchSelect inputId={ `${ id }-type` } value={ type } placeholder={ t("key_inv_select_item") } disabled={ draft.busy }
                    options={ types.map((ty) => ({ value: ty, label: ty })) } noOptionsMessage={ t("key_inv_nothing_else") }
                    onChange={ (value) => onType(draft.key, value) } />
            </td>
            <td className="de">
                <label className="sr-only" htmlFor={ `${ id }-item` }>{ t("key_description") }</label>
                <SearchSelect inputId={ `${ id }-item` } value={ picked ? picked.id : "" } placeholder={ t("key_inv_select_item") } disabled={ !type || draft.busy }
                    options={ candidates.map((o) => ({
                        value: o.id, label: o.label, isDisabled: Boolean(o.onInvoice) || o.amount == null,
                        sub: o.onInvoice ? t("key_inv_already_on_invoice") : o.amount == null ? t("key_inv_no_amount_set") : hk(o.amount),
                    })) }
                    onChange={ (value) => { const option = candidates.find((o) => o.id === value); if (option) onPick(draft, option); } } />
            </td>
            <td className="right mono">{ picked && picked.amount != null ? hk(picked.amount) : <span className="dash">—</span> }</td>
            <td className="right"><span className="dash">—</span></td>
            <td className="right"><span className="dash">—</span></td>
            {/* while the engine checks the chosen item the row cannot be dropped (the item may already be added) */}
            <Cross onClick={ () => onDrop(draft.key) } disabled={ draft.busy } />
        </tr>
    );
};
DraftItemRow.propTypes = {
    draft: PropTypes.shape({ key: PropTypes.string.isRequired, type: PropTypes.string, picked: PropTypes.string, busy: PropTypes.bool }).isRequired,
    result: PropTypes.object,
    onType: PropTypes.func.isRequired,
    onPick: PropTypes.func.isRequired,
    onDrop: PropTypes.func.isRequired,
};

export const DraftCustomRow = ({ draft, onEdit, onCommit, onDrop }) => {
    const { t } = useTranslation();
    const id = `inv-draft-${ draft.key }`;
    const invalid = Boolean(draft.tried) && !customEntry(draft);
    const descriptionBad = invalid && !String(draft.description || "").trim();
    const amountBad = invalid && !customEntry({ description: "-", amount: draft.amount });
    const enter = (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        onCommit(draft);
    };
    return (
        <tr className="draft-row" data-draft="custom">
            <td className="primary">{ t("key_inv_custom_item") }</td>
            <td className="de">
                <label className="sr-only" htmlFor={ `${ id }-description` }>{ t("key_description") }</label>
                <TextInput id={ `${ id }-description` } value={ draft.description } maxLength={ CUSTOM_DESCRIPTION_MAX } placeholder={ t("key_description") }
                    aria-required="true" invalid={ descriptionBad } aria-invalid={ descriptionBad || undefined }
                    onChange={ (e) => onEdit(draft.key, { description: e.target.value, tried: false }) } onKeyDown={ enter } />
                { invalid && <span className="dt draft-err" role="alert">{ t("key_inv_custom_invalid") }</span> }
            </td>
            <td className="right">
                <label className="sr-only" htmlFor={ `${ id }-amount` }>{ t("key_amount") }</label>
                <span className="draft-amt">
                    <span aria-hidden="true">HK$</span>
                    <TextInput id={ `${ id }-amount` } value={ draft.amount } inputMode="decimal" aria-required="true" invalid={ amountBad } aria-invalid={ amountBad || undefined }
                        onChange={ (e) => { if (constData.AMOUNT_INPUT_REGEX.test(e.target.value)) onEdit(draft.key, { amount: e.target.value, tried: false }); } }
                        onBlur={ () => onCommit(draft, { blur: true }) } onKeyDown={ enter } />
                </span>
            </td>
            <td className="right"><span className="dash">—</span></td>
            <td className="right"><span className="dash">—</span></td>
            <Cross onClick={ () => onDrop(draft.key) } />
        </tr>
    );
};
DraftCustomRow.propTypes = {
    draft: PropTypes.shape({ key: PropTypes.string.isRequired, description: PropTypes.string, amount: PropTypes.string, tried: PropTypes.bool }).isRequired,
    onEdit: PropTypes.func.isRequired,
    onCommit: PropTypes.func.isRequired,
    onDrop: PropTypes.func.isRequired,
};
