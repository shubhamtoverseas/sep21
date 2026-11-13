import React, { useState, useRef } from "react";
import PropTypes from "prop-types";
import "./change-owner-popup.css";
import userPrefix from "../../../../assets/img/svg/user-prefix.svg"
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { searchStaff, updateEmployerCS } from '../../../../redux/Slices/common/cs/CsSlice';
import { dispatchWithHandling } from '../../../../utils/dispatchHandler';
import { showSuccessOrError } from "../../../../services/commonService";
import translation from "../../../../utils/translation";
function ChangeOwnerBulkPopup(props) {
    const dispatch = useDispatch();
    const { staffList } = useSelector((state) => state.cs);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState([]);
    const [isSubmitAndCsEmpty, setIsSubmitAndCsEmpty] = useState(false);
    const [isNewCS, setIsNewCS] = useState(false);

    const dropdownRef = useRef(null);

    const handleSearchCurrentCS = (e) => {
        if (e?.target?.value) {
            setSearchQuery(e?.target?.value);
            setShowDropdown(true);
            dispatchWithHandling(dispatch, searchStaff({
                type: "employer",
                search: e.target.value
            }));
        } else {
            setSearchQuery('');
        }

        console.log(e?.target?.value, 'staffList')
    }

    const handleOutsideClick = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setShowDropdown(false);
        }
    };

    const handleStaffClick = (staff) => {
        setSelectedStaff(staff);
        setSearchQuery(staff.name);
        setShowDropdown(false);
        setIsSubmitAndCsEmpty(false);
        setIsNewCS(true);
        console.log(selectedStaff)
    }

    React.useEffect(() => {
        document.addEventListener("click", handleOutsideClick);
        return () => document.removeEventListener("click", handleOutsideClick);
    }, []);

    const handleSubmit = () => {
        if (!selectedStaff || !searchQuery) {
            setIsSubmitAndCsEmpty(true);
            return;
        }
        const employerIds = props.selectedRows.map(item => item.employer_id);
        dispatch(updateEmployerCS({ employer_id: employerIds, cs_staff_id: selectedStaff.id })).then((res) => {
            showSuccessOrError(res);
        });
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
                            <label className='fz14 grey fw-700'>{ translation('key_select_current_owner') }</label>
                            <div className='search-cs position-relative'>
                                <div className='cs-prefix-wrapper'>
                                    <img src={userPrefix} />
                                </div>
                                <input type='text' placeholder={ translation('key_search_new_cs') }
                                    value={searchQuery} onChange={handleSearchCurrentCS} className='form-control border-0' />
                                <i className='ri-search-line' />
                                {(isSubmitAndCsEmpty && searchQuery === '') && (
                                    <small className="text-danger">{ translation('key_cs_cannot_be_empty') }</small>
                                )}
                                {showDropdown && staffList.length > 0 && (
                                    <ul className="dropdown-menu show w-100">
                                        {staffList.map((staff) => (
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
                                {showDropdown && staffList.length === 0 && (
                                    <ul className="dropdown-menu show w-100">
                                        <li className="dropdown-item text-muted">{translation('key_no_results_found')}.</li>
                                    </ul>
                                )}
                            </div>
                            {isNewCS && <>
                                <p className='pt-2 fz14 fw-400 black'>Jennny is assigned to <Link>32 employers</Link> </p>
                                <label className='fz14 grey fw-700'>{ translation('key_select_new_cs') }</label>
                                <div className='search-cs position-relative'>
                                    <div className='cs-prefix-wrapper'>
                                        <img src={userPrefix} />
                                    </div>
                                    <input type='text' placeholder={ translation('key_search_new_cs') } className='form-control border-0' />
                                    <i className='ri-search-line' />
                                </div>
                            </>}
                        </div>
                    </div>
                    {isNewCS && <>
                        <div className='row mb-3'>
                        <div className='col'>
                            <div className="form-check">
                                <input className="form-check-input" type="checkbox" value="" id="defaultCheck1" />
                                <label className="form-check-label ml-2 fz16" htmlFor="defaultCheck1">
                                    {translation('key_send_notification_email')}
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className='row'>
                        <div className='col'>
                            <p className='fz14 grey'>{translation('key_new_cs_owner_of_related_records')}</p>
                            <ul className='mb-0 grey fz14 w-100 pl-3'>
                                <li className='w-100 mb-2'>{translation('key_notes_and_attachments')}</li>
                                <li className='w-100'>{translation('key_open_activities')}</li>
                            </ul>
                        </div>
                    </div>
                    </>}
                    
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-outline mb-0" onClick={props.onClose} data-dismiss="modal">{translation('key_cancel')}</button>
                    <button type="button" className="btn filled-btn mb-0" onClick={handleSubmit}>{ translation('key_submit') }</button>
                </div>
            </div>
        </div>
    </div>)
}
ChangeOwnerBulkPopup.propTypes = {
    onClose: PropTypes.func,
    title: PropTypes.string,
    selectedRows: PropTypes.array,
};
export default ChangeOwnerBulkPopup;