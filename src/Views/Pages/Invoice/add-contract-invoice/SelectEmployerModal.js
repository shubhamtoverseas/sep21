import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import EmployerResultTable from "./EmployerResultTable";
import { fetchEmployers } from "../../../../redux/Slices/employer/EmployerSlice";
import translation from "../../../../utils/translation";
import useLatestSearch from "../useLatestSearch";
import "../new-ui-shared.css";
import "../new-ui-create.css";

/** Select Employer rendered as a modal takeover over the contract-setup page. */
const SelectEmployerModal = ({ open, onClose, onSelect, onNewEmployer }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectEmployer, setSelectEmployer] = useState('');

    /* read once typing pauses; only the latest read counts; a search still waiting is sent when the modal closes
       (performance track A-17) */
    const { search, flush } = useLatestSearch(dispatch, (text) => fetchEmployers({ search_text: text, context: 'list' }));
    useEffect(() => { if (!open) flush(); }, [open, flush]);
    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        search(e.target.value);
    };
    const handleSelectedRows = (records) => {
        if (!records.length) return;
        setSelectEmployer(records[0]);
    };

    if (!open) return null;

    const selectedName = selectEmployer && (selectEmployer.employer_name || selectEmployer.name || selectEmployer.full_name);

    return (
        <div className="invd">
            <div className="takeover-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && onClose() }>
                <div className="takeover select-modal">
                    <div className="tk-head">
                        <div>
                            <h2>{ t('key_select_employer') }</h2>
                            <div className="sub">{ t('key_search_select_existing_employer_or_create_new') || 'Search and select an existing employer, or create a new one.' }</div>
                        </div>
                        <div className="spacer" />
                        <button type="button" className="btn-icon" onClick={ onClose } aria-label="Close"><i className="ri-close-line" /></button>
                    </div>

                    <div className="tk-tools">
                        <div className="tk-search grow">
                            <span className="ico"><i className="ri-search-line" /></span>
                            <input className="input" value={ searchQuery } onChange={ handleSearch } placeholder={ translation('key_search_phone_email_hkid_name_code') } />
                        </div>
                        <button type="button" className="btn btn-secondary md" onClick={ onNewEmployer }>
                            <i className="ri-add-line" /> { t('key_new_employer') }
                        </button>
                    </div>

                    <div className="tk-body tk-body-pad">
                        <EmployerResultTable searchQuery={ searchQuery } handleSelectedRows={ handleSelectedRows } selectedId={ selectEmployer?.employer_id } />
                    </div>

                    <div className="tk-foot">
                        <button type="button" className="btn btn-secondary md" onClick={ onClose }>{ t('key_cancel') }</button>
                        <div className="spacer" />
                        { selectedName && <span className="selnote">{ t('key_selected') || 'Selected' } <strong>{ selectedName }</strong></span> }
                        <button type="button" className="btn btn-primary md" disabled={ !selectEmployer } onClick={ () => onSelect(selectEmployer) }>
                            { t('key_select_employer') }<i className="ri-arrow-right-s-line" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

SelectEmployerModal.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    onNewEmployer: PropTypes.func,
};

export default SelectEmployerModal;
