import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import EmployerResultTable from "./EmployerResultTable";
import routes from "../../routes/routesConfig";
import { Link } from "react-router-dom";
import { fetchEmployers } from "../../../../redux/Slices/employer/EmployerSlice";
import translation from "../../../../utils/translation";
import useLatestSearch from "../useLatestSearch";
import '../new-ui-shared.css';
import '../new-ui-create.css';
const SelectEmployer = () => {
    const { t } = useTranslation(); // Access translations
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectEmployer, setSelectEmployer] = useState('');
    /* read once typing pauses; only the latest read counts (performance track A-17) */
    const { search } = useLatestSearch(dispatch, (text) => fetchEmployers({ search_text: text, context: 'list' }));
    const handleSearch = (e) => {
        setSearchQuery(e.target.value);
        search(e.target.value);
    }

    const handleSelectedRows = (selectedRecords) => {
        if (selectedRecords.length === 0) return;
        setSelectEmployer(selectedRecords[0]);
    }

    const handleRedirectToContract = () => {
        if (selectEmployer === '') return;
        navigate(`/invoices/add-contract-invoice`, { state: { currentInvoiceEmployer: { ...selectEmployer } } });
    }

    const selectedName = selectEmployer && (selectEmployer.employer_name || selectEmployer.name || selectEmployer.full_name);

    return (
        <section className="centerContent greyBg">
            <div className="invd tk-page">
                <div className="takeover wide" role="region">
                    <div className="tk-head">
                        <div>
                            <h2>{ t('key_select_employer') }</h2>
                            <div className="sub">{ t('key_search_select_existing_employer_or_create_new') || 'Search and select an existing employer, or create a new one.' }</div>
                        </div>
                        <div className="spacer" />
                    </div>

                    <div className="tk-tools">
                        <div className="tk-search grow">
                            <span className="ico"><i className="ri-search-line" /></span>
                            <input className="input" value={ searchQuery } onChange={ handleSearch } placeholder={ translation('key_search_phone_email_hkid_name_code') } />
                        </div>
                        <Link className="btn btn-secondary md" to={ '/' + routes.addEmployerDetailsOfInvoice }>
                            <i className="ri-add-line" /> { t('key_new_employer') }
                        </Link>
                    </div>

                    <div className="tk-body tk-body-pad">
                        <EmployerResultTable searchQuery={ searchQuery }
                            handleSelectedRows={ handleSelectedRows } selectedId={ selectEmployer?.employer_id } />
                    </div>

                    <div className="tk-foot">
                        <button type="button" className="btn btn-secondary md" onClick={ () => window.history.back() }>{ t('key_cancel') }</button>
                        <div className="spacer" />
                        { selectedName && <span className="selnote">{ t('key_selected') || 'Selected' } <strong>{ selectedName }</strong></span> }
                        <button type="button" className="btn btn-primary md" disabled={ !selectEmployer } onClick={ () => handleRedirectToContract() }>
                            { t('key_select_employer') }<i className="ri-arrow-right-s-line" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default SelectEmployer;
