import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import userPrefix from "../../../../assets/img/svg/user-prefix.svg";
import { searchOtherCsStaff } from "../../../../redux/Slices/common/cs/CsSlice";
import translation from "../../../../utils/translation";
import "./change-owner-popup.css";

/**
 * Staff search for a Processing contract (same source as Change Processing CS Owner).
 * `excludeIds` hides people who may not be chosen here (e.g. the CS Owner when picking an Assistant).
 * The server re-checks eligibility on save; this list is only a convenience.
 */
const ProcessingStaffSearch = ({ contractId, employerId, placeholder, excludeIds = [], selected, onSelect, invalid, disabled }) => {
    const dispatch = useDispatch();
    const [query, setQuery] = useState(selected?.name || "");
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        setQuery(selected?.name || "");
    }, [selected]);

    useEffect(() => {
        const handleOutside = (event) => {
            if (wrapRef.current && !wrapRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener("click", handleOutside);
        return () => document.removeEventListener("click", handleOutside);
    }, []);

    const handleChange = useCallback((event) => {
        const text = event.target.value;
        setQuery(text);
        setIsOpen(true);
        if (selected) onSelect(null);
        dispatch(searchOtherCsStaff({
            type: "contract",
            search_text: text,
            employer_id: employerId,
            rel_id: contractId,
        })).then((res) => {
            if (!res.error) {
                const excluded = excludeIds.filter(Boolean).map(Number);
                setResults((res.payload?.data || []).filter((staff) => !excluded.includes(Number(staff.id))));
            }
        });
    }, [dispatch, employerId, contractId, excludeIds, selected, onSelect]);

    const handlePick = useCallback((staff) => {
        onSelect(staff);
        setQuery(staff.name);
        setIsOpen(false);
    }, [onSelect]);

    return (
        <div className="search-cs position-relative" ref={ wrapRef }>
            <div className="cs-prefix-wrapper">
                <img src={ userPrefix } alt="" />
            </div>
            <input
                type="text"
                placeholder={ placeholder }
                value={ query }
                onChange={ handleChange }
                disabled={ disabled }
                className={ `form-control border-0 ${ invalid ? "is-invalid" : "" }` }
                aria-invalid={ invalid || undefined }
            />
            <i className="ri-search-line" />
            { isOpen && query && (
                <ul className="dropdown-menu show w-100 staff-list-dropdown">
                    { results.length > 0 ? results.map((staff) => (
                        <li key={ staff.id }>
                            <button
                                type="button"
                                className="dropdown-item d-flex justify-content-between align-items-center"
                                onClick={ () => handlePick(staff) }
                            >
                                <span>{ staff.name }</span>
                            </button>
                        </li>
                    )) : (
                        <li className="dropdown-item text-muted">{ translation("key_no_results_found") }</li>
                    ) }
                </ul>
            ) }
        </div>
    );
};

ProcessingStaffSearch.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    employerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    placeholder: PropTypes.string,
    excludeIds: PropTypes.array,
    selected: PropTypes.object,
    onSelect: PropTypes.func.isRequired,
    invalid: PropTypes.bool,
    disabled: PropTypes.bool,
};

export default ProcessingStaffSearch;
