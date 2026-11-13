import React, { lazy, Suspense } from "react";
import PropTypes from "prop-types";
import translation from "../../../../../utils/translation";
import { SEND_SITE } from "../../../SettingsPage/newui/templates/templateConfiguration";
import { JO_APPLICANT_COPY, JO_SEND_TEMPLATE, JO_SEND_TEMPLATE_NOTE, JO_SHARE_WORKER_TEMPLATE } from "../../jobOfferConstants";

const WkdSendTemplateModal = lazy(() => import("../../../WorkerPage/worker-detail/newui/WkdSendTemplateModal"));

/* Share from the Applicant View (X-04) · Share (worker) from the Applicants list (X-05) */
const SITE_OF = Object.freeze({ [JO_SEND_TEMPLATE.slug]: SEND_SITE.JOB_OFFER_SHARE, [JO_SHARE_WORKER_TEMPLATE.slug]: SEND_SITE.JOB_OFFER_SHARE_WORKER });

/**
 * Send Template on a Job Offer record: the shared composer with the Job Offer as the record. The server resolves the employer,
 * Job Offer and (Share worker) worker values; the worker profile link is the one the record page generated for this share.
 * "Send to" offers the employer and the Job Offer's CS where the category has a template for them.
 */
const JoSendTemplate = ({ detail, currentEmployer, jobOfferId, onClose, template = JO_SEND_TEMPLATE, workerId = null, links = null }) => {
    const contextLabel = detail?.reference_id ? `${ JO_APPLICANT_COPY.jobOffer } · ${ detail.reference_id }` : JO_APPLICANT_COPY.jobOffer;
    const csName = detail?.cs_owner_name || detail?.cs_name || "";
    const context = {
        job_offer_id: jobOfferId,
        employer_id: currentEmployer?.employer_id,
        ...(workerId ? { worker_id: workerId } : {}),
        ...(links ? { links } : {}),
    };

    return (
        <Suspense fallback={ null }>
            <WkdSendTemplateModal
                onClose={ onClose }
                title={ translation('key_send_template') }
                site={ SITE_OF[template.slug] }
                context={ context }
                userType={ template.userType }
                slug={ template.slug }
                parties={ {
                    employer: { name: currentEmployer?.name || "", phone: currentEmployer?.whatsapp_number || currentEmployer?.mobile_number || "" },
                    ...(csName ? { cs: { name: csName, phone: "" } } : {}),
                } }
                contextLabel={ contextLabel }
                note={ translation(JO_SEND_TEMPLATE_NOTE) }
            />
        </Suspense>
    );
};

JoSendTemplate.propTypes = {
    detail: PropTypes.object,
    currentEmployer: PropTypes.object,
    jobOfferId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    template: PropTypes.oneOf([JO_SEND_TEMPLATE, JO_SHARE_WORKER_TEMPLATE]),
    /* Share (worker): the shared worker, and the stage-aware profile link generated for this share */
    workerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    links: PropTypes.shape({ worker_profile_link: PropTypes.string }),
};

export default React.memo(JoSendTemplate);
