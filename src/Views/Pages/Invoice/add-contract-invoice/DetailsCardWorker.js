import constData from "../../../../components/ReusableComponents/constants";
import React, { useCallback, useMemo } from "react";
import PropTypes from 'prop-types';
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Icon from "../../../../components/Icon/Icon";
import "../new-ui-shared.css";
import "../new-ui-create.css";

const TYPE_INTERNAL_CATEGORIES = new Set(constData.INVOICE_TYPE_INTERNAL_CATEGORIES);

const DetailsCardWorker = ({ entityName, currentInvoiceWorkerDetail, currentContractCategory, handleUpdateType, actionType, contractType, onSelectClick, onEditClick, disableSelect, typeField = true, chips = true }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleToEdit = useCallback(() => {
        if (actionType === 'exchange') {
            navigate(`/invoices/add-contract-invoice/select-worker/worker-details/${ currentInvoiceWorkerDetail.id }`, { state: { actionType: "exchange" } });
        } else {
            navigate(`./select-worker/worker-details/${ currentInvoiceWorkerDetail.id }`, { state: { actionType: "invoice" } });
        }
    }, [navigate, actionType, currentInvoiceWorkerDetail?.id]);

    const onTypeChange = useCallback((e) => {
        handleUpdateType(e.target.value);
    }, [handleUpdateType]);

    /* Type (Internal) (user rulings 22 Oct 2026): before a worker is selected it is shown disabled; once one is selected it is
       enabled for an Overseas, Local Finished, Local Terminated or Local Terminated (TR) worker and hidden otherwise —
       Renew, Local Transfer and Direct Hire keep their automatic value. Contract Invoice setup asks it in its Service card
       instead (typeField false, INV-C2); Exchange keeps it here. Contract Invoice setup shows the worker's facts in its
       "Employer and worker" card's facts row (chips false, OP-27-43); Exchange keeps the chips. */
    const typeInternalDisabled = !currentInvoiceWorkerDetail;
    const showTypeInternal = useMemo(() => typeField && (!currentInvoiceWorkerDetail || TYPE_INTERNAL_CATEGORIES.has(currentContractCategory)),
        [typeField, currentInvoiceWorkerDetail, currentContractCategory]);

    const wkr = currentInvoiceWorkerDetail;
    return (
        <div className="party-card">
            <div className="pc-head">
                <span className="role">{ entityName === "Worker" ? t('key_worker') : entityName }</span>
                { wkr
                    ? <span className="ok"><i className="ri-check-line" />{ t('key_selected') || 'Selected' }</span>
                    : <span className="req">{ t('key_required') || 'Required' }</span> }
                <span className="spacer" />
                { wkr ? <>
                    <button type="button" className="btn btn-secondary md" onClick={ onEditClick || handleToEdit }><i className="ri-edit-line" />{ t('key_edit') }</button>
                    <button type="button" className="btn btn-primary md" onClick={ onSelectClick }><i className="ri-refresh-line" />{ t('key_change_worker') }</button>
                </> : (
                    <button type="button" className="btn btn-primary md" onClick={ onSelectClick } disabled={ disableSelect } title={ disableSelect ? (t('key_select_an_employer_before_choosing_a_worker') || 'Select an Employer before choosing a Worker.') : '' }><i className="ri-add-line" />{ t('key_select') } { entityName }</button>
                ) }
            </div>
            <div className="pc-body">
                { !wkr ? (
                    <div className="party-empty">
                        <span className="glyph"><Icon name="user" size={18} /></span>
                        <div className="txt">
                            <div className="t">{ t('key_no_worker_selected') || 'No worker selected' }</div>
                            <div className="h">{ t('key_select_existing_eligible_worker') || 'Search and select an existing eligible worker.' }</div>
                        </div>
                    </div>
                ) : (
                    <div className="party-detail">
                        <div className="lead">
                            <span className="nm">{ wkr.name }</span>
                            { (wkr.reference_id || wkr.worker_reference_id || wkr.branch_code) && <span className="code">{ wkr.reference_id || wkr.worker_reference_id || wkr.branch_code }</span> }
                        </div>
                        { chips && <div className="attr-chips">
                            { wkr.type && <span className="attr-chip"><span className="lab">{ t('key_type') }</span>{ Number(wkr.type) === 1 ? 'Local' : 'Overseas' }</span> }
                            { (wkr.nationality_info?.name || wkr.nationality_name) && <span className="attr-chip"><span className="lab">{ t('key_nat') }</span>{ wkr.nationality_info?.name || wkr.nationality_name }</span> }
                            { (wkr.worker_status?.worker_status || wkr.profile_status_info?.name || wkr.worker_status_name) && <span className="attr-chip"><span className="lab">{ t('key_status') }</span>{ wkr.worker_status?.worker_status || wkr.profile_status_info?.name || wkr.worker_status_name }</span> }
                            { (wkr.contract_category_info?.name || currentContractCategory) && <span className="attr-chip"><span className="lab">{ t('key_category') }</span>{ wkr.contract_category_info?.name || currentContractCategory }</span> }
                        </div> }
                    </div>
                ) }

                { showTypeInternal && (
                    <div className="field type-field">
                        <label className="required">{ t('key_type_internal') }</label>
                        <div className="select">
                            <select className="input" id="type_internal" name="type_internal" onChange={ onTypeChange } value={ contractType || '' } disabled={ typeInternalDisabled }>
                                <option value="">{ t('key_please_select') }</option>
                                <option key="new" value="new">{ t('key_new') }</option>
                                <option key="replacement" value="replacement">{ t('key_replacement') }</option>
                            </select>
                        </div>
                    </div>
                ) }

                <div className="party-note">
                    <span className="ico"><i className="ri-information-line" /></span>
                    <span>{ t('key_worker_must_exist_cannot_add_from_invoice') || 'Worker must already exist in the system. New Worker cannot be added from Invoice.' }</span>
                </div>
            </div>
        </div>
    );
};
DetailsCardWorker.propTypes = {
    entityName: PropTypes.string,
    currentInvoiceWorkerDetail: PropTypes.any,
    currentContractCategory: PropTypes.any,
    handleUpdateType: PropTypes.func,
    actionType: PropTypes.string,
    onSelectClick: PropTypes.func,
    onEditClick: PropTypes.func,
    disableSelect: PropTypes.bool,
    trans: PropTypes.func,
    contractType: PropTypes.string,
    typeField: PropTypes.bool,
    chips: PropTypes.bool
};
export default React.memo(DetailsCardWorker);
