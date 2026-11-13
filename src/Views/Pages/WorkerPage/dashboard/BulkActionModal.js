import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import { Field, SelectBox } from "../../../../components/ui/FormControls";
import { BULK_ELIGIBILITY } from "./workerDashboardConfig";
import translation from "../../../../utils/translation";


const ident = (r) => r.code || r.name || String(r.id);

const BulkActionModal = ({ action, rows, options, fieldShown, onApply, onClose }) => {
    const rule = BULK_ELIGIBILITY[action.kind];
    const { ok, no } = useMemo(() => {
        const okRows = [];
        const noRows = [];
        rows.forEach((r) => { (rule && !rule.test(r) ? noRows : okRows).push(r); });
        return { ok: okRows, no: noRows };
    }, [rows, rule]);

    /* worker_AUDIT D37: no destination is pre-selected — the operator chooses one before Apply becomes available */
    const [dest, setDest] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const isCheckout = action.kind === 'checkout';
    const noDestination = ok.length > 0 && options.length === 0;
    const canGo = ok.length > 0 && !noDestination && (dest !== '' || options.length === 0) && !busy;

    const handleGo = async () => {
        setBusy(true);
        try {
            const res = await onApply(ok.map((r) => r.id), dest);
            const destName = options.find((o) => String(o.id) === String(dest))?.name || '';
            setResult({
                changed: res?.changed?.length || 0,
                destName,
                skipped: [...no.map(ident), ...(res?.skipped || []).map((s) => `${ s.id } (${ s.why })`)],
            });
        } catch (err) {
            setResult({ changed: 0, error: err?.message || translation('key_something_went_wrong'), skipped: no.map(ident) });
        } finally {
            setBusy(false);
        }
    };

    if (result) {
        return (
            <Modal
                title={ action.label }
                width={ 520 }
                onClose={ onClose }
                footer={ <Btn variant="primary" onClick={ onClose }>{ translation('key_done') }</Btn> }
            >
                <div className="wgd-bulk-split">
                    { result.error ? (
                        <><b>{ translation('key_wkr_nothing_was_changed') }</b> { result.error }</>
                    ) : result.changed ? (
                        <><b>{ translation('key_wkr_changed') } { result.changed }</b>{ result.destName ? (isCheckout ? ` — ${ translation('key_wkr_bulk_checked_out_of') } ${ result.destName }` : ` — ${ action.field } ${ translation('key_wkr_bulk_field_is_now') } ${ result.destName }`) : '' }.</>
                    ) : (
                        <b>{ translation('key_wkr_nothing_was_changed') }</b>
                    ) }
                    { result.changed > 0 && !fieldShown && (
                        <div>
                            { isCheckout
                                ? translation('key_wkr_the_worker_listing_has_no_check_in')
                                : translation('key_wkr_bulk_no_column_for_field').replace('{{field}}', action.field) }
                        </div>
                    ) }
                    { result.skipped.length > 0 && (
                        <>
                            <div><b>{ translation('key_wkr_skipped') } { result.skipped.length }</b>{ no.length && rule ? ` — ${ rule.reason }` : '' }.</div>
                            <div className="wgd-bulk-skips">{ result.skipped.join(' · ') }</div>
                        </>
                    ) }
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            title={ action.label }
            width={ 520 }
            onClose={ onClose }
            footer={ (
                <>
                    <Btn variant="secondary" onClick={ onClose } disabled={ busy }>{ translation('key_cancel') }</Btn>
                    <Btn variant="primary" onClick={ handleGo } disabled={ !canGo }>
                        { ok.length ? `${ action.label } ${ translation('key_for') } ${ ok.length }` : translation('key_wkr_nothing_to_change') }
                    </Btn>
                </>
            ) }
        >
            <p className="wgd-bulk-p">{ rows.length } { (rows.length === 1 ? translation('key_worker') : translation('key_workers')).toLowerCase() } { translation('key_wkr_selected_dot') }</p>
            <div className="wgd-bulk-split">
                <b>{ ok.length } { translation('key_of') } { rows.length }</b> { translation('key_wkr_will_change') }
                { no.length > 0 && rule && (
                    <>
                        { ' ' }<b>{ no.length }</b> { translation('key_wkr_cannot_colon') } { rule.reason }.
                        <div className="wgd-bulk-skips">{ no.map(ident).join(' · ') }</div>
                    </>
                ) }
            </div>
            { noDestination && (
                <div className="wgd-bulk-split">
                    { isCheckout
                        ? translation('key_wkr_your_account_holds_no_branch_check_in')
                        : `No ${ action.field } options are available for your account.` }
                </div>
            ) }
            { ok.length > 0 && options.length > 0 && (
                <Field label={ isCheckout ? translation('key_wkr_check_out_from') : `${ translation('key_new') } ${ action.field }` } htmlFor="wgd-bulk-dest">
                    <SelectBox id="wgd-bulk-dest" value={ dest } onChange={ (e) => setDest(e.target.value) }>
                        <option value="">{ translation('key_select_an_option') }</option>
                        { options.map((o) => <option key={ o.id } value={ o.id }>{ o.name }</option>) }
                    </SelectBox>
                </Field>
            ) }
        </Modal>
    );
};

BulkActionModal.propTypes = {
    action: PropTypes.shape({
        kind: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        field: PropTypes.string.isRequired,
    }).isRequired,
    rows: PropTypes.array.isRequired,
    options: PropTypes.array.isRequired,
    fieldShown: PropTypes.bool,
    onApply: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

BulkActionModal.defaultProps = {
    fieldShown: true,
};

export default BulkActionModal;
