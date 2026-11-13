import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import "./job-offer-editor.css";
import Btn from "../../../../../components/ui/Btn";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import { fetchJobDetail } from "../../../../../redux/Slices/job-offer/JobOfferSlice";
import { fetchEmployerDetail } from "../../../../../redux/Slices/employer/EmployerSlice";
import { useJobOfferPermissions } from "../../../../../utils/permissions/jobPermissionsUtils";
import { headingCase } from "../../../../../utils/utils";
import translation from "../../../../../utils/translation";
import { joStatusLabel } from "../JoStatusTag";
import JobOfferForm from "./JobOfferForm";
import JobOfferEditorFooter from "./JobOfferEditorFooter";
import useJobOfferEditor from "./useJobOfferEditor";
import { JO_EDITOR_COPY, JO_FROM, JO_LOAD_STATE, JO_ROUTE_QUERY, jobOfferDetailsPath } from "../../jobOfferConstants";

const C = JO_EDITOR_COPY;
const httpStatusOf = (res) => Number(res?.payload?.data?.status ?? res?.payload?.data?.httpStatus ?? res?.payload?.httpStatus ?? 0);

const JobOfferEditPage = () => {
    const { jobId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const from = searchParams.get(JO_ROUTE_QUERY.FROM);

    const { jobDetailView } = useSelector((state) => state.jobOffer);
    const currentEmployer = useSelector((state) => state.employer.currentEmployer);
    const { permissionList, ownerOnboardingList } = useSelector((state) => state.users);
    const detail = jobDetailView && String(jobDetailView?.id) === String(jobId) ? jobDetailView : null;
    const employerId = detail?.employer_id ?? null;
    const employer = currentEmployer?.employer_id && String(currentEmployer.employer_id) === String(employerId) ? currentEmployer : null;
    /* owner = the CS stamped on the record (`is_owner`, D-18) — the employer's CS only until the API carries it (U-0152) */
    const { canViewDetails, canEditJobOffer } = useJobOfferPermissions(permissionList, ownerOnboardingList, employerId, typeof detail?.is_owner === 'boolean' ? detail.is_owner : undefined);
    /* Details View without Edit Job Offer opens the same page read-only (U-0136) */
    const readOnly = !canEditJobOffer;
    const [loadState, setLoadState] = useState(detail ? JO_LOAD_STATE.READY : JO_LOAD_STATE.LOADING);
    const [closeRequest, setCloseRequest] = useState(0);

    useEffect(() => {
        setLoadState(JO_LOAD_STATE.LOADING);
        dispatch(fetchJobDetail(jobId)).then((res) => {
            if (!res?.error) { setLoadState(JO_LOAD_STATE.READY); return; }
            const code = httpStatusOf(res);
            setLoadState(code === 403 || code === 401 ? JO_LOAD_STATE.DENIED : code === 404 ? JO_LOAD_STATE.INVALID : JO_LOAD_STATE.ERROR);
        });
    }, [dispatch, jobId]);
    useEffect(() => {
        if (employerId && String(currentEmployer?.employer_id) !== String(employerId)) dispatch(fetchEmployerDetail({ employer_id: employerId }));
    }, [dispatch, employerId, currentEmployer?.employer_id]);

    const backToRecord = useCallback(() => {
        if (from && from !== JO_FROM.DASHBOARD) { navigate(-1); return; }
        navigate(jobOfferDetailsPath(jobId));
    }, [navigate, jobId, from]);

    const editor = useJobOfferEditor({ mode: 'edit', detail: employer ? detail : null, employer, moduleKey: 'employer', onSaved: backToRecord });
    /* Back and the crumb are dismissals too: a dirty form asks first (U-0157) */
    const requestBack = useCallback((event) => {
        if (!readOnly && editor.isDirty) { event?.preventDefault?.(); setCloseRequest((n) => n + 1); return; }
        backToRecord();
    }, [readOnly, editor.isDirty, backToRecord]);

    const crumb = (
        <nav className="jor-routebar" aria-label={ translation('key_job_offers') }>
            <Link className="here" to={ jobOfferDetailsPath(jobId) } onClick={ requestBack }>{ C.crumbRecord }</Link>
            <span className="sep">/</span>
            <span className="here-static">{ C.editTitle }</span>
            { /* prototype adapter writes the ROUTE here, not the bare reference */ }
            <code className="mono">{ detail?.reference_id ? `/job-offers/${ detail.reference_id }/edit` : '' }</code>
        </nav>
    );

    if (loadState === JO_LOAD_STATE.DENIED || (detail && !canViewDetails)) {
        return <div className="joe">{ crumb }<section className="jor-state" role="status" data-mc-denial="neutral"><b>{ C.deniedTitle }</b><span>{ C.deniedText }</span></section></div>;
    }
    if (loadState === JO_LOAD_STATE.INVALID) {
        return <div className="joe">{ crumb }<section className="jor-state" role="status"><b>{ C.invalidTitle }</b><code className="mono">{ String(jobId || '') }</code></section></div>;
    }
    if (loadState === JO_LOAD_STATE.ERROR && !detail) {
        return <div className="joe">{ crumb }<section className="jor-state" role="status"><b>{ translation('key_couldnt_load_this_view') }</b><div><Btn variant="secondary" onClick={ () => dispatch(fetchJobDetail(jobId)) }>{ translation('key_retry') }</Btn></div></section></div>;
    }
    if (!detail || !employer) return <div className="joe">{ crumb }<div className="jor-state"><CustomSpinner /></div></div>;

    const sub = [detail.employers_fullname || employer.name, employer.chinese_name].filter(Boolean).join(' · ');

    return (
        <div className="joe">
            { crumb }
            <form className="joe-shell" onSubmit={ (event) => event.preventDefault() } noValidate>
                <div className="hd">
                    <div>
                        <h1>{ headingCase(C.editTitle) }</h1>
                        <p className="sub">{ sub } · <span className="mono">{ detail.reference_id }</span> · <span>{ joStatusLabel(detail.status) }</span>{ readOnly && <> · <span className="opttag">{ C.readOnly }</span></> }</p>
                    </div>
                    <Btn variant="secondary" className="joe-back" onClick={ requestBack }>{ C.back }</Btn>
                </div>
                <JobOfferForm
                    control={ editor.control }
                    setValue={ editor.setValue }
                    errors={ editor.errors }
                    lists={ editor.lists }
                    isMacau={ editor.isMacau }
                    recordedBelowFloor={ editor.recordedBelowFloor }
                    copy={ editor.copy }
                    copyMissing={ editor.copyMissing }
                    showStillNeeded={ editor.showStillNeeded }
                    readOnly={ readOnly }
                    onSaveDraftAndClose={ () => { editor.saveDraft(); } }
                    idPrefix={ `joe-${ jobId }` }
                />
                <JobOfferEditorFooter copyState={ editor.copy.copyState } approved={ editor.approved } canGenerate={ editor.canGenerate } canApprove={ editor.canApproveOpen } approveAllowed={ editor.approveAllowed } approveTitle={ editor.approveTitle } openRecord={ editor.isOpenRecord } onSave={ editor.saveChanges } isDirty={ editor.isDirty } isSaving={ editor.isSaving } readOnly={ readOnly } closeRequest={ closeRequest } onGenerate={ editor.generate } onSaveDraft={ editor.saveDraft } onApprove={ editor.approveOpen } onClose={ backToRecord } />
            </form>
        </div>
    );
};

export default JobOfferEditPage;
