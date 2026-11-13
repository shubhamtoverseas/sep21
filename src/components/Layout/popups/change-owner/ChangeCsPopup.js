import React, { useState, useRef } from "react";
import PropTypes from "prop-types";
import "./change-owner-popup.css";
import userPrefix from "../../../../assets/img/svg/user-prefix.svg"
import { useDispatch } from 'react-redux';
import { changeCsStaff, searchCsStaff, searchOtherCsStaff } from '../../../../redux/Slices/common/cs/CsSlice';
import { showSuccessOrError } from "../../../../services/commonService";
import translation from "../../../../utils/translation";
import { chagneProcessingCs } from "../../../../redux/Slices/processing/ProcessingSlice";
import { fetchEmployerDetail, fetchEmployerJobOffers } from "../../../../redux/Slices/employer/EmployerSlice";
import { useSearchParams } from "react-router-dom";
import { fetchJobDetail } from "../../../../redux/Slices/job-offer/JobOfferSlice";
import { validateChangeUserGroupCsInterpreter } from "../../../../redux/Slices/worker/WorkerSlice";
import ProcessingStaffSearch from "./ProcessingStaffSearch";

function ChangeCsPopup(props) {
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();
    const jobOfferId = searchParams.get("jobOfferId");
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState([]);
    const [isSubmitAndCsEmpty, setIsSubmitAndCsEmpty] = useState(false);
    const [employerCsList, setEmployerCsList] = useState([]);
    // Excel Contract No. 20: an owner transfer onto the current CS Assistant must resolve the assistant
    // explicitly in the same operation (remove or replace) — never preselected, never silent.
    const [assistantAction, setAssistantAction] = useState("");
    const [replacementAssistant, setReplacementAssistant] = useState(null);
    const [assistantError, setAssistantError] = useState("");
    const isProcessing = props.entity?.name === "processing";
    const collidesWithAssistant = isProcessing && Boolean(props.csAssistant?.id) &&
        Boolean(selectedStaff?.id) && Number(selectedStaff.id) === Number(props.csAssistant.id);


    const dropdownRef = useRef(null);

    const handleSearchCurrentCS = (e) => {
        setSearchQuery(e?.target?.value);
        setShowDropdown(true);
        if (props.entity?.name === "processing") {
            dispatch(searchOtherCsStaff({
                type: 'contract',
                search_text: e.target.value,
                employer_id: props.employerId,
                rel_id: props.entity?.id
            })).then((res) => {
                if (!res.error) {
                    setEmployerCsList(res.payload?.data);
                }
            });
        } else {
            dispatch(searchCsStaff({
                search_text: e.target.value,
                employer_id: props.entity.id,
            })).then((res) => {
                if (!res.error) {
                    setEmployerCsList(res.payload?.data);
                }
            });
        }

    }

    const handleOutsideClick = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setShowDropdown(false);
        }
    };

    const handleStaffClick = (staff) => {
        setSelectedStaff(staff);
        setAssistantAction("");
        setReplacementAssistant(null);
        setAssistantError("");
        setSearchQuery(staff.name);
        setShowDropdown(false);
        setIsSubmitAndCsEmpty(false);
        // setIsNewCS(true);
        console.log(selectedStaff)
    }

    React.useEffect(() => {
        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, []);

    const [isNotificationEmail, setIsNotificationEmail] = useState(0);

    const handleSubmit = () => {
        if (!selectedStaff || !searchQuery) {
            setIsSubmitAndCsEmpty(true);
            return;
        }
        let payload = {};
        if (props.entity.name === "processing") {
            if (collidesWithAssistant) {
                if (!props.canChangeCsAssistant) {
                    setAssistantError(translation('key_owner_is_assistant_no_permission'));
                    return;
                }
                if (assistantAction !== "remove" && assistantAction !== "replace") {
                    setAssistantError(translation('key_choose_remove_or_replace_cs_assistant'));
                    return;
                }
                if (assistantAction === "replace" && !replacementAssistant?.id) {
                    setAssistantError(translation('key_select_cs_assistant'));
                    return;
                }
                payload.cs_assistant_action = assistantAction;
                if (assistantAction === "replace") {
                    payload.replacement_cs_assistant_staff_id = Number(replacementAssistant.id);
                }
            }
            payload.contract_id = props.entity.id;
            payload.staff_id = selectedStaff.id;
            payload.send_email = isNotificationEmail;
            dispatch(chagneProcessingCs(payload)).then((res) => {
                showSuccessOrError(res);
                if (!res.error) {
                    props.onRefreshList();
                    props.onClose();
                }
            });
        } else if (props.entity.name === "employer") {
            payload.employer_id = props.entity.id;
            payload.cs_staff_id = selectedStaff.id;
            payload.send_email = isNotificationEmail;
            dispatch(changeCsStaff(payload)).then((res) => {
                showSuccessOrError(res);
                if (res?.payload?.status) {
                    dispatch(validateChangeUserGroupCsInterpreter({
                        employer_id: props.entity.id,
                        user_type: "cs",
                        user_id: selectedStaff.id
                    }))
                }
                if (!res.error) {
                    if (props.entity?.from === 'emp-detail') {
                        dispatch(fetchEmployerDetail({ 'employer_id': props.entity.id }))
                        dispatch(fetchEmployerJobOffers({ emp_id: props.entity.id, status: null }));
                        if (jobOfferId) {
                            dispatch(fetchJobDetail(jobOfferId));
                        }
                    } else if (props?.entity?.from === 'emp-global-list') {
                        props.onRefreshList();
                    }
                    props.onClose();
                }
            });
        }
    }

    const handleOnSendEmail = (e) => {
        if (e.target.checked) {
            setIsNotificationEmail(1);
        } else {
            setIsNotificationEmail(0);
        }
    }

    return (<div
        className="modal fade modalCustom newRegistrationJO show"
        id="newRegistrationJO"
        tabIndex={-1}
        aria-labelledby="exampleModalCenterTitle"
        style={{
            display: "block",
            background: "rgba(0, 0, 0, 0.7)",
        }}
        aria-modal="true"
        role="dialog"
    >
        <div className="modal-dialog" role="document">
            <div className="modal-content">
                <div className="modal-header text-center">
                    <h5 className="modal-title black" id="exampleModalLabel">{props.title}</h5>
                </div>
                <div className="modal-body">
                    <div className='row mb-3'>
                        <div className='col search-owner'>
                            <div className="d-flex justify-content-between align-items-center">
                                 <label className="fz14">
                                <b>{translation('key_current_cs')}</b> : {
                                    props?.csName
                                        ? props?.csEmail
                                            ? `${props.csName} (${props?.csEmail})`
                                            : props.csName
                                        : ''
                                }
                            </label>
                            {props?.branchName && <label className="fz14">
                               <b>{translation('key_branch')}</b>  : {props?.branchName || ''}
                            </label>}
                            </div>
                            
                            <div className='search-cs position-relative'>
                                <div className='cs-prefix-wrapper'>
                                    <img src={userPrefix} />
                                </div>
                                <input type='text' placeholder={ translation('key_search_new_cs') }
                                    value={searchQuery} onChange={handleSearchCurrentCS} className='form-control border-0' />
                                <i className='ri-search-line' />
                                {(isSubmitAndCsEmpty && searchQuery === '') && (
                                    <small className="text-danger">{translation('key_cs_cannot_be_empty')}.</small>
                                )}
                                {showDropdown && employerCsList.length > 0 && (
                                    <ul className="dropdown-menu show w-100 staff-list-dropdown">
                                        {employerCsList.map((staff) => (
                                            <li
                                                key={staff.id}
                                                className="dropdown-item d-flex justify-content-between align-items-center"
                                                onClick={() => { handleStaffClick(staff) }}
                                            >
                                                <span>{staff.name}</span>
                                                <span className="badge badge-primary badge-pill">
                                                    {staff.employers_count} employers
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {showDropdown && employerCsList.length === 0 && (
                                    <ul className="dropdown-menu show w-100">
                                        <li className="dropdown-item text-muted">{translation('key_no_results_found')}</li>
                                    </ul>
                                )}
                            </div>

                        </div>
                    </div>
                    {collidesWithAssistant && (
                        <div className='row mb-3'>
                            <div className='col'>
                                <div className="alert alert-warning fz14 mb-2" role="alert">
                                    {translation('key_new_owner_is_current_cs_assistant')} ({props.csAssistant?.name})
                                </div>
                                {props.canChangeCsAssistant && (
                                    <>
                                        <div className="form-check mb-1">
                                            <input className="form-check-input" type="radio" name="cs-assistant-resolution" id="cs-assistant-remove"
                                                checked={assistantAction === "remove"}
                                                onChange={() => { setAssistantAction("remove"); setAssistantError(""); }} />
                                            <label className="form-check-label ml-2 fz14" htmlFor="cs-assistant-remove">
                                                {translation('key_remove_cs_assistant')}
                                            </label>
                                        </div>
                                        <div className="form-check mb-2">
                                            <input className="form-check-input" type="radio" name="cs-assistant-resolution" id="cs-assistant-replace"
                                                checked={assistantAction === "replace"}
                                                onChange={() => { setAssistantAction("replace"); setAssistantError(""); }} />
                                            <label className="form-check-label ml-2 fz14" htmlFor="cs-assistant-replace">
                                                {translation('key_replace_cs_assistant')}
                                            </label>
                                        </div>
                                        {assistantAction === "replace" && (
                                            <ProcessingStaffSearch
                                                contractId={props.entity.id}
                                                employerId={props.employerId}
                                                placeholder={translation('key_search_cs_assistant')}
                                                excludeIds={[selectedStaff?.id]}
                                                selected={replacementAssistant}
                                                onSelect={(staff) => { setReplacementAssistant(staff); setAssistantError(""); }}
                                                invalid={Boolean(assistantError)}
                                            />
                                        )}
                                    </>
                                )}
                                {assistantError && <small className="text-danger d-block mt-1">{assistantError}</small>}
                            </div>
                        </div>
                    )}
                    {/* {isNewCS && <> */}
                    <div className='row mb-3'>
                        <div className='col'>
                            <div className="form-check">
                                <input className="form-check-input" type="checkbox" value="" id="defaultCheck1" onChange={handleOnSendEmail} />
                                <label className="form-check-label ml-2 grey3 fz16" htmlFor="defaultCheck1">
                                    {translation('key_send_notification_email')}
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className='row'>
                        <div className='col'>
                            {/* <p className='fz14 grey3'><span className='black'>The new CS </span>will also become the owner of these records related to that are owned by <span className='black'>the current record owner.</span> </p> */}
                            <p className='fz14 grey3'>{translation('key_the_new_cs_will_also_become_owner_of_these_records')} </p>
                            <ul className='mb-0 grey fz14 w-100 pl-3 grey3'>
                                <li className='w-100 mb-2'>{translation('key_notes_and_attachments')}</li>
                                <li className='w-100'>{translation('key_open_activities')}</li>
                            </ul>
                        </div>
                    </div>
                    {/* </>} */}

                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-outline mb-0" onClick={props.onClose} data-dismiss="modal">{translation('key_cancel')}</button>
                    <button type="button" className="btn filled-btn mb-0" onClick={handleSubmit}>{translation('key_submit')}</button>
                </div>
            </div>
        </div>
    </div>)
}
ChangeCsPopup.propTypes = {
    onClose: PropTypes.func,
    title: PropTypes.string,
    // selectedRows: PropTypes.array,
    csName: PropTypes.string,
    csEmail: PropTypes.string,
    branchName: PropTypes.string,
    branchEmail: PropTypes.string,
    entity: PropTypes.object.isRequired,
    employerId: PropTypes.number,
    onRefreshList: PropTypes.func,
    csAssistant: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
    }),
    canChangeCsAssistant: PropTypes.bool,
};
export default ChangeCsPopup;