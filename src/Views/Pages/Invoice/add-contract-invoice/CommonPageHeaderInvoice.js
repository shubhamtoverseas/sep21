import React, { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from 'prop-types';
import { fetchActiveBranches } from "../../../../redux/Slices/settings/branches/BranchesSlice";
import { searchStaff } from '../../../../redux/Slices/common/cs/CsSlice';
import { setInvoiceHeaderForm } from "../../../../redux/Slices/invoices/InvoicesSlice";
import t from "../../../../utils/translation";
import "../new-ui-shared.css";
import "../new-ui-review.css";
import "../new-ui-create.css";

const getToday = () => new Date().toISOString().split('T')[0];

const toOptionValue = (id, name) => `${ id } | ${ name }`;

const CommonPageHeaderInvoice = (props) => {
    const { onUpdateContractForm } = props;
    const dispatch = useDispatch();
    const [headerForm, setHeaderForm] = useState(() => ({ invoice_date: getToday() }));
    const currentActiveBranches = useSelector((state) => state.branches.currentActiveBranches);
    const staffList = useSelector((state) => state.cs.staffList);

    useEffect(() => {
        dispatch(setInvoiceHeaderForm(headerForm));
    }, [dispatch, headerForm]);

    useEffect(() => {
        if (!currentActiveBranches?.length) {
            dispatch(fetchActiveBranches({ status: 1 }));
        }
    }, [dispatch]);


    const reconcileCsWithList = useCallback((rows) => {
        if (!Array.isArray(rows)) return;
        setHeaderForm((prev) => {
            if (!prev?.csId) return prev;
            const staff = rows.find(({ id }) => String(id) === String(prev.csId).trim());
            const csOptionValue = staff ? toOptionValue(staff.id, staff.name) : "";
            if ((prev.cs_id || "") === csOptionValue) return prev; // already in sync
            const updated = { ...prev, cs_id: csOptionValue, csId: staff ? String(staff.id) : "" };
            onUpdateContractForm({ ...updated, cs_name: staff?.name || "" });
            return updated;
        });
    }, [onUpdateContractForm]);

    const fetchBranchStaff = useCallback((branchId) => {
        dispatch(searchStaff({ branch_id: branchId, type: 'cs' }))
            .then((res) => reconcileCsWithList(res?.payload?.data));
    }, [dispatch, reconcileCsWithList]);

    useEffect(() => {
        if (props.currentInvoiceLocalInfo) {
            if (props.currentInvoiceLocalInfo?.branchId)
                fetchBranchStaff(props.currentInvoiceLocalInfo?.branchId);
            setHeaderForm((prev) => ({
                ...prev,
                invoice_date: props.currentInvoiceLocalInfo?.invoice_date || getToday(),
                branch_id: props.currentInvoiceLocalInfo?.branch_id || "",
                cs_id: props.currentInvoiceLocalInfo?.cs_id || "",
                branchId: props.currentInvoiceLocalInfo?.branchId || "",
                csId: props.currentInvoiceLocalInfo?.csId || ""
            }));
        }
        else if (props.contractFormInfo) {
            if (props.contractFormInfo?.branch_id)
                fetchBranchStaff(props.contractFormInfo?.branch_id);
            setHeaderForm((prev) => ({
                ...prev,
                invoice_date: props.contractFormInfo?.invoice_date || props.contractFormInfo?.invoices_date || getToday(),
                branch_id: props.contractFormInfo?.branch_id ? `${ props.contractFormInfo.branch_id } | ${ props.contractFormInfo.branch_name }` : "",
                cs_id: props.contractFormInfo?.staff_id ? `${ props.contractFormInfo.staff_id } | ${ props.contractFormInfo.staff_name }` : "",
                branchId: props.contractFormInfo?.branch_id || "",
                csId: props.contractFormInfo?.staff_id || ""
            }));
        } else if (props.contractFormInfoFom) {
            if (props.contractFormInfoFom?.branchId)
                fetchBranchStaff(props.contractFormInfoFom?.branchId);
            setHeaderForm((prev) => ({
                ...prev,
                invoice_date: props.contractFormInfoFom?.invoice_date || props.contractFormInfoFom?.invoices_date || getToday(),
                branch_id: props.contractFormInfoFom?.branch_id || "",
                cs_id: props.contractFormInfoFom?.cs_id || "",
                branchId: props.contractFormInfoFom?.branchId || "",
                csId: props.contractFormInfoFom?.csId || ""
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Handling Staff follows the Branch: a chosen branch reloads its staff (reconcileCsWithList drops a CS who has no
       access to it under the invoice module); clearing the branch clears the CS and locks the select again. A fixed CS
       Owner (a Standalone Invoice's creator, #80) has no staff list to follow. */
    const handleGetCsList = useCallback((e) => {
        const [id = '', name = ''] = e.target.value.split('|');
        const branchId = id.trim();
        if (branchId && !props.csFixed) fetchBranchStaff(branchId);
        setHeaderForm((prev) => {
            const updated = branchId
                ? { ...prev, [e.target.name]: e.target.value, branchId }
                : { ...prev, [e.target.name]: '', branchId: '', cs_id: '', csId: '' };
            onUpdateContractForm({ ...updated, branch_name: name.trim(), ...(branchId ? {} : { cs_name: '' }) });
            return updated;
        });
    }, [fetchBranchStaff, onUpdateContractForm, props.csFixed]);

    const handleUpdateCS = useCallback((e) => {
        const [id, name] = e.target.value.split('|');
        setHeaderForm((prev) => {
            const updated = { ...prev, [e.target.name]: e.target.value, csId: id.trim() };
            onUpdateContractForm({ ...updated, cs_name: name });
            return updated;
        });
    }, [onUpdateContractForm]);

    const handleUpdateDate = useCallback((e) => {
        setHeaderForm((prev) => {
            const updated = { ...prev, [e.target.name]: e.target.value };
            onUpdateContractForm(updated);
            return updated;
        });
    }, [onUpdateContractForm]);

    const goBack = useCallback(() => window.history.back(), []);

    const minDate = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; }, []);
    const maxDate = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; }, []);

    /* Invoice Date, Branch and CS Owner. Contract Invoice setup shows them in its own "Invoice" card (inCard, rendered into
       cardTarget once that card is on the page; 27 Oct package OP-27-43); every other screen keeps them in the header strip.
       The values, their reconciliation and onUpdateContractForm are the same either way. */
    const cells = (
        <>
            <div className="cell">
                <div className="k required">{ t('key_invoice_date') }</div>
                <input
                    className="meta-input"
                    value={ headerForm?.invoice_date || getToday() }
                    type="date"
                    name="invoice_date"
                    min={ minDate }
                    max={ maxDate }
                    onChange={ handleUpdateDate }
                />
            </div>
            <div className="cell">
                <div className="k required">{ t('key_branch') }</div>
                <div className="select">
                    <select className="meta-input" id="branch_id" name="branch_id"
                        value={ headerForm?.branch_id } onChange={ handleGetCsList }>
                        <option value="">{ t('key_please_select') }</option>
                        { Array.isArray(currentActiveBranches) ? currentActiveBranches?.map((item, index) => (
                            <option key={ index } value={ toOptionValue(item.id, item.branch_name) }>
                                { item.branch_name }
                            </option>
                        )) : [] }
                    </select>
                </div>
            </div>
            { props.csFixed ? (
                <div className="cell" data-cs-fixed>
                    <div className="k">{ t('key_handling_staff_cs_owner') }</div>
                    <div className="v">{ props.csFixed.name || '—' }</div>
                </div>
            ) : (
                <div className="cell">
                    <div className="k required">{ t('key_handling_staff_cs_owner') }</div>
                    <div className="select">
                        <select className="meta-input" id="cs_id" name="cs_id"
                            value={ headerForm?.cs_id } onChange={ handleUpdateCS }
                            disabled={ !headerForm?.branchId }
                            title={ headerForm?.branchId ? undefined : t('key_please_select_branch_first') }>
                            <option value="">{ t('key_please_select') }</option>
                            { staffList?.map((item, index) => (
                                <option key={ index } value={ toOptionValue(item.id, item.name) }>
                                    { item.name }
                                </option>
                            )) }
                        </select>
                    </div>
                </div>
            ) }
        </>
    );

    return (
        <div className="invd">
            <div className="review-head">
                <div className="left">
                    <button type="button" className="btn-icon outlined" onClick={ goBack } aria-label="Back">
                        <i className="ri-arrow-left-s-line" />
                    </button>
                    <h1>{ props.title }</h1>
                    { props.stepBadge && <span className="badge info">{ props.stepBadge }</span> }
                    {/* an Exchange names its original invoice: "Exchange of <A1 ref>" (INV-X2) */}
                    { props.context && <span className="hdr-context" data-context>{ props.context }</span> }
                </div>
            </div>

            { props.inCard
                ? (props.cardTarget ? createPortal(<div className="cs-metastrip setup-invoice">{ cells }<div className="cell" /></div>, props.cardTarget) : null)
                : (
                    <div className="cs-metastrip mb">
                        {/* R-P1, QA-27 ruling 8: no reference exists before the first submission */}
                        { cells }
                        <div className="cell" />
                    </div>
                ) }
        </div>
    );
};
CommonPageHeaderInvoice.propTypes = {
    title: PropTypes.string,
    onUpdateContractForm: PropTypes.func,
    contractFormInfo: PropTypes.any,
    contractFormInfoFom: PropTypes.any,
    trans: PropTypes.func,
    stepBadge: PropTypes.string,
    currentInvoiceLocalInfo: PropTypes.object,
    inCard: PropTypes.bool,
    cardTarget: PropTypes.object,
    /** a CS Owner shown, not chosen: a Standalone Invoice's creator (#80) */
    csFixed: PropTypes.shape({ id: PropTypes.any, name: PropTypes.string }),
    /** a line after the title: an Exchange's "Exchange of <A1 ref>" */
    context: PropTypes.string,
};
export default React.memo(CommonPageHeaderInvoice);
