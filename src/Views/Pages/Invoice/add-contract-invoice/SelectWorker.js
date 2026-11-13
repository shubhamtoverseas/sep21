import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
// import configData from "../../../../components/ReusableComponents/app-configs";
import CustomBreadcrumb from "../../../../components/custom-breadcrumb/CustomBreadcrumb";
import routes from "../../routes/routesConfig";
// import { Link } from "react-router-dom";
import WorkerResultTable from "./WorkerResultTable";
import translation from "../../../../utils/translation";
import '../new-ui-shared.css';
import '../new-ui-create.css';
const SelectEmployer = () => {
    const { t } = useTranslation(); // Access translations
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectWorker, setSelectWorker] = useState('');
    const [actionType, setActionType] = useState("invoice");

    useEffect(() => {
        if (location.state?.actionType) {
            setActionType(location.state?.actionType);
        }
    }, [location.state]);

    /* the table reads the list for the text once typing pauses (WorkerResultTable), as in the modal; this page no longer
       reads it on every keystroke as well (performance track A-17) */
    const handleSearch = (e) => setSearchQuery(e.target.value);
    const handleSelectedRows = (selectedRecords) => {
        if (selectedRecords.length === 0) return;
        setSelectWorker(selectedRecords[0]);
    }

    const handleRedirectToContract = () => {
        if (selectWorker === '') return;
        if (actionType === 'exchange') {
            navigate(`./worker-details/${ selectWorker.id }`, { state: { actionType: actionType } });
        } else {
            navigate(`./worker-details/${ selectWorker.id }`, { state: { actionType: actionType } });
        }
    }

    const selectedName = selectWorker && (selectWorker.full_name || selectWorker.name || selectWorker.english_name || selectWorker.worker_name);

    return <section className="centerContent greyBg">
        <CustomBreadcrumb
            items={ [
                { label: t('key_add_contract_invoice'), link: '../' + routes.addContractInvoice },
                { label: t('key_select_worker') },
            ] } />
        <div className="invd tk-page">
            <div className="takeover wide" role="region">
                <div className="tk-head">
                    <div>
                        <h2>{ t('key_select_worker') }</h2>
                        <div className="sub">{ t('key_workers_must_already_exist_selection_drives_pricing') || 'Workers must already exist — selection drives Settings pricing.' }</div>
                    </div>
                    <div className="spacer" />
                </div>

                <div className="tk-tools">
                    <div className="tk-search grow">
                        <span className="ico"><i className="ri-search-line" /></span>
                        <input className="input" value={ searchQuery } onChange={ handleSearch } placeholder={ translation('key_phone_email_hkid_passport_english_name_worker_code') } />
                    </div>
                </div>

                <div className="tk-body tk-body-pad">
                    <WorkerResultTable searchQueryText={ searchQuery } handleSelectedCheckedRows={ handleSelectedRows } />
                </div>

                <div className="tk-foot">
                    <button type="button" className="btn btn-secondary md" onClick={ () => window.history.back() }>{ t('key_cancel') }</button>
                    <div className="spacer" />
                    { selectedName && <span className="selnote">{ t('key_selected') || 'Selected' } <strong>{ selectedName }</strong></span> }
                    <button type="button" className="btn btn-primary md" onClick={ () => { handleRedirectToContract() } } disabled={ !selectWorker }>
                        { t('key_select_worker') }<i className="ri-arrow-right-s-line" />
                    </button>
                </div>
            </div>
        </div>
    </section >
};

export default SelectEmployer;
