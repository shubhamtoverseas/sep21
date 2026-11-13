import React, { useRef } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import useDialogFocus from "../../../../../../hooks/useDialogFocus";
import { INTERVIEW_REPORT_OUTCOMES } from "../../../workerModuleConstants";

const WkdInterviewReportPanel = ({ onClose, jobRef, detail, workerName, employerName, methodLocation }) => {
    const panelRef = useRef(null);
    useDialogFocus(panelRef, onClose);
    /* no outcome is pre-selected: an unmarked report shows no radio as chosen (SR-06) */
    const selected = detail?.type || null;
    const interviewDt = (detail?.interview_date && detail?.interview_time)
        ? dayjs(`${ detail.interview_date } ${ detail.interview_time }`).format("D MMM · h:mm A")
        : "—";
    const recorded = detail?.interview_report_marked_by_system
        ? `${ translation("key_interview_marked_by_system") } | ${ detail?.interview_report_marked_at ? dayjs(detail.interview_report_marked_at).format("ddd, D MMM, h:mm A") : "" }`
        : (detail?.interview_report_marked_name && detail?.interview_report_marked_at)
            ? `${ detail.interview_report_marked_name } | ${ dayjs(detail.interview_report_marked_at).format("ddd, D MMM, h:mm A") }`
            : "";

    return (
        <>
            <div className="ctx-backdrop" onClick={ onClose } role="presentation" />
            <div ref={ panelRef } className="ctx-drawer wkd-sug-drawer" role="dialog" aria-modal="true" aria-label={ translation("key_interview_report") }>
                <div className="ctx-drawer-head">
                    <div className="wkd-sug-head-main">
                        <h2>{ translation("key_interview_report") }</h2>
                        { jobRef && <span className="mc-code">{ jobRef }</span> }
                    </div>
                    <button type="button" className="ctx-icon-btn" aria-label={ translation("key_close") } onClick={ onClose }>
                        <Icon name="close" size={ 14 } />
                    </button>
                </div>
                <div className="ctx-drawer-body wkd-sug-body">
                    <div className="wkd-sug-grid">
                        <span className="wkd-sug-k">{ translation("key_interview") }</span>
                        <span className="wkd-sug-v mc-code">{ interviewDt }</span>
                        <span className="wkd-sug-k">{ translation("key_method") } · { translation("key_location") }</span>
                        <span className="wkd-sug-v">{ methodLocation || "—" }</span>
                        <span className="wkd-sug-k">{ translation("key_worker") }</span>
                        <span className="wkd-sug-v">{ workerName || "—" }</span>
                        <span className="wkd-sug-k">{ translation("key_employer") }</span>
                        <span className="wkd-sug-v">{ employerName || "—" }</span>
                    </div>
                    <div>
                        <div className="wkd-lbl">{ translation("key_outcome") }</div>
                        <div className="wkd-rep-radios">
                            { INTERVIEW_REPORT_OUTCOMES.map(({ type, labelKey }) => (
                                <span key={ type } className={ `wkd-rep-radio${ selected === type ? " sel" : "" }` }>
                                    <span className="wkd-rep-dot" />
                                    { translation(labelKey) }
                                </span>
                            )) }
                        </div>
                    </div>
                    <div>
                        <div className="wkd-lbl">{ translation("key_comments") }</div>
                        <div className="wkd-rep-comment">{ detail?.comment || "—" }</div>
                    </div>
                    { recorded && <div className="wkd-sug-note">{ recorded }</div> }
                    <div className="wkd-sug-note">{ translation("key_report_determines_outcome_note") }</div>
                </div>
                <div className="wkd-sug-foot">
                    <button type="button" className="g2-button" onClick={ onClose }>{ translation("key_close") }</button>
                </div>
            </div>
        </>
    );
};

WkdInterviewReportPanel.propTypes = {
    onClose: PropTypes.func.isRequired,
    jobRef: PropTypes.string,
    detail: PropTypes.object,
    workerName: PropTypes.string,
    employerName: PropTypes.string,
    methodLocation: PropTypes.string,
};

export default React.memo(WkdInterviewReportPanel);
