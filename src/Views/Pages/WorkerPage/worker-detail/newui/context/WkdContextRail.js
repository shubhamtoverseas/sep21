import React, { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from 'prop-types';
import { getRemarkEntityApi } from "./remarkEntityApi";
import { CHAT_HISTORY_PAGE_LIMIT, fetchConversactionsHistory } from "../../../../../../redux/Slices/chat/ChatSlice";
import translation from "../../../../../../utils/translation";
import useDialogFocus from "../../../../../../hooks/useDialogFocus";
import RecordFollowUp from "../../../../../../components/follow-up/RecordFollowUp";
import { hasEntityFollowUp } from "../../../../../../utils/permissions/followUpPermissionUtils";
import { CAL_FROM_EMPLOYER, CAL_FROM_WORKER, CAL_TASK_SOURCE, CAL_TASK_SOURCE_LABEL, FU_COPY_KEY } from "../../../../Calendar/newui/calendarConstants";
import { SECTION_TITLE_KEYS } from "../../../workerModuleConstants";

const WkdRemarksPanel = lazy(() => import("./WkdRemarksPanel"));
const WkdDuplicatesPanel = lazy(() => import("./WkdDuplicatesPanel"));
const WkdChatHistoryPanel = lazy(() => import("./WkdChatHistoryPanel"));
const ActionChat = lazy(() => import("../../../../../../components/chat-history-collapse-view/ActionChat"));

const chevRight = (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#676e77" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
);

const closeIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
);

const WkdContextRail = ({
    duplicateCount, duplicateText, onViewDuplicates, duplicatesMode = 'drawer',
    showRemarks, showFollowUp = false, showArHistory, showChatHistory,
    worker_id, userId, entityDetails, workerName, workerCode,
    entityType = 'worker', entityId, contextLabelKey = 'key_context',
    canChat, chatMode, onSwitchMode, chatContent,
}) => {
    const dispatch = useDispatch();
    const [drawer, setDrawer] = useState(null);
    const drawerRef = useRef(null);
    const [loadErrors, setLoadErrors] = useState({ remarks: false, chats: false });
    const remarkApi = getRemarkEntityApi(entityType);
    const remarkEntityId = entityId ?? worker_id;
    const workerRemarks = useSelector(remarkApi.select);
    const conversactionsListHistory = useSelector((state) => state.chat.conversactionsListHistory);
    const conversactionsHistoryTotal = useSelector((state) => state.chat.conversactionsHistoryTotal);
    const permissionList = useSelector((state) => state.users.permissionList);
    const entityLabelKey = entityType === 'employer' ? 'key_employer' : 'key_worker';
    /* Follow Up (1 Oct Worker #29 / Employer #7): after Remarks, before Action Required History; count-and-chevron, zero shown as 0 */
    const followUpGranted = showFollowUp && hasEntityFollowUp(permissionList?.data, entityType);
    const followUpSource = useMemo(() => ({
        type: entityType === 'employer' ? CAL_TASK_SOURCE.EMPLOYER : CAL_TASK_SOURCE.WORKER,
        id: remarkEntityId,
        ref: workerCode || '',
        sub: workerName || '',
        kindLabel: CAL_TASK_SOURCE_LABEL[entityType] || CAL_TASK_SOURCE_LABEL.worker,
        facts: entityType === 'employer' ? { employer_name: workerName || null } : { worker_name: workerName || null },
        from: entityType === 'employer' ? CAL_FROM_EMPLOYER : CAL_FROM_WORKER,
    }), [entityType, remarkEntityId, workerCode, workerName]);

    const fetchRemarksList = useCallback(() => {
        if (!remarkEntityId) return;
        dispatch(remarkApi.fetch(remarkEntityId)).then((res) => {
            setLoadErrors((prev) => ({ ...prev, remarks: Boolean(res?.error) }));
        });
    }, [dispatch, remarkApi, remarkEntityId]);

    const openDuplicates = useCallback(() => {
        if (duplicatesMode === 'link') onViewDuplicates?.();
        else setDrawer('duplicates');
    }, [duplicatesMode, onViewDuplicates]);

    const fetchChatsList = useCallback(() => {
        if (!userId) return;
        dispatch(fetchConversactionsHistory({ "limit": CHAT_HISTORY_PAGE_LIMIT, "page": 1, "user_id": userId })).then((res) => {
            setLoadErrors((prev) => ({ ...prev, chats: Boolean(res?.error) }));
        });
    }, [dispatch, userId]);

    useEffect(() => {
        if (showRemarks) fetchRemarksList();
    }, [showRemarks, fetchRemarksList]);

    useEffect(() => {
        if (showChatHistory) fetchChatsList();
    }, [showChatHistory, fetchChatsList]);

    const latestRemark = useMemo(() => {
        if (!Array.isArray(workerRemarks) || workerRemarks.length === 0) return null;
        return [...workerRemarks].sort((a, b) => b.id - a.id)[0];
    }, [workerRemarks]);

    const remarksCount = Array.isArray(workerRemarks) ? workerRemarks.length : 0;
    /* CH-7: the API total (all of the person's conversations); the loaded page length only while the API sends none */
    const chatCount = typeof conversactionsHistoryTotal === 'number'
        ? conversactionsHistoryTotal
        : (Array.isArray(conversactionsListHistory) ? conversactionsListHistory.length : 0);

    const closeDrawer = useCallback(() => {
        setDrawer(null);
    }, []);

    useDialogFocus(drawerRef, closeDrawer, Boolean(drawer));

    return (
        <>
            { /* the segment control stays fixed above the scrolling cards (prototype rail anatomy) */ }
            <div className="wkd-rail-seg-wrap">
                <div className="wkd-rail-seg">
                    <button
                        type="button"
                        className={ `seg${ !chatMode ? ' on' : '' }` }
                        onClick={ () => chatMode && onSwitchMode('context') }
                    >
                        { translation(contextLabelKey) }
                        { chatMode && <span className="ctx-dot ctx-dot-amber" /> }
                    </button>
                    { canChat && (
                        <button
                            type="button"
                            className={ `seg${ chatMode ? ' on' : '' }` }
                            onClick={ () => !chatMode && onSwitchMode('chat') }
                        >
                            { translation('key_chat') }
                            { !chatMode && <span className="ctx-dot ctx-dot-blue" /> }
                        </button>
                    ) }
                </div>
            </div>

            <div className="wkd-rail-cards">
            { chatMode && chatContent }

            { !chatMode && duplicateCount > 0 && (
                <button type="button" className="ctx-rail-btn ctx-warning" onClick={ openDuplicates }>
                    <span className="ctx-warn-icon">!</span>
                    <span className="ctx-grow">
                        <span className="ctx-title">{ duplicateText }</span>
                        <span className="ctx-link-copy">{ translation('key_review_matches') } →</span>
                    </span>
                </button>
            ) }

            { !chatMode && showRemarks && (
                <button type="button" className="ctx-rail-btn" onClick={ () => setDrawer('remarks') }>
                    <span className="ctx-grow">
                        <span className="ctx-row">
                            <span className="ctx-title">{ translation('key_remarks') }</span>
                            <span className="ctx-count">{ remarksCount }</span>
                        </span>
                        <span className="ctx-preview">{ latestRemark?.remarks || translation('key_no_remarks') }</span>
                    </span>
                    { chevRight }
                </button>
            ) }

            { !chatMode && showFollowUp && (
                <RecordFollowUp source={ followUpSource } granted={ followUpGranted }>
                    { ({ count, open, launcherRef }) => (
                        <button ref={ launcherRef } type="button" className="ctx-rail-btn" data-fu-launcher={ entityType } onClick={ open }>
                            <span className="ctx-grow">
                                <span className="ctx-row">
                                    <span className="ctx-title">{ translation(FU_COPY_KEY.followUp) }</span>
                                    <span className="ctx-count" data-fu-count={ count }>{ count }</span>
                                </span>
                            </span>
                            { chevRight }
                        </button>
                    ) }
                </RecordFollowUp>
            ) }

            { !chatMode && showArHistory && (
                <button type="button" className="ctx-rail-btn" onClick={ () => setDrawer('ar') }>
                    <span className="ctx-grow"><span className="ctx-title">{ translation('key_action_required_history') }</span></span>
                    { chevRight }
                </button>
            ) }

            { !chatMode && showChatHistory && (
                <button type="button" className="ctx-rail-btn" onClick={ () => setDrawer('chat') }>
                    <span className="ctx-grow">
                        <span className="ctx-row">
                            <span className="ctx-title">{ translation('key_chat_history') }</span>
                            <span className="ctx-count">{ chatCount }</span>
                        </span>
                    </span>
                    { chevRight }
                </button>
            ) }
            </div>

            { drawer && (
                <>
                    <div className="ctx-backdrop" onClick={ closeDrawer } role="presentation" />
                    <div ref={ drawerRef } className="ctx-drawer" role="dialog" aria-modal="true" aria-label={ translation(SECTION_TITLE_KEYS[drawer]) }>
                        <div className="ctx-drawer-head">
                            <div>
                                <h2>{ translation(SECTION_TITLE_KEYS[drawer]) }</h2>
                                { workerName && (
                                    <div>{ workerName } · <span className="mono-neutral">{ workerCode }</span></div>
                                ) }
                            </div>
                            <button type="button" className="ctx-icon-btn" aria-label={ translation('key_close') } onClick={ closeDrawer }>
                                { closeIcon }
                            </button>
                        </div>
                        <div className="ctx-drawer-body">
                            <Suspense fallback={ <div className="ctx-state"><span className="ctx-spinner" /></div> }>
                                { drawer === 'remarks' && (
                                    loadErrors.remarks ? (
                                        <div className="ctx-state">
                                            <span className="ctx-state-icon">!</span>
                                            <strong>{ translation('key_remarks_could_not_be_loaded') }</strong>
                                            <span>{ translation('key_source_data_not_changed') }</span>
                                            <button type="button" className="ctx-btn secondary" onClick={ fetchRemarksList }>{ translation('key_retry') }</button>
                                        </div>
                                    ) : <WkdRemarksPanel worker_id={ worker_id } entityType={ entityType } entityId={ remarkEntityId } onRefetch={ fetchRemarksList } />
                                ) }
                                { drawer === 'ar' && (
                                    <ActionChat entityDetails={ entityDetails } user_type="worker" />
                                ) }
                                { drawer === 'duplicates' && (
                                    <WkdDuplicatesPanel userId={ userId } currentWorker={ entityDetails } onOpenFullList={ onViewDuplicates } />
                                ) }
                                { drawer === 'chat' && (
                                    loadErrors.chats ? (
                                        <div className="ctx-state">
                                            <span className="ctx-state-icon">!</span>
                                            <strong>{ translation('key_chat_history_could_not_be_loaded') }</strong>
                                            <span>{ translation('key_source_data_not_changed') }</span>
                                            <button type="button" className="ctx-btn secondary" onClick={ fetchChatsList }>{ translation('key_retry') }</button>
                                        </div>
                                    ) : <WkdChatHistoryPanel userId={ userId } workerName={ workerName } entityLabelKey={ entityLabelKey } totalCount={ chatCount } />
                                ) }
                            </Suspense>
                        </div>
                    </div>
                </>
            ) }
        </>
    );
};

WkdContextRail.propTypes = {
    duplicateCount: PropTypes.number,
    duplicateText: PropTypes.string,
    onViewDuplicates: PropTypes.func,
    duplicatesMode: PropTypes.oneOf(['drawer', 'link']),
    entityType: PropTypes.oneOf(['worker', 'employer']),
    entityId: PropTypes.any,
    contextLabelKey: PropTypes.string,
    showRemarks: PropTypes.bool,
    showFollowUp: PropTypes.bool,
    showArHistory: PropTypes.bool,
    showChatHistory: PropTypes.bool,
    worker_id: PropTypes.any,
    userId: PropTypes.any,
    entityDetails: PropTypes.object,
    workerName: PropTypes.string,
    workerCode: PropTypes.string,
    canChat: PropTypes.bool,
    chatMode: PropTypes.bool,
    onSwitchMode: PropTypes.func,
    chatContent: PropTypes.node,
};

export default React.memo(WkdContextRail);
