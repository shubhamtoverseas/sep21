import React from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import routes from "../routes/routesConfig/index";
import { CONTRACT_RECORD_QUERY, LEGACY_PROCESSING_QUERY } from "./processingConstants";

/*
 * The Processing list and the Processing detail are retired (10 Oct workbook Contract #1: one Contracts entry,
 * Processing is a status card, not a screen). Every address that still names them — bookmarks, notifications,
 * Calendar, Insurance and Worker / Employer links — lands on the Contracts dashboard or the Contract record.
 * A legacy `?tab=<stage>` becomes the record's `?stage=`; every other query key (followup, from, send) is kept.
 */
const ProcessingRedirect = () => {
    const { contract_id: contractId } = useParams();
    const { search } = useLocation();
    if (!contractId) return <Navigate replace to={ routes.contracts } />;
    const params = new URLSearchParams(search);
    const legacyTab = params.get(LEGACY_PROCESSING_QUERY.TAB);
    if (legacyTab) { params.delete(LEGACY_PROCESSING_QUERY.TAB); params.set(CONTRACT_RECORD_QUERY.STAGE, legacyTab); }
    const query = params.toString();
    return <Navigate replace to={ `${ routes.contractDetails.replace(':contract_id', contractId) }${ query ? `?${ query }` : '' }` } />;
};

export default ProcessingRedirect;
