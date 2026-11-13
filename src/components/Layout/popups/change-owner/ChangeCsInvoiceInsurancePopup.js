import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";

import { useDispatch, useSelector } from 'react-redux';
import { changeInvoiceInsuranceCsStaff, clearMessage, searchOtherCsStaff } from '../../../../redux/Slices/common/cs/CsSlice';
import { ShowToast } from "../../../show-toast/ShowToast";
import { showSuccessOrError } from "../../../../services/commonService";
import translation from "../../../../utils/translation";
import Icon from "../../../Icon/Icon";
import "../../../../Views/Pages/Invoice/new-ui-shared.css";
import "../../../../Views/Pages/Invoice/new-ui-review.css";
import "../../../../Views/Pages/Invoice/InvoiceDetail.css";

const SEARCH_DEBOUNCE_MS = 300;

function ChangeCsInvoiceInsurancePopup(props) {
    const dispatch = useDispatch();
    const { message } = useSelector((state) => state.cs);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState({});
    const [isSubmitAndCsEmpty, setIsSubmitAndCsEmpty] = useState(false);
    const [employerCsList, setEmployerCsList] = useState([]);
    const dropdownRef = useRef(null);
    /* the staff search: read 300 ms after the last keystroke, and only the latest read's answer is shown (performance
       track A-15) */
    const searchTimerRef = useRef(null);
    const searchSeqRef = useRef(0);

    useEffect(() => {
        const timer = searchTimerRef;
        return () => clearTimeout(timer.current);
    }, []);

    useEffect(() => {
        if (message) {
            ShowToast("success", message);
            dispatch(clearMessage());
        }
    }, [message, dispatch]);

    const handleSearchCurrentCS = (e) => {
        const searchText = e.target.value;
        setSearchQuery(e?.target?.value);
        setShowDropdown(true);
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            const seq = ++searchSeqRef.current;
            dispatch(searchOtherCsStaff({
                type: props.actionType,
                search_text: searchText,
                rel_id: props.entity.id
            })).then((res) => {
                if (seq !== searchSeqRef.current) return;
                if (!res.error) {
                    setEmployerCsList(res.payload.data);
                }
            });
        }, SEARCH_DEBOUNCE_MS);
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
        let payload = { type: props.actionType };
        payload.rel_id = props.entity.id;
        payload.new_staff_id = selectedStaff.id;
        payload.send_email = isNotificationEmail;
        dispatch(changeInvoiceInsuranceCsStaff(payload)).then((res) => {
            showSuccessOrError(res);
            if (!res.error) {
                props.onCloseSubmit();
            }
        });
    }

    const handleToggleSendEmail = () => {
        setIsNotificationEmail((prev) => (prev === 1 ? 0 : 1));
    }

    return (
        <div className="invd modal-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && props.onClose() }>
            <div className="modal-card action-modal-card cs-modal">
                <div className="head">
                    <span className="ico accent"><Icon name="user" size={ 18 } /></span>
                    <h2>{ props.title }</h2>
                    <div className="spacer" />
                    <button type="button" className="btn-icon" onClick={ props.onClose } aria-label="Close"><Icon name="x" size={ 16 } /></button>
                </div>
                <div className="body">
                    <div className="cs-kv">
                        <span>{ translation('key_branch') }: <b>{ props?.entity.branch_name || '' }</b></span>
                        <span>{ translation('key_current_cs') }: <b>{ props?.entity.staff_name || '' }</b></span>
                    </div>

                    <div className="rf-field">
                        <div className="cs-search-wrap" ref={ dropdownRef }>
                            <span className="search-ico"><Icon name="search" size={ 14 } /></span>
                            <input
                                type="text"
                                className="input cs-search-input"
                                placeholder={ translation('key_search_new_invoice_cs') }
                                value={ searchQuery }
                                onChange={ handleSearchCurrentCS }
                            />
                            { showDropdown && employerCsList.length > 0 && (
                                <ul className="cs-staff-list">
                                    { employerCsList.map((staff) => (
                                        <li key={ staff.id } onClick={ () => { handleStaffClick(staff) } }>{ staff.name }</li>
                                    )) }
                                </ul>
                            ) }
                            { showDropdown && employerCsList.length === 0 && (
                                <ul className="cs-staff-list">
                                    <li className="muted">{ translation('key_no_results_found') }</li>
                                </ul>
                            ) }
                        </div>
                        { (isSubmitAndCsEmpty && searchQuery === '') && (
                            <div className="err">{ translation('key_cs_cannot_be_empty') }.</div>
                        ) }
                    </div>

                    { Object.keys(selectedStaff).length > 0 && (
                        <p className="cs-note"><b>{ selectedStaff?.name }</b> is currently assigned for <b>{ selectedStaff?.count + " " }
                            { selectedStaff?.count > 1 ? props.actionType : props.actionType }
                        </b></p>
                    ) }

                    <button
                        type="button"
                        className="cs-check"
                        role="checkbox"
                        aria-checked={ isNotificationEmail === 1 }
                        onClick={ handleToggleSendEmail }
                    >
                        <span className={ `cb ${ isNotificationEmail === 1 ? 'cb-on' : '' }` }>
                            { isNotificationEmail === 1 && <Icon name="check" size={ 10 } strokeWidth={ 2.5 } /> }
                        </span>
                        { translation('key_send_notification_email') }
                    </button>
                </div>
                <div className="foot">
                    <button type="button" className="btn btn-ghost md" onClick={ props.onClose }>{ translation('key_cancel') }</button>
                    <button type="button" className="btn btn-primary md" onClick={ handleSubmit }>
                        <Icon name="check" size={ 13 } />{ translation('key_submit') }
                    </button>
                </div>
            </div>
        </div>
    );
}
ChangeCsInvoiceInsurancePopup.propTypes = {
    onClose: PropTypes.func,
    title: PropTypes.string,
    // selectedRows: PropTypes.array,
    csName: PropTypes.string,
    csEmail: PropTypes.string,
    entity: PropTypes.object.isRequired,
    employerId: PropTypes.number,
    actionType: PropTypes.string, // 'invoice' (Insurance uses its own Change CS Owner since S10)
    onCloseSubmit: PropTypes.func.isRequired,
};
export default ChangeCsInvoiceInsurancePopup;
