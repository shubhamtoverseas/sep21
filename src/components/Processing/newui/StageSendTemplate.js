import React, { lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import translation from "../../../utils/translation";
import { CR_TASK_SEND_TEMPLATE } from "../../../Views/Pages/Contract/contractConstants";
import { SEND_SITE } from "../../../Views/Pages/SettingsPage/newui/templates/templateConfiguration";

const WkdSendTemplateModal = lazy(() => import("../../../Views/Pages/WorkerPage/worker-detail/newui/WkdSendTemplateModal"));

const phoneOf = (code, number) => (number ? `${ code || "" }${ number }` : "");

/** The contract's parties "Send to" may offer (the category decides which): its worker, its employer and its CS. */
export const contractParties = (d) => ({
    ...(d?.worker_id ? { worker: { name: d.worker_name || "", phone: phoneOf(d.country_code, d.mobile_number) } } : {}),
    ...(d?.employer_id ? { employer: { name: d.employer_name || "", phone: phoneOf(d.employer_whatsapp_country_code, d.employer_whatsapp_number) || phoneOf(d.employer_country_code, d.employer_mobile_number) } } : {}),
    ...(d?.cs_staff_id ? { cs: { name: d.cs_name || "", phone: "" } } : {}),
});

/**
 * Send Template on a Contract record. The stage panel footers and Share buttons (ST-11), the Contract rail composer (X-07),
 * a Calendar task arrival (X-08) and the Extend Visa case (X-09) all open this one new-UI modal (the shared
 * WkdSendTemplateModal) with the Processing template catalogue and the contract as the record: the server resolves the
 * values and checks the sender's Stage Actions grant for that site. The rail and Calendar fix no category: the sender
 * chooses among the site's hand-sent categories (package X-07 / X-08: no fixed Contract template). Templates are managed in Settings (U-0156) — no edit
 * path here. A Share send (`statusKey`) hands its chat payload back through `onSent` so the stage can record the share.
 * Rendered on <body>: the record page's panels clip and transform, and a fixed overlay inside them would not cover the page.
 */
const StageSendTemplate = ({ contractDetails, slug, site = SEND_SITE.CONTRACT_STAGE, statusKey = "", attachmentPath, attachmentKey, onClose, onSent }) => createPortal(
    <Suspense fallback={ null }>
        <WkdSendTemplateModal onClose={ onClose } onSent={ onSent } title={ translation("key_send_template") }
            site={ site } context={ { contract_id: contractDetails?.id } } userType={ CR_TASK_SEND_TEMPLATE.userType } slug={ slug }
            parties={ contractParties(contractDetails) } status_key={ statusKey } attachmentPath={ attachmentPath } attachmentKey={ attachmentKey } />
    </Suspense>,
    document.body
);

StageSendTemplate.propTypes = {
    contractDetails: PropTypes.object,
    /* the Processing template category slug (processing_contract, processing_deployment_share_flight, …); none on the rail / Calendar */
    slug: PropTypes.string,
    /* the send site (SEND_SITE): ST-11 stage panels by default; X-07 rail, X-08 Calendar task, X-09 Extend Visa */
    site: PropTypes.string,
    /* a Share send's status key (flight_details · pickup · medical · share_medical · visa_reference_no · visa_file); "" for a plain send */
    statusKey: PropTypes.string,
    attachmentPath: PropTypes.string,
    attachmentKey: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onSent: PropTypes.func,
};

export default StageSendTemplate;
