import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useTranslation } from "react-i18next";
import { yupResolver } from "@hookform/resolvers/yup";
import CommonContentContainer from "../../../../components/common-content-container/CommonContentContainer";
import CustomBreadcrumb from "../../../../components/custom-breadcrumb/CustomBreadcrumb";
import "../new-ui-shared.css";
import "../new-ui-create.css";
import { Controller, useForm } from "react-hook-form";
import EntityContactDetailsForm from "./EntityContactDetailsForm";
import routes from "../../routes/routesConfig";
import { updateLocalWorkerOfInvoiceFormSchema, updateOverseasWorkerOfInvoiceFormSchema } from "../../WorkerPage/add-worker/addWorkerSchema";
import { updateLocalWorkerOfInvoiceFormState, updateOverseasWorkerOfInvoiceFormState } from "../../../../components/ReusableComponents/form-states";
import { fetchCountriesGeneral, fetchCountriesWorker } from "../../../../redux/Slices/common/countries/CountriesSlice";
import { fetchWorkerNationalities } from "../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import { fetchContractCategory } from "../../../../redux/Slices/contract/ContractSlice";
import { fetchWorkerDetailTabInfo, updateWorkerDetailsSlice } from "../../../../redux/Slices/worker/WorkerSlice";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { handleMobileInput } from "../../../../services/commonService";
import { fetchContractStatus, fetchContractWorkerStatus, fetchTerminationReason } from "../../../../redux/Slices/common/CommonSlice";
import { CONTRACT_SECTION_FIELDS, contractDateWindow, contractStatusErrors, fieldsAskedFor, serverFieldErrors, withoutFieldsNotAsked } from "./contractStatusRules";
import { workerTypeList, workerNationalityList } from "../../../../components/ReusableComponents/constants";
import { validateHKID } from "../../../../utils/utils";
import translation from "../../../../utils/translation";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import PropTypes from 'prop-types';
import dayjs from "dayjs";
const contractStatusOf = (worker) => (worker?.contract_status && typeof worker.contract_status === 'object' ? worker.contract_status.id : worker?.contract_status) ?? worker?.contract_status_info?.id ?? null;
/* the stored "Please select reason" lives on the current-contract experience (the basic read has no worker column) */
const storedTerminatedReasonOf = (worker) => worker?.terminated_reason
    ?? (Array.isArray(worker?.experience) ? worker.experience.find((exp) => Number(exp?.current_contract) === 1)?.terminated_reason : null)
    ?? '';

const AddWorkerDetailsOfInvoice = (props) => {
    const { t } = useTranslation(); // Access translations
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const [isNationality, setIsNationality] = useState(true);
    const [isHKID, setisHKID] = useState("");
    const [isNationalityByCategory, setIsNationalityByCategory] = useState(true);
    const [actionType, setActionType] = useState("invoice");
    /* the worker's stored values are in the form (the Contract Status rules run from then on) */
    const [workerLoaded, setWorkerLoaded] = useState(false);
    /* a refusal from the admin API, by field ({ field: message }); cleared once the section changes */
    const [serverErrors, setServerErrors] = useState({});
    /* Next is saving the worker: the button shows the spinner and takes no second click until the API answers */
    const [saving, setSaving] = useState(false);
    const { worker_id: routeWorkerId } = useParams();
    const worker_id = props.workerId || routeWorkerId;
    const goBack = useCallback(() => {
        if (props.asModal && props.onClose) { props.onClose(); }
        else { window.history.back(); }
    }, [props.asModal, props.onClose]);
    /* Back = one step (the picker that opened this modal); Cancel = close the whole flow (goBack) */
    const { asModal: isModal, onBack } = props;
    const goStepBack = useCallback(() => {
        if (isModal) { if (onBack) onBack(); else goBack(); }
        else { window.history.back(); }
    }, [isModal, onBack, goBack]);
    const { workerNationalities, contractStatus, workerDetailTabInfo, workerContries, workerContractStatus, workerContriesGeneral, terminationReasons } = useSelector((state) => ({
        workerNationalities: state.nationalities.workerNationalities,
        contractStatus: state.common.contractStatus,
        workerDetailTabInfo: state.worker.workerDetailTabInfo,
        workerContries: state.countries.workerContries,
        workerContractStatus: state.common.workerContractStatus,
        workerContriesGeneral: state.countries.workerContriesGeneral,
        terminationReasons: state.common.terminationReasons,
    }), shallowEqual);
    const [contractCategoryFiltered, setContractCategoryFiltered] = useState(null);

    const overseasWorkerType = useMemo(() => workerTypeList().find((type) => type.key === "overseas"), []);
    const localWorkerType = useMemo(() => workerTypeList().find((type) => type.key === "local"), []);
    const workerPhilNationality = useMemo(() => workerNationalityList().find((nationality) => nationality.key === "philippines"), []);
    const workerIndoNationality = useMemo(() => workerNationalityList().find((nationality) => nationality.key === "indonesia"), []);
    const hasPhillNationality = workerDetailTabInfo?.nationality?.id === workerPhilNationality?.id;
    const hasIndonesianNationality = workerDetailTabInfo?.nationality?.id === workerIndoNationality?.id;

    const {
        handleSubmit,
        setError,
        clearErrors,
        getValues,
        setValue,
        watch,
        control,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(localWorkerType?.id === workerDetailTabInfo?.type ? updateLocalWorkerOfInvoiceFormSchema : updateOverseasWorkerOfInvoiceFormSchema),
        defaultValues: localWorkerType?.id === workerDetailTabInfo?.type ? updateLocalWorkerOfInvoiceFormState : updateOverseasWorkerOfInvoiceFormState,
    });
    const visaExpiryValue = watch("visa_expiry_date");
    const earlyReleaseMax = useMemo(() => {
        const visa = visaExpiryValue ? dayjs(visaExpiryValue) : null;
        return visa?.isValid() ? visa.subtract(1, 'day').format('YYYY-MM-DD') : undefined;
    }, [visaExpiryValue]);

    /* Contract Status rules sheet (22 Oct 2026): the section's fields, the date window and every broken rule, live */
    const isLocalWorker = localWorkerType?.id === workerDetailTabInfo?.type;
    const today = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
    const dateWindow = useMemo(() => contractDateWindow(today), [today]);
    const [csValue, cedValue, erValue, erdValue, reasonValue] = watch(["contract_status", "contract_end_date", "expect_released_early", "early_release_date", "terminated_reason"]);
    const askedFields = fieldsAskedFor(csValue, erValue);
    const statusErrors = useMemo(() => (isLocalWorker && workerLoaded
        ? contractStatusErrors({
            contract_status: csValue, contract_end_date: cedValue, visa_expiry_date: visaExpiryValue,
            expect_released_early: erValue, early_release_date: erdValue, terminated_reason: reasonValue,
        }, today, t)
        : {}), [isLocalWorker, workerLoaded, csValue, cedValue, visaExpiryValue, erValue, erdValue, reasonValue, today, t]);
    const sectionInvalid = isLocalWorker && (!workerLoaded || Object.keys(statusErrors).length > 0);
    /* one message per field: the server's refusal, else the rule table, else the form schema */
    const fieldError = (field) => serverErrors[field] || statusErrors[field] || errors[field]?.message;
    useEffect(() => { setServerErrors({}); }, [csValue, cedValue, visaExpiryValue, erValue, erdValue, reasonValue]);


    useEffect(() => {
        if (location.state?.actionType) {
            setActionType(location.state?.actionType);
        }
    }, [location.state]);

    useEffect(() => {
        setIsNationality(hasPhillNationality || hasIndonesianNationality);
    }, [hasPhillNationality, hasIndonesianNationality]);

    useEffect(() => {
        if (workerDetailTabInfo?.contract_category !== undefined && workerDetailTabInfo?.contract_category !== null) {
            setIsNationalityByCategory(Number(workerDetailTabInfo.contract_category) === 3);
        }
    }, [workerDetailTabInfo?.contract_category]);

    /* the category list follows the contract status; a stored / previously chosen category that the new list does not
       offer must not survive as a hidden form value — the select would show "Please Select" while the required-field
       check still passed on the stale id and the record saved without a visible category */
    useEffect(() => {
        if (!Array.isArray(contractCategoryFiltered)) return;
        const current = getValues("contract_category");
        if (current === "" || current === undefined || current === null) return;
        if (contractCategoryFiltered.some((item) => String(item.id) === String(current))) return;
        setValue("contract_category", "");
        setIsNationalityByCategory(false);
    }, [contractCategoryFiltered, getValues, setValue]);

    /* the lookups as the form opens (performance track A-16): the effect reads them here, so a lookup landing does not run
       it again — before, each one that landed asked again for the ones still on their way and read the worker again */
    const lookupsRef = useRef(null);
    lookupsRef.current = { workerContriesGeneral, workerContries, workerNationalities, contractStatus, workerContractStatus, terminationReasons };
    useEffect(() => {
        const lookups = lookupsRef.current;
        const fetchData = async () => {
            const promises = [];
            /* "Please select reason" options (Terminated for Other Reason) — the Worker module's list */
            if (!lookups.terminationReasons?.length) promises.push(dispatch(fetchTerminationReason()));
            if (!lookups.workerContriesGeneral?.length) promises.push(dispatch(fetchCountriesGeneral({ type: "worker_only" })));
            if (!lookups.workerContries?.length) promises.push(dispatch(fetchCountriesWorker({ "type": "worker_home" })));
            if (!lookups.workerNationalities?.length) promises.push(dispatch(fetchWorkerNationalities({ type: "worker" })));
            if (!lookups.contractStatus?.length && !lookups.workerContractStatus?.length) {
                /* both lists are the answer of /get-contract-status?type=worker: one read fills both (A-18); if it fails,
                   the second list is read on its own, as before */
                promises.push(dispatch(fetchContractStatus({ type: "worker" })).then((action) => (fetchContractStatus.fulfilled.match(action)
                    ? dispatch(fetchContractWorkerStatus.fulfilled(action.payload, action.meta.requestId, { type: "worker" }))
                    : dispatch(fetchContractWorkerStatus({ type: "worker" })))));
            } else {
                if (!lookups.contractStatus?.length) promises.push(dispatch(fetchContractStatus({ type: "worker" })));
                if (!lookups.workerContractStatus?.length) promises.push(dispatch(fetchContractWorkerStatus({ type: "worker" })));
            }
            await Promise.allSettled(promises);
            if (worker_id) {
                dispatch(fetchWorkerDetailTabInfo({ "worker_id": worker_id, type: 'basic' })).then((res) => {
                    if (res && res.payload.status && res.payload.data) {
                        const workerInfo = res.payload.data;
                        dispatch(fetchContractCategory({ contract_status: contractStatusOf(workerInfo) })).then((res) => {
                            if (res && Array.isArray(res.payload)) {
                                setContractCategoryFiltered(res.payload);
                                if (workerInfo) {
                                    const commonStateParam = localWorkerType?.id === workerInfo?.type ? updateLocalWorkerOfInvoiceFormState : updateOverseasWorkerOfInvoiceFormState;
                                    Object.keys(commonStateParam).forEach((key) => {
                                        if (typeof workerInfo?.[key] === 'object') {
                                            setValue(key, workerInfo[key]?.id || '');
                                        } else {
                                            if (key === "expect_released_early") {
                                                setValue(key, workerInfo?.[key] !== null ? workerInfo?.[key] : workerInfo[key] ? 1 : 0);
                                            } else if (key === "wait_in_macau") {
                                                setValue(key, workerInfo?.[key] !== null && workerInfo?.[key] !== undefined ? String(workerInfo[key]) : '');
                                            } else {
                                                setValue(key, workerInfo?.[key] || '');
                                            }
                                            if (key === "hk_id") {
                                                if (workerInfo?.[key]) {
                                                    // Remove special characters () before validating HKID
                                                    const cleanedHKID = (workerInfo?.[key] || '').replace(/[()]/g, '');
                                                    const res = validateHKID(cleanedHKID);
                                                    setisHKID(workerInfo?.[key] || "");
                                                    if (!res.valid) {
                                                        setError("hk_id", {
                                                            type: "manual",
                                                            message: res?.error,
                                                        });
                                                    } else {
                                                        setValue("hk_id", res?.hkid || ""); // Update the form value with the formatted HKID 
                                                        setisHKID(res?.formatted || "");
                                                    }
                                                } else {
                                                    setValue("hk_id", "");
                                                    setisHKID("");
                                                }
                                            }

                                        }
                                    });
                                    if (localWorkerType?.id === workerInfo?.type) setValue("terminated_reason", storedTerminatedReasonOf(workerInfo));
                                }
                                setWorkerLoaded(true);
                            }
                        });
                    }
                });
            }
        };
        fetchData();
    }, [dispatch, worker_id]);

    const handleManualError = useCallback((error) => {
        if (!error) return;
        clearErrors(error);
        setError(error, {
            type: "manual",
            message: `${ String(error).replace(/_/g, " ") } is required`,
        });
    }, [setError, clearErrors]);

    const handleVisibility = useCallback((e) => {
        const { name, value } = e.target;
        setIsNationality(Number(value) === workerPhilNationality.id || Number(value) === workerIndoNationality.id);
        setValue(name, value);
        if (value !== "") clearErrors([name]);
    }, [workerPhilNationality, workerIndoNationality, setValue, clearErrors]);

    const handleVisibilityByCategory = useCallback((e) => {
        const { name, value } = e.target;
        setIsNationalityByCategory(Number(value) === 3);
        setValue(name, value);
        if (value !== "") clearErrors([name]);
    }, [setValue, clearErrors]);

    const onSubmit = useCallback((data) => {
        let payload = {
            ...data,
            worker_id: worker_id,
            user_id: workerDetailTabInfo?.user_id,
        };
        if (payload.hk_id) {
            const res = validateHKID(payload.hk_id);
            if (!res.valid) {
                setError("hk_id", { type: "manual", message: res?.error });
                return;
            } else {
                payload.hk_id = res?.hkid || payload.hk_id;
                clearErrors("hk_id");
            }
        }
        /* Contract Status rules sheet (22 Oct 2026): the same table the Next button waits on; the fields the status does
           not ask for are left out of the request (the API clears them) */
        if (localWorkerType?.id === workerDetailTabInfo?.type) {
            const sectionErrors = contractStatusErrors(data, today, t);
            if (Object.keys(sectionErrors).length > 0) {
                Object.entries(sectionErrors).forEach(([field, message]) => setError(field, { type: "manual", message }));
                return false;
            }
            clearErrors(["contract_status", ...CONTRACT_SECTION_FIELDS]);
            payload = withoutFieldsNotAsked(payload);
        }
        if (workerDetailTabInfo?.type === localWorkerType?.id && isNationality && isNationalityByCategory) {
            if (!data.wait_in_macau) {
                handleManualError("wait_in_macau");
                return false;
            }
            clearErrors(["wait_in_macau"]);
        }
        // Remove empty parameters
        Object.keys(payload).forEach(key => {
            if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
                delete payload[key];
            }
        });
        if (overseasWorkerType?.id === workerDetailTabInfo?.type) {
            delete payload['contract_status'];
        }
        if (worker_id) {
            const mergedWorker = { ...workerDetailTabInfo, ...payload, id: worker_id };
            /* the fields the Contract Status does not ask for are cleared by the API — mirror that in the picked worker */
            if (localWorkerType?.id === workerDetailTabInfo?.type) {
                const asked = fieldsAskedFor(payload.contract_status, payload.expect_released_early);
                CONTRACT_SECTION_FIELDS.forEach((field) => { if (!asked.includes(field)) mergedWorker[field] = null; });
            }
            if (payload.contract_category) {
                const cat = (contractCategoryFiltered || []).find((c) => String(c.id) === String(payload.contract_category));
                if (cat) mergedWorker.contract_category_info = { ...(workerDetailTabInfo?.contract_category_info || {}), id: cat.id, name: cat.name_en, name_en: cat.name_en };
            }
            setSaving(true);
            dispatch(updateWorkerDetailsSlice(payload)).then(res => {
                setSaving(false);
                if (res?.error) {
                    /* a Contract Status rule refused by the API names its field: show it there, not as a toast */
                    const fieldErrors = serverFieldErrors(res?.payload);
                    if (Object.keys(fieldErrors).length > 0) setServerErrors(fieldErrors);
                    else ShowToast("error", res?.payload?.message);
                } else {
                    ShowToast("success", res?.payload?.message);
                    if (props.asModal && props.onDone) {
                        props.onDone(mergedWorker);
                    } else if (actionType === 'exchange') {
                        navigate(`/invoices/exchange/select-contract-exchange`, { state: { currentInvoiceWorker: mergedWorker, currentInvoiceWorkerDetail: mergedWorker } });
                    } else {
                        navigate(`/invoices/add-contract-invoice`, { state: { currentInvoiceWorker: mergedWorker, currentInvoiceWorkerDetail: mergedWorker } });
                    }
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [worker_id, workerDetailTabInfo, localWorkerType, overseasWorkerType, isNationality, isNationalityByCategory, actionType, contractCategoryFiltered, dispatch, navigate, handleManualError, clearErrors, setError, today, t]);

    const handleGetCanStartDate = useCallback((e) => {
        const { name, value } = e.target;
        setValue(name, value);
        if (value !== "") clearErrors([name]);
        if (name === "contract_status") {
            /* the category list follows the chosen contract status */
            if (value) dispatch(fetchContractCategory({ contract_status: value })).then((res) => { if (res && Array.isArray(res.payload)) setContractCategoryFiltered(res.payload); });
            /* the new status swaps the field set: what it does not ask for is cleared (as before). @migration-unspecified(invoice):
               the sheet does not say whether values are cleared or kept (Field rules D10; CONTRACT_STATUS_RULES_CHECK.md Q5) */
            if (value) {
                /* "1": a Finished status keeps its Early Release pair; every other status drops it */
                const notAsked = CONTRACT_SECTION_FIELDS.filter((field) => !fieldsAskedFor(value, "1").includes(field));
                notAsked.forEach((field) => setValue(field, ""));
                clearErrors(notAsked);
            }
        }
        /* No hides Early Release Date (it is rendered only when Yes) */
        if (name === "expect_released_early" && Number(value) !== 1) clearErrors(["early_release_date"]);
    }, [setValue, clearErrors, dispatch]);

    /* the date rules (window, Early Release Date before Visa Expiry Date) are the live rule table — statusErrors */
    const handleValidateDates = useCallback((e) => {
        const { name, value } = e.target;
        setValue(name, value);
        clearErrors([name]);
    }, [setValue, clearErrors]);

    const validate = useCallback((val) => {
        const res = validateHKID(val);
        setisHKID(res.formatted || "");
        setValue("hk_id", res?.hkid || "");
        if (!res.valid) {
            setError("hk_id", {
                type: "manual",
                message: res?.error,
            });
        } else {
            /* a valid value must drop the error object itself — an empty message still left `errors.hk_id` truthy,
               so the red `.invalid` border stayed after the correction */
            clearErrors("hk_id");
        }
    }, [setError, setValue, clearErrors]);

    const formBody = (
        <form className="takeover form-takeover" onSubmit={ handleSubmit(onSubmit) }>
                    <div className="tk-head">
                        <button type="button" className="btn-icon" onClick={ goStepBack } aria-label="Back"><i className="ri-arrow-left-s-line" /></button>
                        <div>
                            <h2>{ translation('key_worker_details') }</h2>
                            <div className="sub">{ t('key_review_worker_details_for_contract_invoice') || 'Review and confirm the worker details for this Contract Invoice.' }</div>
                        </div>
                        <div className="spacer" />
                    </div>

                    <div className="tk-body tk-body-flush">
                        <div className="ne-form">

                            {/* Basic details */}
                            <div className="ne-section">
                                <div className="sec-h">{ t('key_basic_details') || 'Basic details' }</div>
                                <div className="ne-grid">
                                    <div className="field">
                                        <label>{ translation('key_given_names') }<span className="req-star">*</span></label>
                                        <Controller name="name" control={ control } rules={ { required: t('key_given_names_are_required') } }
                                            render={ ({ field }) => (<input { ...field } type="text" className={ 'input' + (errors.name ? ' invalid' : '') } placeholder={ translation('key_given_names') } />) } />
                                        { errors.name && <small className="text-danger">{ errors.name.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ translation('key_surname') }<span className="req-star">*</span></label>
                                        <Controller name="surname" control={ control } rules={ { required: translation('key_surname_is_required') } }
                                            render={ ({ field }) => (<input { ...field } type="text" className={ 'input' + (errors.surname ? ' invalid' : '') } placeholder="Surname" />) } />
                                        { errors.surname && <small className="text-danger">{ errors.surname.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ translation('key_maiden_surname') }</label>
                                        <Controller name="maiden_surname" control={ control }
                                            render={ ({ field }) => (<input { ...field } type="text" className="input" placeholder={ t('key_enter_maiden_surname') } />) } />
                                        { errors.maiden_surname && <small className="text-danger">{ errors.maiden_surname.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ translation('key_alias_if_any') }</label>
                                        <Controller name="alias_name" control={ control }
                                            render={ ({ field }) => (<input { ...field } type="text" className="input" placeholder="Enter Alias" />) } />
                                        { errors.alias_name && <small className="text-danger">{ errors.alias_name.message }</small> }
                                    </div>
                                </div>
                            </div>

                            {/* Contact details */}
                            <div className="ne-section">
                                <div className="sec-h">{ t('key_contact_details') || 'Contact details' }</div>
                                <EntityContactDetailsForm control={ control } errors={ errors }
                                    getValues={ getValues }
                                    setError={ setError }
                                    setValue={ setValue }
                                    clearErrors={ clearErrors }
                                    countries={ workerContriesGeneral }
                                    workerDetailTabInfo={ workerDetailTabInfo }
                                    shouldDisabledCountry={ worker_id ? true : false }
                                />
                                <div className="ne-grid mt14">
                                    <div className="field">
                                        <label>{ t('key_home_country') }</label>
                                        <div className="select">
                                            <Controller name="home_country_code" control={ control }
                                                render={ ({ field }) => (
                                                    <select { ...field } className="input" id="home_country_code">
                                                        <option value="">{ t('key_select_country_code') }</option>
                                                        { workerContriesGeneral?.map((item, index) => (<option key={ index } value={ item.code }>{ item.name + " " + item.code }</option>)) }
                                                    </select>
                                                ) } />
                                        </div>
                                        { errors.home_country_code && <small className="text-danger">{ errors.home_country_code.message }</small> }
                                    </div>
                                    <div className="field span2">
                                        <label>{ t('key_home_phone_number') }</label>
                                        <Controller name="home_phone_number" control={ control }
                                            render={ ({ field }) => (<input { ...field } type="number" placeholder={ t('key_home_phone_number') } id="home_phone_number" className="input"
                                                onChange={ (e) => { handleMobileInput(e); field.onChange(e.target.value); } } />) } />
                                        { errors.home_phone_number && <small className="text-danger">{ errors.home_phone_number.message }</small> }
                                    </div>
                                </div>
                            </div>

                            {/* Identity & status */}
                            <div className="ne-section">
                                <div className="sec-h">{ t('key_identity_and_status') || 'Identity & status' }</div>
                                <div className="ne-grid">
                                    <div className="field">
                                        <label>{ t('key_hkid') }</label>
                                        <Controller name="hk_id" control={ control } rules={ { required: t('key_hkid_is_required') } }
                                            render={ ({ field }) => (<input { ...field } type="text" className={ 'input mono' + (errors.hk_id ? ' invalid' : '') } placeholder="Enter HKID" onChange={ (e) => { validate(e.target.value) } } value={ isHKID } />) } />
                                        { errors.hk_id && <small className="text-danger">{ errors.hk_id.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ t('key_nationality') }<span className="req-star">*</span></label>
                                        <div className="select">
                                            <Controller name="nationality" control={ control } rules={ { required: t('key_worker_nationality_is_required') } }
                                                render={ ({ field }) => (
                                                    <select { ...field } className="input" onChange={ (e) => { handleVisibility(e) } } disabled>
                                                        <option value="">{ t('key_please_select') }</option>
                                                        { workerNationalities?.map((nationality) => (<option key={ nationality.id } value={ nationality.id }>{ nationality.name }</option>)) }
                                                    </select>
                                                ) } />
                                        </div>
                                        { errors.nationality && <small className="text-danger">{ errors.nationality.message }</small> }
                                    </div>

                                    { (workerDetailTabInfo?.type === localWorkerType?.id) && (
                                        <>
                                            <div className="field">
                                                <label>{ translation('key_contract_status') }<span className="req-star">*</span></label>
                                                <div className="select">
                                                    <Controller name="contract_status" control={ control }
                                                        render={ ({ field }) => (
                                                            <select { ...field } className="input" id="contract_status" disabled={ workerDetailTabInfo?.type !== 1 } onChange={ (e) => { handleGetCanStartDate(e) } }>
                                                                <option value="">{ t('key_please_select') }</option>
                                                                { workerContractStatus?.map((item, index) => (<option key={ index } value={ item.id }>{ item.admin_panel_status }</option>)) }
                                                            </select>
                                                        ) } />
                                                </div>
                                                { fieldError('contract_status') && <small className="text-danger">{ fieldError('contract_status') }</small> }
                                            </div>
                                            {/* Contract Status rules sheet (22 Oct 2026): the status decides which fields are asked (the others stay
                                                greyed out, as before); Contract End Date and Visa Expiry Date pick between today −14 and +1095 days */}
                                            <div className="field">
                                                <label>{ t('key_contract_end_date') }{ askedFields.includes('contract_end_date') ? <span className="req-star">*</span> : null }</label>
                                                <Controller name="contract_end_date" control={ control }
                                                    render={ ({ field }) => (
                                                        <input { ...field } type="date" className="input" placeholder={ t('key_contract_end_date') }
                                                            min={ dateWindow.min } max={ dateWindow.max }
                                                            onChange={ (e) => { handleValidateDates(e) } }
                                                            disabled={ workerDetailTabInfo?.type !== 1 || !askedFields.includes('contract_end_date') } />
                                                    ) } />
                                                { fieldError('contract_end_date') && <small className="text-danger">{ fieldError('contract_end_date') }</small> }
                                            </div>
                                            { askedFields.includes('terminated_reason') && (
                                                <div className="field">
                                                    <label>{ translation('key_wkr_please_select_reason') }<span className="req-star">*</span></label>
                                                    <div className="select">
                                                        <Controller name="terminated_reason" control={ control }
                                                            render={ ({ field }) => (
                                                                <select { ...field } className="input" id="terminated_reason" onChange={ (e) => { handleValidateDates(e) } }>
                                                                    <option value="">{ t('key_please_select') }</option>
                                                                    { terminationReasons?.map((item) => (<option key={ item.id } value={ item.id }>{ item.name }</option>)) }
                                                                </select>
                                                            ) } />
                                                    </div>
                                                    { fieldError('terminated_reason') && <small className="text-danger">{ fieldError('terminated_reason') }</small> }
                                                </div>
                                            ) }
                                            <div className="field">
                                                <label className={ askedFields.includes('visa_expiry_date') ? "req" : "" }>
                                                    { t('key_visa_expiry') }{ askedFields.includes('visa_expiry_date') ? <span className="req-star">*</span> : null }
                                                </label>
                                                <Controller name="visa_expiry_date" control={ control }
                                                    render={ ({ field }) => (
                                                        <input { ...field } type="date" className="input" placeholder={ t('key_visa_expiry') }
                                                            min={ dateWindow.min } max={ dateWindow.max }
                                                            onChange={ (e) => { handleValidateDates(e) } }
                                                            disabled={ workerDetailTabInfo?.type !== 1 || !askedFields.includes('visa_expiry_date') } />
                                                    ) } />
                                                { fieldError('visa_expiry_date') && <small className="text-danger">{ fieldError('visa_expiry_date') }</small> }
                                            </div>
                                            <div className="field">
                                                <label>{ t('key_except_release_early') }{ askedFields.includes('expect_released_early') ? <span className="req-star">*</span> : null }</label>
                                                <div className="select">
                                                    <Controller name="expect_released_early" control={ control }
                                                        render={ ({ field }) => (
                                                            <select { ...field } className="input" id="expect_released_early" disabled={ workerDetailTabInfo?.type !== 1 || !askedFields.includes('expect_released_early') } onChange={ (e) => { handleGetCanStartDate(e) } }>
                                                                <option value="">{ t('key_please_select') }</option>
                                                                <option key="yes" value="1">Yes</option>
                                                                <option key="no" value="0">No</option>
                                                            </select>
                                                        ) } />
                                                </div>
                                                { fieldError('expect_released_early') && <small className="text-danger">{ fieldError('expect_released_early') }</small> }
                                            </div>
                                            { askedFields.includes('early_release_date') && (
                                                <div className="field">
                                                    <label>{ translation('key_early_release_date') }<span className="req-star">*</span></label>
                                                    <Controller name="early_release_date" control={ control }
                                                        render={ ({ field }) => (
                                                            /* the picker greys out the visa expiry date and everything after it — Early Release Date must be strictly earlier */
                                                            <input { ...field } type="date" className="input" placeholder={ translation('key_early_release_date') }
                                                                max={ earlyReleaseMax }
                                                                onChange={ (e) => { handleValidateDates(e) } } />
                                                        ) } />
                                                    { fieldError('early_release_date') && <small className="text-danger">{ fieldError('early_release_date') }</small> }
                                                </div>
                                            ) }
                                        </>
                                    ) }
                                </div>
                            </div>

                            {/* Contract */}
                            <div className="ne-section">
                                <div className="sec-h">{ t('key_contract') || 'Contract' }</div>
                                <div className="ne-grid">
                                    <div className="field">
                                        <label>{ translation('key_contract_category') }<span className="req-star">*</span></label>
                                        <div className="select">
                                            <Controller name="contract_category" control={ control }
                                                render={ ({ field }) => (
                                                    <select { ...field } className="input" id="contract_category" onChange={ (e) => { handleVisibilityByCategory(e) } }>
                                                        <option value="">{ t('key_please_select') }</option>
                                                        { contractCategoryFiltered && contractCategoryFiltered?.map((item, index) => (<option key={ index } value={ item.id }>{ item.name_en }</option>)) }
                                                    </select>
                                                ) } />
                                        </div>
                                        { errors.contract_category && <small className="text-danger">{ errors.contract_category.message }</small> }
                                    </div>
                                    { (workerDetailTabInfo?.type === localWorkerType?.id && isNationality && isNationalityByCategory) && (
                                        <div className="field">
                                            <label>{ translation('key_wait_in_macau') }<span className="req-star">*</span></label>
                                            <div className="select">
                                                <Controller name="wait_in_macau" control={ control }
                                                    render={ ({ field }) => (
                                                        <select { ...field } className="input" id="wait_in_macau" onChange={ (e) => { field.onChange(e); if (e.target.value !== "") clearErrors(["wait_in_macau"]); } }>
                                                            <option value="">{ t('key_please_select') }</option>
                                                            <option key="yes" value="1">Yes</option>
                                                            <option key="no" value="0">No</option>
                                                        </select>
                                                    ) } />
                                            </div>
                                            { errors.wait_in_macau && <small className="text-danger">{ errors.wait_in_macau.message }</small> }
                                        </div>
                                    ) }
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="tk-foot">
                        <button type="button" className="btn btn-secondary md" onClick={ goBack }>{ translation('key_cancel') }</button>
                        { (!props.asModal || props.onBack) && (
                            <button type="button" className="btn btn-secondary md" onClick={ goStepBack }><i className="ri-arrow-left-s-line" />{ translation('key_back') }</button>
                        ) }
                        <div className="spacer" />
                        {/* blocked until the Contract Status rules pass (Local workers) — every broken rule shows under its field — and
                            while the save is on its way */}
                        <button type="submit" className="btn btn-primary md" disabled={ sectionInvalid || saving }>
                            { saving ? <CustomSpinner variant="inline" /> : translation('key_next') }<i className="ri-arrow-right-s-line" />
                        </button>
                    </div>
                </form>
    );

    if (props.asModal) {
        return (
            <div className="invd">
                <div className="takeover-veil" role="dialog" aria-modal="true">
                    { formBody }
                </div>
            </div>
        );
    }

    return (
        <CommonContentContainer>
            <CustomBreadcrumb
                items={ [
                    { label: t('key_select_worker'), link: '../' + routes.selectWorker },
                    { label: t('key_add_worker_details') },
                ] } />
            <div className="invd tk-page">
                { formBody }
            </div>
        </CommonContentContainer>
    );
};

AddWorkerDetailsOfInvoice.propTypes = {
    asModal: PropTypes.bool,
    workerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func,
    /* modal reached from a picker: Back returns to that picker; absent (opened from the card) → Cancel only */
    onBack: PropTypes.func,
    onDone: PropTypes.func,
};

export default AddWorkerDetailsOfInvoice;