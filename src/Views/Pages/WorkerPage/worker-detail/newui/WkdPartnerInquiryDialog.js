import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../../components/ui/Modal";
import Btn from "../../../../../components/ui/Btn";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { fill } from "../../../../../components/mc-dialog/McDialog";
import translation from "../../../../../utils/translation";
import { headingCase } from "../../../../../utils/utils";
import { CHANNEL_LABELS, PARTNER_INQUIRY_COPY } from "../../workerModuleConstants";
import { fillApprovedText, inquiryValues, loadPartnerInquiryText, sendPartnerInquiry } from "./partnerInquiry";
import "./wkd-dialogs.css";

/**
 * Send inquiry — the Partner inquiry to the proposed PT (package REF-PERM "Partner inquiry and assignment notifications";
 * ST-04 / ST-06; ruling Q5). It shows the recipient agency, branch and PT, identifies the worker, and sends the approved
 * WhatsApp template with the worker's values. Sending changes no status and assigns nothing; the Assign action stays
 * separate. Opened from Assign Partner / Assign PT and from Change Partner.
 */
const WkdPartnerInquiryDialog = ({ pt, agencyName, branchName, worker, onClose, onSent }) => {
    const [text, setText] = useState(null);     /* the approved text — null while loading, "" when chat lists none */
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let alive = true;
        loadPartnerInquiryText()
            .then((t) => { if (alive) setText(t || ""); })
            .catch(() => { if (alive) setText(""); });
        return () => { alive = false; };
    }, []);

    const values = inquiryValues(worker);
    const whatsapp = `${ pt?.whatsapp_country_code || "" }${ pt?.whatsapp || "" }`;
    const canSend = Boolean(text) && Boolean(pt?.user_id) && !busy;

    const send = async () => {
        if (!canSend) return;
        setBusy(true);
        setError("");
        const outcome = await sendPartnerInquiry({ pt, worker, text });
        setBusy(false);
        if (outcome.failed) {
            setError(outcome.message || translation("key_something_went_wrong"));
            return;
        }
        ShowToast("success", fill(PARTNER_INQUIRY_COPY.sent, { name: pt?.name || "", branch: branchName || "" }));
        onSent?.();
    };

    const footer = (
        <>
            <span className="grow" />
            <Btn variant="secondary" type="button" disabled={ busy } onClick={ onClose }>{ translation("key_cancel") }</Btn>
            <Btn variant="primary" type="button" disabled={ !canSend } onClick={ send }>{ busy ? `${ translation("key_loading") }…` : translation("key_wkr_send_inquiry") }</Btn>
        </>
    );

    return (
        <Modal title={ headingCase(translation("key_wkr_send_inquiry")) } width={ 520 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="wkd-dlg" footer={ footer }>
            <p className="intro" data-inquiry-to>
                { translation("key_send_to") }: <b>{ pt?.name }</b> · { agencyName } · { branchName } · { CHANNEL_LABELS.whatsapp } { whatsapp }
            </p>
            <p className="intro" data-inquiry-worker>
                { [values[0], values[1]].filter(Boolean).join(" · ") } · { translation("key_worker_code") }: <b>{ values[2] }</b>
            </p>
            { text === null && <div className="ctx-empty">{ translation("key_loading") }…</div> }
            { text === "" && <div className="ctx-empty" role="alert" data-inquiry-unavailable>{ PARTNER_INQUIRY_COPY.unavailable }</div> }
            { text && <div className="wkd-inquiry-text" data-inquiry-text>{ fillApprovedText(text, values) }</div> }
            { error && <div className="wkd-inquiry-error" role="alert">{ error }</div> }
            <p className="note">{ PARTNER_INQUIRY_COPY.note }</p>
        </Modal>
    );
};

WkdPartnerInquiryDialog.propTypes = {
    /* the proposed PT (searchPartnerStaff row): user_id, name, whatsapp_country_code, whatsapp */
    pt: PropTypes.object.isRequired,
    agencyName: PropTypes.string,
    branchName: PropTypes.string,
    /* the worker: name, nationality (name), code (reference_id — none before assignment) */
    worker: PropTypes.shape({ name: PropTypes.string, nationality: PropTypes.string, code: PropTypes.string }).isRequired,
    onClose: PropTypes.func.isRequired,
    onSent: PropTypes.func,
};

export default WkdPartnerInquiryDialog;
