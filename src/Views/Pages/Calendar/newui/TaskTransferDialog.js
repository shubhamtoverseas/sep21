import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { getCalendarTaskTransferTargetsAPI, transferCalendarTaskAPI } from "../../../../services/calendar";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import useDialogFocus from "../../../../hooks/useDialogFocus";
import Btn from "../../../../components/ui/Btn";
import translation from "../../../../utils/translation";
import { CAL_HTTP, CAL_TASK_COPY } from "./calendarConstants";

/*
 * Transfer responsibility (prototype task-ui transferDialog; HRMS API spec A6 / A7): the eligible staff come from the
 * server, the choice is re-validated at commit, the creator never changes and no notification is sent. Cancel, × and
 * the backdrop never commit.
 */
const TaskTransferDialog = ({ task, onClose, onDone }) => {
    const cardRef = useRef(null);
    const [targets, setTargets] = useState(null);       /* null = loading */
    const [target, setTarget] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const close = useCallback(() => { if (!saving) onClose(); }, [onClose, saving]);
    useDialogFocus(cardRef, close);

    useEffect(() => {
        let live = true;
        getCalendarTaskTransferTargetsAPI({ task_id: task.taskId })
            .then((res) => { if (live) setTargets(Array.isArray(res?.data?.data) ? res.data.data : []); })
            .catch((err) => {
                if (!live) return;
                setTargets([]);
                setError(err?.response?.status === CAL_HTTP.FORBIDDEN ? CAL_TASK_COPY.transferNoPerm : (err?.response?.data?.message || ''));
            });
        return () => { live = false; };
    }, [task.taskId]);

    const confirm = () => {
        if (!target) { setError(CAL_TASK_COPY.transferPick); return; }
        setSaving(true);
        setError('');
        transferCalendarTaskAPI({ task_id: task.taskId, to_staff_id: Number(target) })
            .then((res) => {
                if (res?.data?.status === false) { setError(res?.data?.message || CAL_TASK_COPY.transferIneligible); setSaving(false); return; }
                const picked = targets.find((row) => String(row.id) === String(target)) || null;
                ShowToast('success', `${ CAL_TASK_COPY.toast.transferred } ${ picked?.name || '' }`.trim());
                onDone(picked);
                onClose();
            })
            .catch((err) => {
                const status = err?.response?.status;
                setError(status === CAL_HTTP.FORBIDDEN ? CAL_TASK_COPY.transferNoPerm : (err?.response?.data?.message || CAL_TASK_COPY.transferIneligible));
                setSaving(false);
            });
    };

    const hasTargets = Array.isArray(targets) && targets.length > 0;
    /* initial focus: the target select once the eligible staff arrived (prototype task-ui transferDialog) */
    useEffect(() => { if (hasTargets) document.getElementById('cal-tr-target')?.focus(); }, [hasTargets]);
    return createPortal(
        <div className="cal-task-editor" role="presentation" onClick={ (event) => { if (event.target === event.currentTarget) close(); } }>
            <div ref={ cardRef } className="dlg transfer" role="dialog" aria-modal="true" aria-labelledby="cal-tr-heading" data-cal-task-transfer={ task.taskId }>
                <div className="hd">
                    <h3 id="cal-tr-heading">{ CAL_TASK_COPY.transfer }</h3>
                    <button type="button" className="x" aria-label={ translation('key_close') } onClick={ close }>×</button>
                </div>
                <div className="bd">
                    <div className="tr-title">{ task.title || '—' }</div>
                    <div className="tr-who">
                        <span>{ CAL_TASK_COPY.responsibleStaff }</span> { task.responsible?.name || task.createdBy?.name || '—' } · <span>{ CAL_TASK_COPY.createdBy }</span> { task.createdBy?.name || '—' }
                    </div>
                    { /* FIN-F04: the transfer sends no alert, changes no due time and rewrites no delivered alert */ }
                    <div className="tr-note">{ CAL_TASK_COPY.transferNote }</div>
                    { targets === null ? <CustomSpinner /> : (
                        <div className="fld">
                            <label htmlFor="cal-tr-target">{ CAL_TASK_COPY.transferTo }</label>
                            { hasTargets ? (
                                <select id="cal-tr-target" value={ target } onChange={ (event) => { setTarget(event.target.value); setError(''); } } disabled={ saving }>
                                    <option value="">{ CAL_TASK_COPY.transferPick }</option>
                                    { targets.map((row) => <option key={ row.id } value={ row.id }>{ row.name }</option>) }
                                </select>
                            ) : (
                                !error && <div className="tr-none">{ CAL_TASK_COPY.transferNone }</div>
                            ) }
                        </div>
                    ) }
                    { error && <div className="formerr" role="alert">{ error }</div> }
                </div>
                <div className="ft">
                    <Btn variant="secondary" onClick={ close } disabled={ saving }>{ translation('key_cancel') }</Btn>
                    { hasTargets && <Btn variant="primary" onClick={ confirm } disabled={ saving }>{ saving ? translation('key_loading') : CAL_TASK_COPY.transfer }</Btn> }
                </div>
            </div>
        </div>,
        document.body
    );
};

TaskTransferDialog.propTypes = {
    task: PropTypes.shape({
        taskId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        title: PropTypes.string,
        responsible: PropTypes.object,
        createdBy: PropTypes.object,
    }).isRequired,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

export default TaskTransferDialog;
