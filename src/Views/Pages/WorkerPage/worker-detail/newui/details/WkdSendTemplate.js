import React, { useState, lazy, Suspense } from "react";
import { Spinner } from "react-bootstrap";
import PropTypes from 'prop-types';
import translation from "../../../../../../utils/translation";
import { SEND_SITE } from "../../../../SettingsPage/newui/templates/templateConfiguration";
import { SEND_TEMPLATE_CONTEXT_KEYS } from "../../../workerModuleConstants";

const WkdSendTemplateModal = lazy(() => import("../WkdSendTemplateModal"));

/* Administrative details → Basic · Passport · Consulate: each section's send site */
const SECTION_SITE = Object.freeze({ basic: SEND_SITE.WORKER_BASIC, processing_passport: SEND_SITE.WORKER_PASSPORT, consulate: SEND_SITE.WORKER_CONSULATE });

const WkdSendTemplate = ({ slug, workerInfo, workerInfoDetails, buttonClassName }) => {
    const [isSendTemplatePopup, setIsSendTemplatePopup] = useState(false);

    const contextLabel = `${ translation('key_details') } — ${ translation(SEND_TEMPLATE_CONTEXT_KEYS[slug] || 'key_details') }`;

    return (
        <>
            <button type="button" className={ `g2-button${ buttonClassName ? ` ${ buttonClassName }` : '' }` } onClick={ () => setIsSendTemplatePopup(true) }>
                { translation('key_send_template') }
            </button>
            { isSendTemplatePopup && (
                <Suspense fallback={ <Spinner /> }>
                    <WkdSendTemplateModal
                        onClose={ () => setIsSendTemplatePopup(false) }
                        title={ translation('key_send_template') }
                        site={ SECTION_SITE[slug] }
                        context={ { worker_id: workerInfo?.id } }
                        userType="worker"
                        slug={ slug }
                        parties={ { worker: { name: workerInfo?.fullname || "", phone: workerInfoDetails?.whatsapp_number || workerInfo?.mobile_number || "" } } }
                        contextLabel={ contextLabel }
                    />
                </Suspense>
            ) }
        </>
    );
};

WkdSendTemplate.propTypes = {
    /* the section's category: basic · processing_passport · consulate */
    slug: PropTypes.oneOf(Object.keys(SECTION_SITE)).isRequired,
    workerInfo: PropTypes.object,
    workerInfoDetails: PropTypes.object,
    buttonClassName: PropTypes.string,
};

export default React.memo(WkdSendTemplate);
