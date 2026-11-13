import React, { useEffect, useState, useCallback, useRef } from "react";
import PropTypes from 'prop-types';
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { yupResolver } from "@hookform/resolvers/yup";
import "../new-ui-shared.css";
import "../new-ui-create.css";
import { useTranslation } from "react-i18next";
import { Controller, useForm } from "react-hook-form";
// import EntityContactDetailsForm from "./EntityContactDetailsForm";
import EntityContactDetailsForm from "../add-contract-invoice/EntityContactDetailsForm";
import { updateGeneralOverseasWorkerOfInvoiceFormSchema, updateGeneralLocalWorkerOfInvoiceFormSchema } from "../../WorkerPage/add-worker/addWorkerSchema";
import { updateGeneralLocalWorkerOfInvoiceFormState, updateGeneralOverseasWorkerOfInvoiceFormState } from "../../../../components/ReusableComponents/form-states";
import {
    fetchCountriesGeneral,
    // fetchCountriesWorker
} from "../../../../redux/Slices/common/countries/CountriesSlice";
import { fetchWorkerNationalities } from "../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import { fetchContractCategory } from "../../../../redux/Slices/contract/ContractSlice";
import {
    fetchWorkerDetailTabInfo,
    //updateWorkerDetailsSlice,
    updateContractWorkerSlice
} from "../../../../redux/Slices/worker/WorkerSlice";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { fetchContractStatus } from "../../../../redux/Slices/common/CommonSlice";
import { workerTypeList, workerNationalityList } from "../../../../components/ReusableComponents/constants";
import { validateHKID } from "../../../../utils/utils";
import translation from "../../../../utils/translation";
import DateInput from "../../../../components/ui/DateInput";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";

/*
 * Standalone Invoice · the worker party's details (restored 30 Oct 2026 at the owner's request, "same screen as the old
 * worker field"; INV-G2 had dropped it): after Select Worker, and from the worker card's Edit, staff review and can update
 * the worker's names, mobile, HKID, date of birth and passport (the contract API's save-worker) before the worker is the
 * invoice's party. A worker is never created from Invoice. Opened as a modal by the Standalone setup stage.
 */
const AddWorkerDetailsOfInvoice = (props) => {
    const { t } = useTranslation(); // Access translations
    const dispatch = useDispatch();
    const [commonState, setCommonState] = useState("");
    const [isHKID, setisHKID] = useState("");
    /* Next is saving the worker: the button shows the spinner and takes no second click until the API answers */
    const [saving, setSaving] = useState(false);
    const worker_id = props.workerId;
    const goBack = () => props.onClose();
    /* Back = one step (the picker that opened this modal); Cancel = close the whole flow (goBack) */
    const goStepBack = () => { if (props.onBack) props.onBack(); else goBack(); };
    const { workerNationalities, contractStatus, workerDetailTabInfo, workerContriesGeneral } = useSelector((state) => ({
            workerNationalities: state.nationalities.workerNationalities,
            contractStatus: state.common.contractStatus,
            workerDetailTabInfo: state.worker.workerDetailTabInfo,
            contractCategoryLists: state.contracts.contractCategoryLists,
            countries: state.countries.countries,
            workerContries: state.countries.workerContries,
            workerContriesGeneral: state.countries.workerContriesGeneral,
        }), shallowEqual);
    const overseasWorkerType = workerTypeList().find((type) => type.key === "overseas");
    const localWorkerType = workerTypeList().find((type) => type.key === "local");
    const workerPhilNationality = workerNationalityList().find((nationality) => nationality.key === "philippines");
    const hasPhillNationality = workerDetailTabInfo?.nationality?.id === workerPhilNationality.id;
    const workerIndoNationality = workerNationalityList().find((nationality) => nationality.key === "indonesia");
    const hasIndonesianNationality = workerDetailTabInfo?.nationality?.id == workerIndoNationality.id;
    const {
        handleSubmit,
        setError,
        clearErrors,
        getValues,
        setValue,
        control,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(localWorkerType?.id === workerDetailTabInfo?.type ? updateGeneralLocalWorkerOfInvoiceFormSchema : updateGeneralOverseasWorkerOfInvoiceFormSchema),
        defaultValues: localWorkerType?.id === workerDetailTabInfo?.type ? updateGeneralLocalWorkerOfInvoiceFormState : updateGeneralOverseasWorkerOfInvoiceFormState,
    });

    useEffect(() => {
        if (hasPhillNationality || hasIndonesianNationality) {
            // setIsNationality(true);
        }
    }, [hasPhillNationality, hasIndonesianNationality]);

    /* the lookups as the form opens (performance track A-16): the effect reads them here, so a lookup landing does not run
       it again — before, each one that landed read the worker again, and an empty one was asked for again and again */
    const lookupsRef = useRef(null);
    lookupsRef.current = { workerContriesGeneral, workerNationalities, contractStatus };
    useEffect(() => {
        const lookups = lookupsRef.current;
        const fetchData = async () => {
            const promises = [];
            if (!lookups.workerContriesGeneral?.length) promises.push(dispatch(fetchCountriesGeneral({ type: "worker_only" })));
            // if (!workerContries?.length) promises.push(dispatch(fetchCountriesWorker({ "type": "worker_home" })));
            if (!lookups.workerNationalities?.length) promises.push(dispatch(fetchWorkerNationalities({ type: "worker" })));
            if (!lookups.contractStatus?.length) promises.push(dispatch(fetchContractStatus({ type: "worker" })));
            try {
                await Promise.allSettled(promises);
            } catch (error) {
                console.log('error', error);
            }
            finally {
                if (worker_id) {
                    dispatch(fetchWorkerDetailTabInfo({ "worker_id": worker_id, type: 'basic' }));
                }
            }
        };
        fetchData();
    }, [dispatch, worker_id]);

    useEffect(() => {
        if (localWorkerType?.id === workerDetailTabInfo?.type) {
            setCommonState(updateGeneralLocalWorkerOfInvoiceFormState);
        } else {
            setCommonState(updateGeneralOverseasWorkerOfInvoiceFormState);
        }
    }, [dispatch, worker_id, workerDetailTabInfo, updateGeneralLocalWorkerOfInvoiceFormState, updateGeneralOverseasWorkerOfInvoiceFormState]);

    /* contract-category-list takes the worker's contract_status (backend 2026-10-06): read again when that status changes,
       not on every new worker object (performance track A-16) */
    const hasWorkerDetail = Boolean(workerDetailTabInfo);
    const categoryStatus = (typeof workerDetailTabInfo?.contract_status === 'object' ? workerDetailTabInfo.contract_status?.id : workerDetailTabInfo?.contract_status) ?? workerDetailTabInfo?.contract_status_info?.id ?? null;
    useEffect(() => {
        if (worker_id && hasWorkerDetail) {
            dispatch(fetchContractCategory({ contract_status: categoryStatus }));
        }
    }, [dispatch, worker_id, hasWorkerDetail, categoryStatus]);

    useEffect(() => {
        if (worker_id && workerDetailTabInfo) {
            Object.keys(commonState).forEach((key) => {
                if (typeof workerDetailTabInfo?.[key] === 'object') {
                    setValue(key, workerDetailTabInfo[key]?.id || '');
                } else {
                    setValue(key, workerDetailTabInfo?.[key] || '');
                    if (key === "hk_id") {
                        if (workerDetailTabInfo?.[key]) {
                            // Remove special characters () before validating HKID
                            const cleanedHKID = (workerDetailTabInfo?.[key] || '').replace(/[()]/g, '');
                            const res = validateHKID(cleanedHKID);
                            setisHKID(workerDetailTabInfo?.[key] || "");
                            if (!res.valid) {
                                setError("hk_id", {
                                    type: "manual",
                                    message: res?.error,
                                });
                            } else {
                                setValue("hk_id", res?.hkid || ""); // Update the form value with the formatted HKID 
                                clearErrors("hk_id");
                            }
                        } else {
                            setValue("hk_id", "");
                            clearErrors("hk_id");
                        }
                    } else if (key === "whatsapp_country_code_name") {
                        const matchedCountry = workerContriesGeneral?.find(
                            (item) => item.code === workerDetailTabInfo?.['whatsapp_country_code']
                        );
                        setValue(key, matchedCountry ? matchedCountry.country_code : '');
                    }
                }
            });
        }
    }, [dispatch, worker_id, workerDetailTabInfo, commonState]);

    const onSubmit = (data) => {
        let payload = {
            ...data,
            worker_id: worker_id,
            user_id: workerDetailTabInfo?.user_id,
            mobile_number_verified: (data?.mobile_verified) ? data?.mobile_verified : 0,
            mobile_number_verified_at: (data?.mobile_verified_at) ? data?.mobile_verified_at : null,
        };
        Object.keys(payload).forEach(key => {
            if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
                delete payload[key];
            }
        });
        payload.mobile_number_verified = (data?.mobile_verified) ? data?.mobile_verified : 0;
        payload.mobile_number_verified_at = (data?.mobile_verified_at) ? data?.mobile_verified_at : null;
        payload.whatsapp_verified_at = (data?.whatsapp_verified_at) ? data?.whatsapp_verified_at : null;
        payload.whatsapp_verified = (data?.whatsapp_verified) ? data?.whatsapp_verified : 0;

        if (data.hk_id) {
            const res = validateHKID(data.hk_id);
            if (!res.valid) {
                setError("hk_id", { type: "manual", message: res?.error });
                return;
            } else {
                data.hk_id = res?.hkid || data.hk_id;
                clearErrors("hk_id");
            }
        }

        if (overseasWorkerType?.id === workerDetailTabInfo?.type) {
            delete payload['contract_status'];
        }
        if (worker_id) {
            setSaving(true);
            dispatch(updateContractWorkerSlice(payload)).then(res => {
                setSaving(false);
                if (res?.error) {
                    ShowToast("error", res?.payload?.message);
                } else {
                    ShowToast("success", res?.payload?.message);
                    props.onDone({ ...workerDetailTabInfo, ...payload, id: worker_id });
                }
            });
        }
    }

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
            clearErrors("hk_id");
        }
    }, []);

    const formBody = (
                <form className="takeover form-takeover" onSubmit={ handleSubmit(onSubmit) }>
                    <div className="tk-head">
                        <button type="button" className="btn-icon" onClick={ goStepBack } aria-label="Back"><i className="ri-arrow-left-s-line" /></button>
                        <div>
                            <h2>{ translation('key_worker_details') }</h2>
                            <div className="sub">{ t('key_review_worker_details_for_standalone_invoice') }</div>
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
                                    actionType="mobile"
                                    shouldDisabledCountry={ worker_id ? true : false }
                                />
                            </div>

                            {/* Identity */}
                            <div className="ne-section">
                                <div className="sec-h">{ t('key_identity_and_address') || 'Identity' }</div>
                                <div className="ne-grid">
                                    <div className="field">
                                        <label>{ translation('key_hkid') }<span className="req-star">*</span></label>
                                        <Controller name="hk_id" control={ control } rules={ { required: translation('key_hkid_is_required') } }
                                            render={ ({ field }) => (<input { ...field } type="text" className={ 'input mono' + (errors.hk_id ? ' invalid' : '') } placeholder="Enter HKID" onChange={ (e) => { validate(e.target.value) } } value={ isHKID } />) } />
                                        { errors.hk_id && <small className="text-danger">{ errors.hk_id.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ translation('key_date_of_birth') }</label>
                                        <Controller name="date_of_birth" control={ control } rules={ { required: translation('key_date_of_birth_is_required') } }
                                            render={ ({ field }) => (<DateInput
                                                value={ field.value || '' }
                                                onChange={ field.onChange }
                                                onBlur={ field.onBlur }
                                            />) } />
                                        { errors.date_of_birth && <small className="text-danger">{ errors.date_of_birth.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ translation('key_passport') }<span className="req-star">*</span></label>
                                        <Controller name="passport_number" control={ control } rules={ { required: "Passport is required" } }
                                            render={ ({ field }) => (<input { ...field } type="text" className="input" placeholder={ translation('key_enter_passport') } />) } />
                                        { errors.passport_number && <small className="text-danger">{ errors.passport_number.message }</small> }
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="tk-foot">
                        <button type="button" className="btn btn-secondary md" onClick={ goBack }>{ translation('key_cancel') }</button>
                        { props.onBack && (
                            <button type="button" className="btn btn-secondary md" onClick={ goStepBack }><i className="ri-arrow-left-s-line" />{ translation('key_back') }</button>
                        ) }
                        <div className="spacer" />
                        <button type="submit" className="btn btn-primary md" disabled={ saving }>
                            { saving ? <CustomSpinner variant="inline" /> : translation('key_next') }<i className="ri-arrow-right-s-line" />
                        </button>
                    </div>
                </form>
    );

    return (
        <div className="invd">
            <div className="takeover-veil" role="dialog" aria-modal="true">
                { formBody }
            </div>
        </div>
    );
};

AddWorkerDetailsOfInvoice.propTypes = {
    workerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    /* modal reached from a picker: Back returns to that picker; absent (opened from the card) → Cancel only */
    onBack: PropTypes.func,
    onDone: PropTypes.func.isRequired,
};

export default AddWorkerDetailsOfInvoice;