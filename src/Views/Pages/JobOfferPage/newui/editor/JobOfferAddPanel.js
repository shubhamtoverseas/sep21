import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import "../../../WorkerPage/worker-detail/newui/worker-details.css";
import "../../../WorkerPage/worker-detail/newui/wkd-header-rail.css";
import "./job-offer-editor.css";
import WkdEditWorkerDrawer from "../../../WorkerPage/worker-detail/newui/WkdEditWorkerDrawer";
import { fetchEmployerDetail, fetchEmployerJobOffers } from "../../../../../redux/Slices/employer/EmployerSlice";
import JobOfferForm from "./JobOfferForm";
import JobOfferEditorFooter from "./JobOfferEditorFooter";
import useJobOfferEditor from "./useJobOfferEditor";
import { JO_EDITOR_COPY } from "../../jobOfferConstants";
import translation from "../../../../../utils/translation";

/* The panel is opened with a list row or a just-created employer; the form seeds from the FULL record (district, house
   size, household, location) so the employer context is never lost (U-0157). */
const JobOfferAddPanel = ({ employer, moduleKey, onClose, onSaved }) => {
    const dispatch = useDispatch();
    const employerId = employer?.employer_id ?? employer?.id;
    const currentEmployer = useSelector((state) => state.employer.currentEmployer);
    const fullEmployer = currentEmployer?.employer_id && String(currentEmployer.employer_id) === String(employerId) ? currentEmployer : null;
    useEffect(() => {
        if (employerId && !fullEmployer) dispatch(fetchEmployerDetail({ employer_id: employerId }));
    }, [dispatch, employerId, fullEmployer]);
    const [closeRequest, setCloseRequest] = useState(0);

    const handleSaved = useCallback(() => {
        if (employerId) {
            dispatch(fetchEmployerJobOffers({ emp_id: employerId, status: null }));
            dispatch(fetchEmployerDetail({ employer_id: employerId }));
        }
        onSaved?.();
        onClose();
    }, [dispatch, employerId, onSaved, onClose]);

    const editor = useJobOfferEditor({ mode: 'add', detail: null, employer: fullEmployer, moduleKey, onSaved: handleSaved });
    const source = fullEmployer || employer;
    /* prototype sub line: "name · 中文 · E-id · Draft" */
    const employerName = [[source?.name, source?.surname].filter(Boolean).join(' ') || source?.employer_fullname || '', source?.chinese_name].filter(Boolean).join(' · ');
    /* Escape, backdrop and ✕ are dismissals too: a dirty form asks first */
    const requestClose = useCallback(() => { if (editor.isDirty) setCloseRequest((n) => n + 1); else onClose(); }, [editor.isDirty, onClose]);

    return (
        <div className="wkd joe-scope">
            <WkdEditWorkerDrawer title={ JO_EDITOR_COPY.addTitle } onClose={ requestClose } workerName={ employerName } workerCode={ source?.reference_id } statusText={ translation("key_draft") }>
                <form className="joe joe-drawer" onSubmit={ (event) => event.preventDefault() } noValidate>
                    <div className="joe-drawer-body">
                        { fullEmployer ? (
                            <JobOfferForm
                                control={ editor.control }
                                setValue={ editor.setValue }
                                errors={ editor.errors }
                                lists={ editor.lists }
                                isMacau={ editor.isMacau }
                                recordedBelowFloor={ null }
                                copy={ editor.copy }
                                copyMissing={ editor.copyMissing }
                                showStillNeeded={ editor.showStillNeeded }
                                onSaveDraftAndClose={ editor.saveDraft }
                                idPrefix="joa"
                            />
                        ) : <div className="jor-state"><CustomSpinner /></div> }
                    </div>
                    <JobOfferEditorFooter variant="drawer" copyState={ editor.copy.copyState } canGenerate={ editor.canGenerate } canApprove={ editor.canApproveOpen } approveAllowed={ editor.approveAllowed } approveTitle={ editor.approveTitle } isDirty={ editor.isDirty } isSaving={ editor.isSaving } closeRequest={ closeRequest } onGenerate={ editor.generate } onSaveDraft={ editor.saveDraft } onApprove={ editor.approveOpen } onClose={ onClose } />
                </form>
            </WkdEditWorkerDrawer>
        </div>
    );
};

JobOfferAddPanel.propTypes = {
    employer: PropTypes.object,
    moduleKey: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    onSaved: PropTypes.func,
};

export default React.memo(JobOfferAddPanel);
