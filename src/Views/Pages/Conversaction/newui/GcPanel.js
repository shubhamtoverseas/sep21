import React, { useLayoutEffect, useRef } from "react";
import PropTypes from "prop-types";
import GcIcon from "./gcIcons";
import translation from "../../../../utils/translation";
import GcEmployerSummary from "./panels/GcEmployerSummary";
import GcWorkerSummary from "./panels/GcWorkerSummary";
import GcJobOfferDetails from "./panels/GcJobOfferDetails";
import GcWorkerProfile from "./panels/GcWorkerProfile";
import GcInvitedApplied from "./panels/GcInvitedApplied";
import GcJoWorkerView from "./panels/GcJoWorkerView";
import GcPanelDenied from "./panels/GcPanelDenied";
import { PANEL_TITLE_KEYS, SUMMARY_VIEWS } from "./gcConstants";


export const gcPanelMode = (stack) => {
    if (!stack.length) return "";
    return SUMMARY_VIEWS.includes(stack[stack.length - 1].view) ? "mode-summary" : "mode-deep";
};

const GcPanel = ({ stack, loading, onBack, onClose, onPush, panelProps }) => {
    const frame = stack[stack.length - 1];
    /* D-CHAT-IA-01: every level keeps its own scroll — a pushed level opens at the top, Back returns to where it was left */
    const bodyRef = useRef(null);
    const scrollByFrame = useRef(new WeakMap());
    useLayoutEffect(() => {
        if (bodyRef.current && frame) bodyRef.current.scrollTop = scrollByFrame.current.get(frame) || 0;
    }, [frame]);
    const rememberScroll = (e) => { if (frame) scrollByFrame.current.set(frame, e.currentTarget.scrollTop); };

    if (!stack.length) return <aside className="gc-panel-col" />;
    const canBack = stack.length > 1;

    const renderBody = () => {
        if (loading) {
            return (
                <div className="gc-panel-skel">
                    <div className="gc-skel" style={ { width: "55%" } } />
                    <div className="gc-skel" style={ { width: "35%" } } />
                    <div className="gc-skel" style={ { width: "100%", height: 64 } } />
                    <div className="gc-skel" style={ { width: "100%", height: 34 } } />
                </div>
            );
        }
        switch (frame.view) {
            case "emp-sum": return <GcEmployerSummary onPush={ onPush } { ...panelProps } />;
            case "wkr-sum": return <GcWorkerSummary onPush={ onPush } { ...panelProps } />;
            case "jod": return <GcJobOfferDetails frame={ frame } onPush={ onPush } { ...panelProps } />;
            case "jo-app-details": return <GcJobOfferDetails frame={ frame } onPush={ onPush } { ...panelProps } />;
            case "profile": return <GcWorkerProfile frame={ frame } { ...panelProps } />;
            case "invited": return <GcInvitedApplied onPush={ onPush } { ...panelProps } />;
            case "jo-worker-view": return <GcJoWorkerView frame={ frame } { ...panelProps } />;
            default: return <GcPanelDenied />;
        }
    };

    return (
        <aside className={ `gc-panel-col ${ gcPanelMode(stack) }` }>
            <div className="gc-panel-inner">
                <div className="gc-panel-head">
                    { canBack && (
                        <button type="button" className="gc-panel-back" onClick={ onBack } aria-label={ translation('key_back') }>
                            <GcIcon name="back" />
                        </button>
                    ) }
                    <span className="gc-panel-title">{ translation(PANEL_TITLE_KEYS[frame.view] || "") }</span>
                    <button type="button" className="gc-panel-back" onClick={ onClose } aria-label={ translation('key_close') }>
                        <GcIcon name="close" />
                    </button>
                </div>
                <div className="gc-panel-body" ref={ bodyRef } onScroll={ rememberScroll }>{ renderBody() }</div>
            </div>
        </aside>
    );
};

GcPanel.propTypes = {
    stack: PropTypes.array.isRequired,
    loading: PropTypes.bool,
    onBack: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onPush: PropTypes.func.isRequired,
    panelProps: PropTypes.object.isRequired,
};

export default React.memo(GcPanel);
