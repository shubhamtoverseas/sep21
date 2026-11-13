import React from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import { Field, FormGrid } from "../../../../components/ui/FormControls";
import translation from "../../../../utils/translation";
import { headingCase } from "../../../../utils/utils";
import { formatFeedbackType } from "../../../../services/commonService";
import { FEEDBACK_CODE_KEYS, FEEDBACK_TIMESTAMP_FORMAT, FEEDBACK_USER_TYPE_KEYS, feedbackRecordPath } from "../reportConstants";

const EM_DASH = "—";

/* a read-only fact: label over value, never an input (user, 1 Nov) */
const Read = ({ label, value, mono, pre }) => (
    <Field label={ label }>
        <div className={ `rpt-read${ value ? "" : " empty" }${ mono ? " mono" : "" }${ pre ? " pre" : "" }` }>{ value || EM_DASH }</div>
    </Field>
);
Read.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node, mono: PropTypes.bool, pre: PropTypes.bool };

/* One feedback entry (Feedback Report row click) on the kit Modal: who (name · user type · code), contact, what, when, the text. */
const FeedbackDetailDialog = ({ feedbackObj: row, onClose }) => {
    const typeKey = FEEDBACK_USER_TYPE_KEYS[String(row?.created_by_type || "").toLowerCase()];
    const userType = typeKey ? translation(typeKey) : (row?.created_by_type || "");
    const code = FEEDBACK_CODE_KEYS.map((key) => row?.[key]).find(Boolean) || "";
    /* the code opens the employer / worker record when the row carries its id (backend 390); plain text otherwise */
    const recordPath = feedbackRecordPath(row);
    const codeNode = code ? (recordPath ? <Link className="rpt-link" to={ recordPath }>{ code }</Link> : code) : "";
    const whoText = [row?.feedback_user_name, userType].filter(Boolean).join(" · ");
    const subtitle = (whoText || codeNode) ? <>{ whoText }{ codeNode && <>{ whoText ? " · " : "" }{ codeNode }</> }</> : undefined;
    const feedbackFor = row?.feedback_type ? translation(formatFeedbackType(row.feedback_type)?.translationKey) : "";
    return (
        <Modal title={ headingCase(translation("key_feedback")) } width={ 640 } onClose={ onClose } closeLabel={ translation("key_close") }
            subtitle={ subtitle }
            footer={ <><span className="grow" /><Btn variant="secondary" type="button" onClick={ onClose }>{ translation("key_close") }</Btn></> }>
            <FormGrid columns={ 3 }>
                <Read label={ translation("key_user_type") } value={ userType } />
                <Read label={ translation("key_code") } value={ codeNode } mono />
                <Read label={ translation("key_feedback_for") } value={ feedbackFor } />
                <Read label={ translation("key_email") } value={ row?.["feedbackByUser.email"] } />
                <Read label={ translation("key_phone") } value={ row?.["feedbackByUser.mobile_number"] } mono />
                <Read label={ translation("key_rating") } value={ row?.rating ?? "" } />
                <Read label={ translation("key_timestamp") } value={ row?.created_at ? dayjs(row.created_at).format(FEEDBACK_TIMESTAMP_FORMAT) : "" } />
            </FormGrid>
            <FormGrid columns={ 2 }>
                <Field label={ translation("key_feedback") } full><div className={ `rpt-read pre${ row?.comment ? "" : " empty" }` }>{ row?.comment || EM_DASH }</div></Field>
            </FormGrid>
        </Modal>
    );
};

FeedbackDetailDialog.propTypes = {
    onClose: PropTypes.func.isRequired,
    feedbackObj: PropTypes.object,
};

export default FeedbackDetailDialog;
