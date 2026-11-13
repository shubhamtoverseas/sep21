import React, { lazy, Suspense } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import translation from "../../../../utils/translation";
import StageLockNote from "../../ProcessingPage/processing-detail/terminal-flow/StageLockNote";
import { compactToken, isTerminalToken, stageLabel, toneFor } from "../dashboard/contractDashboardUtils";
import { dateOrDash, isActive, isProcessing } from "./contractRecordUtils";
import { CD_TOKEN, CD_TONE } from "../contractConstants";
import { CONTRACT_STAGE_TAB_KEY } from "../../ProcessingPage/processingConstants";
import { ContractLifecycleContext } from "../../ProcessingPage/processing-detail/contractLifecycle";

/* the stage panel IS the Processing stage tab (checklist, documents, status change, permissions) */
const ProcessingDetail = lazy(() => import("../../ProcessingPage/processing-detail/ProcessingDetail"));
const ContractTerminalFlow = lazy(() => import("../../ProcessingPage/processing-detail/terminal-flow/ContractTerminalFlow"));

const PILL_ICON = { [CD_TONE.GREEN]: "check", [CD_TONE.TEAL]: "plane", [CD_TONE.BLUE]: "progress", [CD_TONE.PURPLE]: "progress", [CD_TONE.GRAY]: "info" };

/**
 * Progress tab (prototype progressHTML + v28): the stage rail (completion date, compact token, prototype tones —
 * Not Required grey), the "Processing history" kicker on an Active contract, the lifecycle lock note outside Processing,
 * the End of Deployment / End of Processing recovery and auto-open (ContractTerminalFlow) and the selected stage's panel.
 */
const ProgressTab = ({ contractId, row, stages, stage, onStage, contractDetails, permissions, onChanged }) => (permissions?.stageActionPermission?.includes("view") ? (
    <>
        { isActive(row) && <div className="mcdt-hist">{ translation("key_cr_processing_history") }</div> }
        <div className="mcdt-stages g1-stage-rail" role="tablist" aria-label={ `${ translation("key_group") } ${ row.group || "" } ${ translation("key_progress").toLowerCase() }` } data-stages={ stages.length }>
            { stages.map((key) => {
                const st = row.stages?.[key];
                const token = st?.token || CD_TOKEN.NOT_READY;
                const tone = toneFor(key, token);
                const terminal = isTerminalToken(key, token);
                const date = token === CD_TOKEN.NOT_READY ? null : (st?.completed_at || st?.updated_at);
                return (
                    <button key={ key } type="button" role="tab" aria-selected={ stage === key } className={ `mcdt-stage${ stage === key ? " on" : "" }` } onClick={ () => onStage(key) }>
                        <div className="n">{ stageLabel(key) }</div>
                        <div className="d">{ dateOrDash(date) }</div>
                        <div className={ `mcdt-tok ${ tone }` } title={ compactToken(token) }>
                            <Icon name={ terminal ? "check" : (PILL_ICON[tone] || "progress") } size={ 12 } strokeWidth={ terminal ? 2.2 : 1.6 } />
                            <span>{ compactToken(token) }</span>
                        </div>
                    </button>
                );
            }) }
        </div>
        { !isProcessing(row) && <div className="mcdt-lock"><StageLockNote contractStatus={ Number(row.contract_status) } /></div> }
        { /* the stage panels and the terminal flow read the same lifecycle as this header (row.contract_status) */ }
        <ContractLifecycleContext.Provider value={ row.contract_status }>
        <div className="mcdt-lock">
            <Suspense fallback={ null }>
                <ContractTerminalFlow
                contractId={ contractId }
                contractDetails={ contractDetails }
                stageActionPermission={ permissions?.stageActionPermission }
                isChangeStatusPermission={ permissions?.isChangeStatusPermission }
                onActivated={ onChanged }
                />
            </Suspense>
        </div>
        <div className="mcdt-panel">
            <Suspense fallback={ <div className="mcdt-note">{ translation("key_loading") }…</div> }>
                <ProcessingDetail stage={ CONTRACT_STAGE_TAB_KEY[stage] || stage } onChanged={ onChanged } />
            </Suspense>
        </div>
        </ContractLifecycleContext.Provider>
    </>
) : <div className="mcdt-dcard"><div className="mcdt-note">{ translation("key_cr_stages_not_available") }</div></div>);

ProgressTab.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    row: PropTypes.object.isRequired,
    stages: PropTypes.arrayOf(PropTypes.string).isRequired,
    stage: PropTypes.string.isRequired,
    onStage: PropTypes.func.isRequired,
    contractDetails: PropTypes.object,
    permissions: PropTypes.object,
    onChanged: PropTypes.func.isRequired,
};

export default React.memo(ProgressTab);
