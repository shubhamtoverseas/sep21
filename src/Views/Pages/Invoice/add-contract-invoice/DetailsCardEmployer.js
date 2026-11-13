import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PropTypes from 'prop-types';
import Icon from "../../../../components/Icon/Icon";
import "../new-ui-shared.css";
import "../new-ui-create.css";
const DetailsCardEmployer = ({ entityName, currentInvoiceEmployerDetail, actionType, onSelectClick, onEditClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleToEdit = useCallback(() => {
    if (actionType === 'exchange') {
      navigate(`/invoices/add-contract-invoice/select-employer/employer-details/${ currentInvoiceEmployerDetail.employer_id }`, { state: { actionType: "exchange" } });
    } else {
      navigate(`./select-employer/employer-details/${ currentInvoiceEmployerDetail.employer_id }`, { state: { actionType: "invoice" } });
    }
  }, [navigate, actionType, currentInvoiceEmployerDetail?.employer_id]);

  const emp = currentInvoiceEmployerDetail;
  return (
    <div className="party-card">
      <div className="pc-head">
        <span className="role">{ entityName === "Employer" ? t('key_employer') : entityName }</span>
        { emp
          ? <span className="ok"><i className="ri-check-line" />{ t('key_selected') || 'Selected' }</span>
          : <span className="req">{ t('key_required') || 'Required' }</span> }
        <span className="spacer" />
        { emp && <>
          <button type="button" className="btn btn-secondary md" onClick={ onEditClick || handleToEdit }><i className="ri-edit-line" />{ t('key_edit') }</button>
          { actionType !== 'exchange' && <button type="button" className="btn btn-primary md" onClick={ onSelectClick }><i className="ri-refresh-line" />{ t('key_change_employer') }</button> }
        </> }
        { actionType !== 'exchange' && !emp && (
          <button type="button" className="btn btn-primary md" onClick={ onSelectClick }><i className="ri-add-line" />{ t('key_select_employer') }</button>
        ) }
      </div>
      <div className="pc-body">
        { !emp ? (
          <div className="party-empty">
            <span className="glyph"><Icon name="building" size={18} /></span>
            <div className="txt">
              <div className="t">{ t('key_no_employer_selected') || 'No employer selected' }</div>
              <div className="h">{ t('key_search_existing_employer_or_create_new') || 'Search an existing employer, or create a new one from this flow.' }</div>
            </div>
          </div>
        ) : (
          <div className="party-detail">
            <div className="lead">
              <span className="nm">{ emp.name }</span>
              { emp.chinese_name && <span className="zh">· { emp.chinese_name }</span> }
              { emp.reference_id && <span className="code">{ emp.reference_id }</span> }
            </div>
            <div className="kv"><div className="k">{ t('key_hkid') }</div><div className="v mono">{ emp.hk_id || '—' }</div></div>
            <div className="kv"><div className="k">{ t('key_mobile') }</div><div className="v mono">{ emp.mobile_number || '—' }</div></div>
            <div className="kv"><div className="k">{ t('key_email') }</div><div className="v">{ emp.email || '—' }</div></div>
            <div className="kv"><div className="k">{ t('key_branch_cs_owner') }</div><div className="v">{ [emp.branch_name, emp.cs_name || emp.staff_name].filter(Boolean).join(' · ') || '—' }</div></div>
          </div>
        ) }
      </div>
    </div>
  );
};
DetailsCardEmployer.propTypes = {
  entityName: PropTypes.string,
  currentInvoiceEmployerDetail: PropTypes.object,
  actionType: PropTypes.string,
  onSelectClick: PropTypes.func,
  onEditClick: PropTypes.func,
  trans: PropTypes.func,
};
export default React.memo(DetailsCardEmployer);
