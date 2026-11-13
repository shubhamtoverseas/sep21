import React from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import routes from "../../routes/routesConfig/index";

/**
 * /processings/documents/:contract_id — the Documents page is now the Contract Details Documents view
 * (prototype Contract_Details.html "openDocs"): the record's rail stays, the folder comes from the opener
 * (Processing stage tabs pass fromContractTab / fromConsulateTab / fromImmigrationTab in the location state).
 * "‹" on that view returns here (history) when it was opened from the Processing screen.
 */
const ProcessingDocumentsRedirect = () => {
    const { contract_id } = useParams();
    const { state } = useLocation();
    const folder = state?.fromImmigrationTab ? "immigration" : state?.fromConsulateTab ? "consulate" : "contract";
    return (
        <Navigate
            replace
            to={ { pathname: routes.contractDetails.replace(":contract_id", contract_id), search: `?docs=${folder}` } }
            state={ { fromProcessing: true } }
        />
    );
};

export default ProcessingDocumentsRedirect;
