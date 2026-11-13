import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import WorkerResultTable from "./WorkerResultTable";
import translation from "../../../../utils/translation";
import "../new-ui-shared.css";
import "../new-ui-create.css";

/** Select Worker rendered as a modal takeover over the contract-setup page; `exchange`: the replacement worker (INV-X2, #76). */
const SelectWorkerModal = ({ open, onClose, onSelect, employerName, employerId, exchange = false }) => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectWorker, setSelectWorker] = useState('');

    const handleSearch = (e) => setSearchQuery(e.target.value);
    const handleSelectedRows = (records) => {
        if (!records.length) return;
        setSelectWorker(records[0]);
    };

    if (!open) return null;

    const selectedName = selectWorker && (selectWorker.fullname || selectWorker.full_name || selectWorker.name || selectWorker.english_name);
    const rule = exchange ? t('key_inv_exchange_picker_note') : (t('key_workers_must_already_exist_selection_drives_pricing') || 'Workers must already exist — selection drives Settings pricing.');
    const subtitle = employerName ? `${ t('key_for_employer') || 'For employer' } ${ employerName }. ${ rule }` : rule;

    return (
        <div className="invd">
            <div className="takeover-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && onClose() }>
                <div className="takeover select-modal">
                    <div className="tk-head">
                        <div>
                            <h2>{ t('key_select_worker') }</h2>
                            <div className="sub">{ subtitle }</div>
                        </div>
                        <div className="spacer" />
                        <button type="button" className="btn-icon" onClick={ onClose } aria-label="Close"><i className="ri-close-line" /></button>
                    </div>

                    <div className="tk-tools">
                        <div className="tk-search grow">
                            <span className="ico"><i className="ri-search-line" /></span>
                            <input className="input" value={ searchQuery } onChange={ handleSearch } placeholder={ translation('key_phone_email_hkid_passport_english_name_worker_code') } />
                        </div>
                    </div>

                    <div className="tk-body tk-body-pad">
                        <WorkerResultTable searchQueryText={ searchQuery } handleSelectedCheckedRows={ handleSelectedRows } renewalEmployerId={ exchange ? undefined : employerId } exchange={ exchange } />
                    </div>

                    <div className="tk-foot">
                        <button type="button" className="btn btn-secondary md" onClick={ onClose }>{ t('key_cancel') }</button>
                        <div className="spacer" />
                        { selectedName && <span className="selnote">{ t('key_selected') || 'Selected' } <strong>{ selectedName }</strong></span> }
                        <button type="button" className="btn btn-primary md" disabled={ !selectWorker } onClick={ () => onSelect(selectWorker) }>
                            { t('key_select_worker') }<i className="ri-arrow-right-s-line" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

SelectWorkerModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    employerName: PropTypes.string,
    employerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    exchange: PropTypes.bool,
};

export default SelectWorkerModal;
