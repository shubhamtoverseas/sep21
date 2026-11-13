import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { Controller } from "react-hook-form";
import BioCheckGrid from "./BioCheckGrid";
import BioDateInput from "./BioDateInput";
import { emptySel } from "./BioCard";
import dayjs from "dayjs";
import { changeDynamicDateFormate, getFamilySize } from "../../../../../../utils/utils";
import translation from "../../../../../../utils/translation";
import { shiftExperience } from "../../../../../../redux/Slices/common/CommonSlice";
import { showSuccessOrError } from "../../../../../../services/commonService";
import { fetchWorkerCommonDetailInfo } from "../../../../../../redux/Slices/worker/WorkerSlice";
import { canMoveToPastExperience, shouldDisableCountrySelection, validateAllOverlaps } from "../../../../../../services/workerBiodataService";
import ActionConfirmationPopup from "../../../../../../components/settings/action-confirmation/ActionConfirmation";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { HONG_KONG_COUNTRY_ID, BIODATA_MAX_PAST_EXPERIENCE } from "../../../workerModuleConstants";

const WorkExperienceBiodataForm = ({
    workerDetail,
    control,
    roles,
    countries,
    getDistrictList,
    district,
    employerNationalities,
    spokenLanguages,
    mainSkills,
    updateWorkExperience,
    // updateWorkExperienceData,
    getValues,
    onUpdateContractEndDate,
    parentContractStatus,
    parentContractEndDate,
    newContractStatus,
    oldContractStatus,
}) => {
    const dispatch = useDispatch();
    const [workerExperience, setWorkerExperience] = useState([]);
    const [initState, setInitState] = useState(false);
    const [experienceLengthCount, setExperienceLengthCount] = useState(0);
    const { workerProfileInfo } = useSelector((state) => state.worker);
    const [isCurrentContractAvailable, setIsCurrentContractAvailable] = useState(false);
    const [isActionConfirmationOpen, setIsActionConfirmationOpen] = useState(false);
    const [selectedDeleteIndex, setSelectedDeleteIndex] = useState(null);
    const [experienceErrors, setExperienceErrors] = useState({});

    const setTopEndDateAndContractStatus = useCallback((latestExperience) => {
        if (Number(latestExperience?.contract_status) === 1) {
            onUpdateContractEndDate(null, "end_date");
        } else {
            onUpdateContractEndDate(latestExperience.end_date, "end_date");
        }
        onUpdateContractEndDate(parseInt(latestExperience.contract_status), "contract_status");
    }, [onUpdateContractEndDate]);

    useEffect(() => {
        if (workerExperience.length > 0) {
            // Create a sorted copy of experiences to find the latest one
            const sortedExperiences = [...workerExperience]
                .filter(exp => exp.action !== "delete")
                .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

            const latestExperience = sortedExperiences[0];
            if (parentContractStatus && initState &&
                parseInt(latestExperience.contract_status) !== parseInt(parentContractStatus)) {
                const updatedExperience = workerExperience.map(exp => {
                    if (exp.id === latestExperience.id) {  // Match by id to find the correct experience
                        return {
                            ...exp,
                            contract_status: parentContractStatus
                        };
                    }
                    return exp;
                });
                setWorkerExperience(updatedExperience);
                updateWorkExperience(updatedExperience);
            }

            if (parentContractEndDate) {
                const currentEndDate = changeDynamicDateFormate(latestExperience.end_date, "YYYY-MM-DD");
                const parentEndDate = changeDynamicDateFormate(parentContractEndDate, "YYYY-MM-DD");

                if (currentEndDate !== parentEndDate) {
                    const updatedExperience = workerExperience.map(exp => {
                        if (exp.id === latestExperience.id) {  // Match by id to find the correct experience
                            return {
                                ...exp,
                                end_date: parentEndDate,
                                end_date_new: parentEndDate
                            };
                        }
                        return exp;
                    });
                    setWorkerExperience(updatedExperience);
                    updateWorkExperience(updatedExperience);
                }
            }
        }
    }, [parentContractStatus, parentContractEndDate, updateWorkExperience, workerExperience, initState]);

    useEffect(() => {
        let experienceState = workerDetail?.experience &&
            workerDetail?.experience.length > 0 &&
            workerDetail?.experience
                .map((experience) => {
                    if (experience?.current_contract === 1) {
                        setIsCurrentContractAvailable(true);
                    }
                    return {
                        ...experience,
                        spoken_language: experience?.spoken_language_info?.length > 0
                            ? String(experience.spoken_language_info[0].id)
                            : (experience?.spoken_language ? String(experience.spoken_language) : ''),
                        main_duties: (experience?.duty) ? experience?.duty.map(o => o.duty_id) : [],
                        cooking: (experience?.cooking_info) ? experience?.cooking_info.map(o => o.id) : [],
                        duty: (experience?.duty) ? experience?.duty.map(o => o.duty) : [],
                        district_id: experience.district_id ? experience.district_id : null,
                        start_date: changeDynamicDateFormate(experience?.start_date, "YYYY-MM"),
                        start_date_new: changeDynamicDateFormate(experience?.start_date, "YYYY-MM"),
                        end_date: changeDynamicDateFormate(experience?.end_date, "YYYY-MM-DD"),
                        contract_status: experience?.contract_status,
                        end_date_new: experience?.end_date,
                        action: "edit",
                        ...(workerDetail?.type === 1 && { current_contract: experience?.current_contract }),
                        ...(workerDetail?.type === 1 && experience?.current_contract === 1 && workerDetail?.current_location?.id && {
                            work_country_id: workerDetail.current_location.id
                        })
                    };
                }).sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

        if (workerProfileInfo?.type === 1 && Array.isArray(experienceState)) {
            // Move experience with current_contract === 1 to the front
            experienceState = experienceState?.sort((a, b) => {
                if (a.current_contract === 1) return -1;
                if (b.current_contract === 1) return 1;
                return 0; // Keep original order for others
            });
        }

        // if (experienceState && (!initState || workerExperience.length !== experienceState.length || isCurrentContractAvailable)) {
        if (!initState && experienceState) {
            setInitState(true);
            setExperienceLengthCount(experienceState.length);
            setWorkerExperience(experienceState);
            updateWorkExperience(experienceState);
            setIsCurrentContractAvailable(experienceState.some(exp => exp.current_contract === 1));
            // Validate overlaps on initial load
            setExperienceErrors(validateAllOverlaps(experienceState, countries));
            // Update contract_end_date and contract_status from the newest experience (now at index 0)
            if (experienceState.length > 0 && workerDetail?.type === 1) {
                setTopEndDateAndContractStatus(experienceState[0]);
            }
        }
    }, [dispatch, workerDetail, onUpdateContractEndDate, initState, workerProfileInfo?.type, setTopEndDateAndContractStatus, countries, updateWorkExperience]);
    // }, [dispatch, workerDetail, onUpdateContractEndDate, initState, workerProfileInfo?.type, workerExperience.length, isCurrentContractAvailable]);

    const getLocationDistrict = useCallback((event) => {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const optionName = selectedOption.text.split('|')[1].trim();
        getDistrictList(optionName);
    }, [getDistrictList]);

    const getContractStatusOptions = useCallback((index) => {
        if (workerExperience.length > 0 && workerExperience[index].end_date) {
            const selectedDate = new Date(workerExperience[index].end_date);
            const currentDate = new Date();
            if (selectedDate <= currentDate) {
                return oldContractStatus;
            } else {
                return newContractStatus
            }
        }

        return newContractStatus;
    }, [workerExperience, oldContractStatus, newContractStatus]);

    /* Add Work Experience (prototype): an empty record is appended inline and focused — no popup */
    /* WORKER.md Step 8: up to 5 historical records (the current contract is not counted) */
    const pastRecordCount = (workerExperience || []).filter((e) => e?.action !== 'delete' && Number(e?.current_contract) !== 1).length;
    const canAddExperience = pastRecordCount < BIODATA_MAX_PAST_EXPERIENCE;

    const handleInlineAdd = useCallback(() => {
        if (workerDetail?.status === 13 || !canAddExperience) return;
        const blank = {
            worker_id: workerDetail?.id,
            worker_role: '', worker_role_info: {},
            work_country_id: '', work_country_info: {},
            district_id: null, district_info: {},
            employer_nationality: '', employer_nationality_info: {},
            spoken_language: '', spoken_language_info: [],
            main_duties: [], duty: [],
            cooking: [], cooking_info: [],
            family_size: '', house_size: null,
            start_date: '', start_date_new: '',
            end_date: '', end_date_new: '',
            contract_status: '',
            current_contract: 0,
            action: 'add',
            _clientKey: `new-${ Date.now() }`,
        };
        const next = [...workerExperience, blank];
        setWorkerExperience(next);
        updateWorkExperience(next);
        setExperienceLengthCount(next.length);
        setTimeout(() => {
            const el = document.querySelector(`[data-we-record="${ blank._clientKey }"]`);
            if (el) {
                el.scrollIntoView({ block: 'start', behavior: 'smooth' });
                const first = el.querySelector('input[type="radio"]');
                if (first) first.focus({ preventScroll: true });
            }
        }, 60);
    }, [workerDetail?.status, workerDetail?.id, workerExperience, updateWorkExperience, canAddExperience]);

    const handleEditCurretWorkExperience = useCallback((index, key, value) => {
        const updatedExperience = [...workerExperience];

        if (key === 'start_date' || key === 'end_date') {
            if (key === 'start_date') {
                updatedExperience[index] = {
                    ...updatedExperience[index],
                    [key]: changeDynamicDateFormate(value, "YYYY-MM"),
                    start_date_new: changeDynamicDateFormate(value, "YYYY-MM")
                };
            }

            if (key === 'end_date') {
                // For month input, append -01 to make it a full date
                let dateValue = value;
                if (value && value.match(/^\d{4}-\d{2}$/)) {
                    dateValue += '-01';
                }

                /* past rows (WE2–WE6) must end on or before the Current Contract's end date. The Current Contract row IS the contract
                   (its End Date becomes contract_end_date through setTopEndDateAndContractStatus), so it is never compared with the value
                   it is about to replace — otherwise it could only ever move earlier (work order 27 Oct, worker 621). */
                const fullEndDate = changeDynamicDateFormate(dateValue, "YYYY-MM-DD");
                const isCurrentContractRow = Number(updatedExperience[index]?.current_contract) === 1;
                const currentContractRow = updatedExperience.find((e) => e?.action !== 'delete' && Number(e?.current_contract) === 1);
                const currentContractEndDateStr = currentContractRow?.end_date || getValues("contract_end_date");

                if (!isCurrentContractRow && currentContractEndDateStr) {
                    const currentContractEndDate = new Date(changeDynamicDateFormate(currentContractEndDateStr, "YYYY-MM-DD"));
                    const selectedDate = new Date(fullEndDate);

                    if (selectedDate > currentContractEndDate) {
                        /* the reason sits under the field as well as in the toast (the toast was missed behind the form) */
                        const message = translation('key_past_work_experience_must_end_before_contract_end');
                        setExperienceErrors((prev) => ({ ...prev, [index]: { ...(prev[index] || {}), end_date: message } }));
                        ShowToast('error', message);
                        return; // Don't update if validation fails
                    }
                }

                updatedExperience[index] = {
                    ...updatedExperience[index],
                    [key]: changeDynamicDateFormate(dateValue, "YYYY-MM-DD"),
                    end_date_new: changeDynamicDateFormate(dateValue, "YYYY-MM-DD")
                };
            }

            // Validate Rules 1A, 1B, 1C, 1D after updating the experience
            const exp = updatedExperience[index];
            const startDateStr = exp.start_date ? changeDynamicDateFormate(exp.start_date, "YYYY-MM") : null;
            const endDateStr = exp.end_date ? changeDynamicDateFormate(exp.end_date, "YYYY-MM-DD") : null;
            const startDate = startDateStr ? new Date(startDateStr + "-01") : null;
            const endDate = endDateStr ? new Date(endDateStr) : null;
            const newErrors = {};

            // Rule 1A: Start date must be before end date
            if (startDate && endDate && startDate >= endDate) {
                newErrors.start_date = translation('key_start_date_must_be_before_end_date');
            }

            // Rule 1B: Start date cannot be in the future
            if (startDate) {
                if (dayjs(startDate).isAfter(dayjs(), 'month')) {
                    newErrors.start_date = translation('key_start_date_cannot_be_in_future');
                }
            }

            // Rule 1C: Work experience must be at least 1 month
            if (startDate && endDate && !newErrors.start_date) {
                const diffMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
                if (diffMonths < 1) {
                    newErrors.end_date = translation('key_work_experience_at_least_one_month');
                }
            }

            // Rule 1D: Contract end date cannot be before contract start date (only for current_contract === 1)
            if (exp.current_contract === 1 && startDate && endDate && endDate < startDate) {
                newErrors.end_date = translation('key_contract_end_date_cannot_be_before_start_date');
            }

            // Recalculate all overlaps across all experiences
            const overlapErrors = validateAllOverlaps(updatedExperience, countries);

            // Merge per-field errors for the current index with overlap errors for all indices
            setExperienceErrors(() => {
                const merged = { ...overlapErrors };
                // Add field-level errors for the current index
                if (Object.keys(newErrors).length > 0) {
                    merged[index] = { ...(merged[index] || {}), ...newErrors };
                }
                return merged;
            });
        } else {
            updatedExperience[index] = {
                ...updatedExperience[index],
                [key]: value,
            };
        }

        setWorkerExperience(updatedExperience);
        updateWorkExperience(updatedExperience);

        const experiencesForLatestCheck = [...updatedExperience]
            .filter(exp => exp.action !== "delete");

        if (experiencesForLatestCheck.length > 0) {
            const sortedCopy = [...experiencesForLatestCheck].sort((a, b) =>
                new Date(b.end_date) - new Date(a.end_date)
            );
            const latestExperience = sortedCopy[0];

            if (latestExperience) {
                if (key === 'end_date' || key === 'contract_status') {
                    setTopEndDateAndContractStatus(latestExperience);
                    // onUpdateContractEndDate(latestExperience.end_date, "end_date");
                    // onUpdateContractEndDate(parseInt(latestExperience.contract_status), "contract_status");
                }
            }
        }
    }, [workerExperience, updateWorkExperience, setTopEndDateAndContractStatus, getValues, countries]);
    const handleEditCurretWorkExperienceMultipleSpokenLanguage = useCallback((index, key, selected) => {
        if (workerDetail?.status === 13) return;
        if (!selected) selected = [];
        // Only allow single selection
        const singleSelected = Array.isArray(selected) && selected.length > 0 ? selected[0] : null;
        const language = singleSelected ? String(singleSelected.value) : '';
        const selectedInfo = singleSelected ? [{ id: singleSelected.value, name: singleSelected.label }] : [];

        const updatedExperience = [...workerExperience];
        updatedExperience[index] = {
            ...updatedExperience[index],
            ['spoken_language']: language,
            ['spoken_language_info']: selectedInfo,
        };
        setWorkerExperience(updatedExperience);
        updateWorkExperience(updatedExperience);
    }, [workerExperience, updateWorkExperience, workerDetail?.status]);
    const handleEditCurretWorkExperienceMultipleMainDuties = useCallback((index, key, selected) => {
        if (workerDetail?.status === 13) return;
        const languages = selected.map((s) => s.value);
        if (languages.length > 3) {
            return; // Ignore if more than 3 selected
        }
        selected = selected.map(({
            value: id,
            label: name,
            ...rest
        }) => ({
            id, name,
            ...rest
        }));

        const updatedExperience = [...workerExperience];
        updatedExperience[index] = {
            ...updatedExperience[index],
            ['main_duties']: languages,
            ['duty']: selected,
        };
        setWorkerExperience(updatedExperience);
        updateWorkExperience(updatedExperience);
    }, [workerExperience, updateWorkExperience, workerDetail?.status]);

    const handleDeleteWorkExperience = useCallback((index) => {
        setSelectedDeleteIndex(index);
        setIsActionConfirmationOpen(true);
    }, []);

    const handleShiftExperience = useCallback((shiftType, experienceId) => {
        const payload = {
            worker_id: workerDetail?.id,
            experience_id: experienceId,
            shift_type: shiftType,
        }
        dispatch(shiftExperience(payload)).then((res) => {
            showSuccessOrError(res);
            if (!res.error) {
                dispatch(fetchWorkerCommonDetailInfo({ "worker_id": workerDetail?.id, type: 'biodata' })).then((res) => {
                    if (!res.error) {
                        if (shiftType === 'up') {
                            setIsCurrentContractAvailable(true);
                        }
                        setInitState(false);
                    }
                })
            }
        });
    }, [dispatch, workerDetail?.id]);

    const isMoveToCurrentContractVisible = useCallback((index, action) => {
        if (workerDetail?.type !== 1) return false;
        // Use workerDetail.experience (DB data) instead of workerExperience (local state)
        const dbExperiences = workerDetail?.experience || [];

        // Sort by end_date to match the order used in workerExperience
        let sortedDbExperiences = [...dbExperiences]
            .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

        sortedDbExperiences = sortedDbExperiences.sort((a, b) => {
            if (a.current_contract === 1) return -1;
            if (b.current_contract === 1) return 1;
            return 0; // Keep original order for others
        });

        const currentExp = sortedDbExperiences[index];
        const workerCountryId = currentExp?.work_country_id;
        const expCountryId = workerDetail?.current_location?.id;

        // if current contract is empty
        if (index === 1 && isCurrentContractAvailable && Number(workerCountryId) === Number(expCountryId)) {
            const prevExp = sortedDbExperiences[0];
            if (Number(prevExp?.current_contract) === 1) {
                return !prevExp?.worker_role &&
                    !prevExp?.start_date &&
                    !prevExp?.employer_nationality &&
                    !prevExp?.district_id &&
                    !prevExp?.family_size &&
                    (!prevExp?.spoken_language_info || !prevExp?.spoken_language_info?.length) &&
                    (!prevExp?.duty || !prevExp?.duty?.length);
            }
        }

        // if current contract not available
        return (
            Number(workerCountryId) === Number(expCountryId) &&
            !isCurrentContractAvailable &&
            index === 0 &&
            workerProfileInfo?.type === 1 &&
            action !== "delete" &&
            action !== "add"
        );
    }, [workerDetail?.experience, workerDetail?.current_location?.id, workerDetail?.type, isCurrentContractAvailable, workerProfileInfo?.type]);

    const isShowMoveToPastExp = useMemo(() => canMoveToPastExperience({
        profileType: workerProfileInfo?.type,
        isCurrentContractAvailable,
        experiences: workerExperience
    }), [workerProfileInfo?.type, isCurrentContractAvailable, workerExperience]);

    const handleConfirmDeleteExp = useCallback(() => {
        const updatedExperience = [...workerExperience];
        updatedExperience[selectedDeleteIndex] = {
            ...updatedExperience[selectedDeleteIndex],
            action: "delete"
        };
        if (experienceLengthCount > 1 && selectedDeleteIndex === 0) {
            if (updatedExperience[selectedDeleteIndex]?.id > 0) {
                onUpdateContractEndDate(changeDynamicDateFormate(updatedExperience[selectedDeleteIndex + 1]?.end_date, "YYYY-MM-DD"), "end_date");
                onUpdateContractEndDate(parseInt(updatedExperience[selectedDeleteIndex + 1]?.contract_status), "contract_status");
            }
        }
        if (updatedExperience[selectedDeleteIndex]?.id > 0) {
            setWorkerExperience(updatedExperience);
            updateWorkExperience(updatedExperience);
            setExperienceLengthCount(updatedExperience.length - 1);
        } else {
            const newExperience = updatedExperience.filter((_, i) => i !== selectedDeleteIndex);
            setWorkerExperience(newExperience);
            updateWorkExperience(newExperience);
            setExperienceLengthCount(newExperience.length - 1);
        }
        setSelectedDeleteIndex(null);
        setIsActionConfirmationOpen(false);
    }, [workerExperience, selectedDeleteIndex, experienceLengthCount, onUpdateContractEndDate, updateWorkExperience]);

    const shouldDisabledDistrictSelection = useCallback(
        (experience) => {
            const workerCountryId = Number(experience?.work_country_id);
            const isCurrentContract = Number(experience?.current_contract) === 1;

            return workerCountryId !== 1 && !isCurrentContract;
        }, []);

    const liveRecords = useMemo(() => (workerExperience || []).filter((e) => e?.action !== 'delete'), [workerExperience]);
    const removedCount = useMemo(() => (workerExperience || []).filter((e) => e?.action === 'delete').length, [workerExperience]);
    /* "Work Experience N" counts only live, non-current records in display order */
    const workExperienceNumber = useCallback((index) => {
        let n = 0;
        for (let i = 0; i <= index; i += 1) {
            const e = workerExperience[i];
            if (e && e.action !== 'delete' && !e.current_contract) n += 1;
        }
        return n;
    }, [workerExperience]);

    const spokenLanguageOptions = useMemo(() =>
        spokenLanguages?.map((item) => ({ value: item.id, label: item.name })) || [],
        [spokenLanguages]
    );

    const mainSkillOptions = useMemo(() =>
        mainSkills?.map((item) => ({ value: item.id, label: item.name })) || [],
        [mainSkills]
    );

    const familySizeOptions = useMemo(() => getFamilySize(), []);

    return (
        <>
            { isActionConfirmationOpen &&
                <ActionConfirmationPopup
                    title={ translation('key_confirm_delete') }
                    onClose={ () => setIsActionConfirmationOpen(false) }
                    onYes={ handleConfirmDeleteExp }
                    message={ translation('key_are_you_sure_you_want_to_delete') }
                />
            }

            { workerExperience &&
                workerExperience.map((experience, index) => (
                    (<div key={ experience?._clientKey || experience?.id || index } data-we-record={ experience?._clientKey || experience?.id || index } className="bio-we-record">
                        { experience?.action === "delete" ? null
                            :
                            <>
                                <div className="bio-we-head">
                                    <span className="bio-we-title">
                                        { workerProfileInfo?.type === 1 && !!experience?.current_contract
                                            /* Review Rail edit mode titles the current record 'Work Experience — Current Contract' (ClickUp Profile UI issues #4); the read card stays 'Current Contract' */
                                            ? `${ translation('key_work_experience') } — ${ translation('key_current') } ${ translation('key_contract') }`
                                            : `${ translation('key_work_experience') } ${ workExperienceNumber(index) }` }
                                    </span>
                                    { experience?.action === 'add' && <span className="bio-we-new">{ translation('key_wkr_new_not_saved_yet') }</span> }
                                    <span className="grow" />
                                    { isMoveToCurrentContractVisible(index, experience?.action) && <button type="button"
                                        className="bio-btn" onClick={ () => handleShiftExperience('up', experience?.id) }>
                                        { translation('key_move_to_current_contract') }
                                    </button> }
                                    { ((experienceLengthCount > 1 && workerProfileInfo?.type === 2) || (experienceLengthCount > 1 || workerProfileInfo?.type === 1 && !isCurrentContractAvailable))
                                        && !experience?.current_contract
                                        && workerDetail?.status !== 13
                                        && <button type="button" className="bio-btn bio-btn-remove" onClick={ () => handleDeleteWorkExperience(index) }>
                                            { translation('key_remove') }
                                        </button> }
                                </div>
                                <div className="row">
                                    <div className="col mb-3">
                                        <label className="form-label required">{ translation('key_role') }</label>
                                        <div className="mode-radio-buttons d-flex align-items-center">
                                            { roles &&
                                                Object.values(roles).map((role, i) => (
                                                    <div key={ i } className="custom-radio compact">
                                                        <Controller
                                                            control={ control }
                                                            name={ index + "_worker_role" }
                                                            render={ ({ field }) => (
                                                                <>
                                                                    <input
                                                                        { ...field }
                                                                        type="radio"
                                                                        value={ role.id }
                                                                        id={ "worker_role" + role.name }
                                                                        checked={ experience.worker_role == role.id }
                                                                        onChange={ (e) => handleEditCurretWorkExperience(index, "worker_role", e.target.value) }
                                                                        disabled={ workerDetail?.status === 13 }

                                                                    />
                                                                    <label
                                                                        htmlFor={ "worker_role" + role.name }
                                                                        className="radio-label black"
                                                                    >
                                                                        { role.name }
                                                                    </label>
                                                                </>
                                                            ) }
                                                        />
                                                    </div>
                                                )) }
                                        </div>
                                    </div>
                                    <div className="col-6 mb-3">
                                        <label className="form-label required"> { translation('key_work_location') }</label>
                                        <select
                                            name={ index + "_work_country_id" }
                                            value={ experience?.current_contract === 1 ? workerDetail?.current_location?.id : experience.work_country_id }
                                            className={ `form-control ht44${ emptySel(experience?.current_contract === 1 ? workerDetail?.current_location?.id : experience.work_country_id) }` }
                                            id="work_country_id"
                                            onChange={ (e) => { handleEditCurretWorkExperience(index, "work_country_id", e.target.value), getLocationDistrict(e) } }
                                            disabled={ workerDetail?.status === 13 || shouldDisableCountrySelection(experience, workerDetail) }
                                        >
                                            <option value="">{ translation('key_please_select') }</option>
                                            { countries?.map((item) => (
                                                <option key={ item.id } value={ item.id }>
                                                    { item.name + " | " + (item.country_code) }
                                                </option>
                                            )) }
                                        </select>
                                    </div>
                                </div>
                                <div className="row">
                                    {/* District is a Hong Kong-only field (W-02) */}
                                    { Number(experience?.current_contract === 1 ? workerDetail?.current_location?.id : experience.work_country_id) === HONG_KONG_COUNTRY_ID && (
                                    <div className="col-6 mb-3">
                                        {/* WORKER.md Step 8 / §16.21: District is an unqualified single select — not required */}
                                        <label className="form-label">{ translation('key_district') }</label>
                                        <select
                                            name={ index + "_district_id" }
                                            value={ experience.district_id }
                                            className={ `form-control ht44${ emptySel(experience.district_id) }` }
                                            id="district_id"
                                            onChange={ (e) => handleEditCurretWorkExperience(index, "district_id", e.target.value) }
                                            disabled={ shouldDisabledDistrictSelection(experience) }
                                        >
                                            <option value="">{ translation('key_please_select') }</option>
                                            { district?.map((item) => (
                                                <option key={ item.id } value={ item.id }>
                                                    { item.name }
                                                </option>
                                            )) }
                                        </select>
                                    </div>
                                    ) }
                                    <div className="col-6 mb-3">
                                        <label className="form-label required">
                                            { translation('key_employer_nationality') }
                                        </label>
                                        <Controller
                                            control={ control }
                                            name={ index + "_employer_nationality" }
                                            render={ ({ field }) => (
                                                <select
                                                    { ...field }
                                                    value={ experience.employer_nationality }
                                                    className={ `form-control ht44${ emptySel(experience.employer_nationality) }` }
                                                    id="employer_nationality"
                                                    onChange={ (e) => handleEditCurretWorkExperience(index, "employer_nationality", e.target.value) }
                                                    disabled={ workerDetail?.status === 13 }
                                                >
                                                    <option value="">{ translation('key_please_select') }</option>
                                                    { employerNationalities?.map((item) => (
                                                        <option key={ item.id } value={ item.id }>
                                                            { item.name }
                                                        </option>
                                                    )) }
                                                </select>
                                            ) }
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-12 mb-3">
                                        <label className="form-label required">{ translation('key_language_spoken') }</label>
                                        <BioCheckGrid
                                            cols={ 3 }
                                            max={ 1 }
                                            ariaLabel={ translation('key_language_spoken') }
                                            options={ spokenLanguageOptions.map((o) => ({ id: o.value, name: o.label })) }
                                            value={ (experience?.spoken_language_info || []).map((l) => l.id) }
                                            disabled={ workerDetail?.status === 13 }
                                            onChange={ (ids) => handleEditCurretWorkExperienceMultipleSpokenLanguage(index, "spoken_language", ids.map((id) => spokenLanguageOptions.find((o) => String(o.value) === String(id))).filter(Boolean)) }
                                        />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-6 mb-3">
                                        <label className="form-label required">{ translation('key_household_size') }</label>
                                        <select
                                            name={ index + "_family_size" }
                                            value={ experience.family_size }
                                            className={ `form-control ht44${ emptySel(experience.family_size) }` }
                                            id="family_size"
                                            onChange={ (e) => handleEditCurretWorkExperience(index, "family_size", e.target.value) }
                                            disabled={ workerDetail?.status === 13 }
                                        >
                                            <option value="">{ translation('key_please_select') }</option>
                                            { familySizeOptions?.map((item) => (
                                                <option key={ item.id } value={ item.id }>
                                                    { item.name }
                                                </option>
                                            )) }
                                        </select>
                                    </div>
                                    <div className="col mb-3">
                                        <label className="form-label required">{ translation('key_start_date') }</label>
                                        <BioDateInput
                                            mode="month"
                                            name={ index + "_start_date" }
                                            ariaLabel={ translation('key_start_date') }
                                            value={ changeDynamicDateFormate(experience.start_date_new, "YYYY-MM") }
                                            onChange={ (v) => handleEditCurretWorkExperience(index, "start_date", v) }
                                            error={ Boolean(experienceErrors[index]?.start_date) }
                                            disabled={ workerDetail?.status === 13 }
                                        />
                                        { experienceErrors[index]?.start_date && (
                                            <small className="text-danger">{ experienceErrors[index].start_date }</small>
                                        ) }
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-6 mb-3">
                                        <label className={ `form-label${ experience?.current_contract === 1 ? '' : ' required' }` }> { translation('key_end_date') }</label>
                                        <BioDateInput
                                            mode={ experience?.current_contract === 1 ? "date" : "month" }
                                            name={ index + "_end_date" }
                                            ariaLabel={ translation('key_end_date') }
                                            value={
                                                experience?.current_contract === 1
                                                    ? changeDynamicDateFormate(experience.end_date, "YYYY-MM-DD")
                                                    : changeDynamicDateFormate(experience.end_date, "YYYY-MM")
                                            }
                                            onChange={ (v) => handleEditCurretWorkExperience(index, "end_date", v) }
                                            error={ Boolean(experienceErrors[index]?.end_date) }
                                            disabled={ workerDetail?.status === 13 }
                                        />
                                        { experienceErrors[index]?.end_date && (
                                            <small className="text-danger">{ experienceErrors[index].end_date }</small>
                                        ) }
                                    </div>
                                </div>
                                { /* WORKER.md Work History: "Reason for Leaving — single select, required — same options as Contract Status" — one
                                     select bound to contract_status; no separate Termination Reason (U-0422, 29 Oct) */ }
                                <div className="row">
                                    <div className="col-12 mb-3">
                                        <label className="form-label required" htmlFor={ `${ index }_contract_status` }>{ translation('key_reason_for_leaving') }</label>
                                        <select
                                            name={ index + "_contract_status" }
                                            id={ `${ index }_contract_status` }
                                            value={ experience?.contract_status ?? '' }
                                            className={ `form-control ht44${ emptySel(experience?.contract_status) }` }
                                            onChange={ (e) => handleEditCurretWorkExperience(index, "contract_status", e.target.value) }
                                            disabled={ workerDetail?.status === 13 }
                                        >
                                            <option value="">{ translation('key_please_select') }</option>
                                            { getContractStatusOptions(index)?.map((item) => (
                                                <option key={ item.id } value={ item.id }>{ item.admin_panel_status }</option>
                                            )) }
                                        </select>
                                    </div>
                                </div>
                                { experienceErrors[index]?.overlap && (
                                    <small className="alert alert-danger alert-sm d-flex align-items-center mb-3 p-1" role="alert">
                                        <span>&#9940; { experienceErrors[index].overlap }</span>
                                    </small>
                                ) }
                                <div className="row">
                                    <div className="col-12 mb-3">
                                        <label className="form-label required">{ translation('key_main_duties') }</label>
                                        <BioCheckGrid
                                            cols={ 3 }
                                            max={ 3 }
                                            ariaLabel={ translation('key_main_duties') }
                                            options={ mainSkillOptions.map((o) => ({ id: o.value, name: o.label })) }
                                            value={ (experience?.duty || []).map((d) => d.id) }
                                            disabled={ workerDetail?.status === 13 }
                                            onChange={ (ids) => handleEditCurretWorkExperienceMultipleMainDuties(index, "main_duties", ids.map((id) => mainSkillOptions.find((o) => String(o.value) === String(id))).filter(Boolean)) }
                                        />
                                        <small className="bio-cap-hint">{ translation('key_select_up_to_3_duties') }</small>
                                    </div>
                                </div>
                            </>
                        }

                    </div>)
                )) }
            { workerDetail?.status !== 13 && (
                <div className="bio-we-addbar" data-mc-work-add="1">
                    { canAddExperience && <button type="button" className="bio-btn bio-btn-lg" onClick={ handleInlineAdd }>{ translation('key_add_work_experience') }</button> }
                    { isShowMoveToPastExp && <button type="button" className="bio-btn bio-btn-lg" onClick={ () => handleShiftExperience('down', workerExperience[0]?.id) }>{ translation('key_move_to_past_exprience') }</button> }
                    <span className="bio-we-count">
                        { liveRecords.length
                            ? translation('key_wkr_records_in_this_form').replace('{{count}}', liveRecords.length)
                            : translation('key_wkr_no_work_experience_recorded_a_worker_without') }
                        { removedCount > 0 ? ` · ${ removedCount } ${ translation('key_wkr_removed_on_save') }` : '' }
                    </span>
                </div>
            ) }
        </>
    );
};
WorkExperienceBiodataForm.propTypes = {
    onSubmit: PropTypes.any,
    errors: PropTypes.any,
    workerDetail: PropTypes.any,
    control: PropTypes.any,
    roles: PropTypes.any,
    countries: PropTypes.any,
    getDistrictList: PropTypes.func,
    district: PropTypes.any,
    employerNationalities: PropTypes.any,
    spokenLanguages: PropTypes.any,
    mainSkills: PropTypes.any,
    updateWorkExperience: PropTypes.any,
    // updateWorkExperienceData: PropTypes.any,
    getValues: PropTypes.any,
    onUpdateContractEndDate: PropTypes.func,
    parentContractStatus: PropTypes.any,
    parentContractEndDate: PropTypes.any,
    newContractStatus: PropTypes.any,
    oldContractStatus: PropTypes.any,
};
export default React.memo(WorkExperienceBiodataForm);