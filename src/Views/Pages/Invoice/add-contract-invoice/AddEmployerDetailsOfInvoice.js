import React, { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import CommonContentContainer from "../../../../components/common-content-container/CommonContentContainer";
import CustomBreadcrumb from "../../../../components/custom-breadcrumb/CustomBreadcrumb";
import '../new-ui-shared.css';
import '../new-ui-create.css';
import { Controller, useForm, useWatch } from "react-hook-form";
const EntityContactDetailsForm = lazy(() => import("./EntityContactDetailsForm"));
import { useDispatch, useSelector } from "react-redux";
import routes from "../../routes/routesConfig";
import { yupResolver } from "@hookform/resolvers/yup";
import { addEmployerOfInvoiceSchema } from "../../Employer/add-employer/addEmployerSchema";
import { addEmployerOfInvoiceFormState } from "../../../../components/ReusableComponents/form-states";
import { fetchEmployerCountries } from "../../../../redux/Slices/common/countries/CountriesSlice";
import { fetchActiveBranches } from "../../../../redux/Slices/settings/branches/BranchesSlice";
import { fetchSpokenEmployerLanguageList } from "../../../../redux/Slices/common/CommonSlice";
import { getEmployerNationalityList } from "../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import { getDeviceType } from "../../../../services/commonService";
import { addEmployer, fetchEmployerDetail } from "../../../../redux/Slices/employer/EmployerSlice";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { fetchDistrictByCountryCode } from "../../../../redux/Slices/common/district/DistrictSlice";
import { validateHKID } from "../../../../utils/utils";
import translation from "../../../../utils/translation";
import PropTypes from 'prop-types';
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
const AddEmployerDetailsOfInvoice = (props) => {
    const { t } = useTranslation(); // Access translations
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const [isHKID, setisHKID] = useState("");
    const [actionType, setActionType] = useState("invoice");
    const { employer_id: routeEmployerId } = useParams();
    const employer_id = props.employerId || routeEmployerId;
    const districtsByCountryCode = useSelector((state) => state.district.districtsByCountryCode);
    const currentActiveBranches = useSelector((state) => state.branches.currentActiveBranches);
    const spokenLanguagesListEmp = useSelector((state) => state.common.spokenLanguagesListEmp);
    const status = useSelector((state) => state.employer.status);
    const employerNationalities = useSelector((state) => state.nationalities.employerNationalities);
    const currentEmployer = useSelector((state) => state.employer.currentEmployer);
    const employerCountries = useSelector((state) => state.countries.employerCountries);
    /* Employer list already fetched by the Select Employer picker — reused for
       the duplicate mobile/email hint (mockup dup-warn). Display-only. */
    const employers = useSelector((state) => state.employer.employers);

    useEffect(() => {
        if (location.state?.actionType) {
            setActionType(location.state?.actionType);
        }
    }, [location.state]);

    const {
        handleSubmit,
        setError,
        clearErrors,
        getValues,
        setValue,
        control,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(addEmployerOfInvoiceSchema),
        defaultValues: addEmployerOfInvoiceFormState,
    });

    /* Duplicate hint (mockup dup-warn): warn when the typed mobile/email already
       belongs to another employer in the loaded list. Purely informational —
       it never blocks saving and skips the employer being edited. */
    const [watchMobile, watchEmail] = useWatch({ control, name: ['mobile_number', 'email'] });
    const duplicateEmployer = useMemo(() => {
        if (!Array.isArray(employers) || employers.length === 0) return null;
        const mob = String(watchMobile || '').replace(/\s/g, '');
        const mail = String(watchEmail || '').trim().toLowerCase();
        if (!mob && !mail) return null;
        return employers.find((e) => {
            if (employer_id && String(e.employer_id) === String(employer_id)) return false;
            const eMob = String(e.mobile_number || '').replace(/\s/g, '');
            const eMail = String(e.email || '').trim().toLowerCase();
            return (mob && eMob && eMob === mob) || (mail && eMail && eMail === mail);
        }) || null;
    }, [employers, watchMobile, watchEmail, employer_id]);

    /* the lookups as the form opens (performance track A-16): the effect reads them here, so a lookup landing does not run
       it again — before, each one that landed read the employer again, and an empty one was asked for again and again */
    const lookupsRef = useRef(null);
    lookupsRef.current = { employerCountries, currentActiveBranches, employerNationalities, spokenLanguagesListEmp };
    useEffect(() => {
        const lookups = lookupsRef.current;
        const fetchData = async () => {
            const promises = [];
            if (!lookups.employerCountries?.length) promises.push(dispatch(fetchEmployerCountries({ type: "employer" })));
            if (!lookups.currentActiveBranches?.length) promises.push(dispatch(fetchActiveBranches({ status: 1 })));
            if (!lookups.employerNationalities?.length) promises.push(dispatch(getEmployerNationalityList({ type: "employer" })));
            if (!lookups.spokenLanguagesListEmp?.length) promises.push(dispatch(fetchSpokenEmployerLanguageList({ type: "employer" })));
            await Promise.allSettled(promises);
            if (employer_id) {
                dispatch(fetchEmployerDetail({ employer_id }));
            }
        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, employer_id]);

    useEffect(() => {
        if (employer_id && currentEmployer) {
            Object.keys(addEmployerOfInvoiceFormState).forEach((key) => {
                if (key === "nationality") {
                    if (currentEmployer.nationality_info) {
                        setValue(key, currentEmployer.nationality_info.id);
                    } else {
                        setValue(key, "");
                    }
                } else if (key === "spoken_language") {
                    if (currentEmployer?.spoken_language_info) {
                        setValue(key, currentEmployer?.spoken_language_info?.id);
                    } else {
                        setValue(key, "");
                    }
                } else if (key === "residential_address") {
                    if (currentEmployer?.primary_residential_address) {
                        setValue(key, currentEmployer?.primary_residential_address?.address_line_1);
                        setValue('residential_address_id', currentEmployer?.primary_residential_address?.id);
                    } else {
                        setValue(key, "");
                        setValue('residential_address_id', "");
                    }
                } else if (key === "correspondence_address") {
                    if (currentEmployer?.primary_correspondence_address) {
                        setValue(key, currentEmployer?.primary_correspondence_address?.address_line_1);
                        setValue('correspondence_address_id', currentEmployer?.primary_correspondence_address?.id);
                    } else {
                        setValue(key, "");
                        setValue('correspondence_address_id', "");
                    }
                } else if (key === "birth_date") {
                    if (currentEmployer.birth_date) {
                        setValue(key, currentEmployer.birth_date);
                    } else {
                        setValue(key, "");
                    }
                } else if (key === "branch_id") {
                    if (currentEmployer.office_location) {
                        setValue(key, currentEmployer.office_location);
                    } else {
                        setValue(key, "");
                    }
                } else if (key === "country_code") {
                    setValue(key, currentEmployer[key] || '');
                    dispatch(fetchDistrictByCountryCode(currentEmployer?.location_info?.country_code));
                } else {
                    if (key === "hk_id") {
                        if (currentEmployer?.[key]) {
                            // Remove special characters () before validating HKID
                            const cleanedHKID = (currentEmployer?.[key] || '').replace(/[()]/g, '');
                            const res = validateHKID(cleanedHKID);
                            setisHKID(currentEmployer?.[key] || "");
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
                        }
                    }
                    if (key !== "whatsapp_country_code" && key !== "country_code") {
                        setValue(key, currentEmployer[key] || '');
                    }
                    if (key === "whatsapp_country_code") {
                        setValue('whatsapp_country_code', currentEmployer?.['whatsapp_country_code'] || '');
                    }
                }
            });
        }
    }, [dispatch, employer_id, currentEmployer, setValue]);

    /**
     *  Form submit handler
     * @param {*} data 
     */
    const onSubmit = useCallback((data) => {
        const errorKeys = Object.keys(errors);
        console.log("errorserrorserrorserrors", errors);
        if (errorKeys.length) {
            const firstError = errors[errorKeys[0]];
            ShowToast('error', firstError?.message || t('key_please_fix_errors'));
            return;
        }
        if (currentEmployer?.primary_residential_address?.id) {
            if (!data.residential_address) {
                setError("residential_address", {
                    type: "manual",
                    message: translation('key_enter_residential_address'),
                });
                return;
            }
        }
        if (currentEmployer?.primary_correspondence_address?.id) {
            if (!data.correspondence_address) {
                setError("correspondence_address", {
                    type: "manual",
                    message: translation('key_enter_correspondence_address'),
                });
                return;
            }
        }
        let deviceType = getDeviceType();
        const formData = {
            ...data,
            device_type: deviceType?.id,
            type: 'invoices',
        };
        if (employer_id) {
            formData.employer_id = employer_id;
        }
        if (formData.hk_id) {
            const res = validateHKID(formData.hk_id);
            if (!res.valid) {
                setError("hk_id", { type: "manual", message: res?.error });
                return;
            } else {
                formData.hk_id = res?.hkid || formData.hk_id;
                clearErrors("hk_id");
            }
        }
        dispatch(addEmployer(formData)).then((res) => {
            if (res?.error) {
                ShowToast('error', res?.payload?.data.data.message);
            } else {
                ShowToast('success', res?.payload?.message);
                /* an edit keeps the record it loaded; a new employer is the one save-employer created (its id is in the answer,
                   data.id) and carries nothing of an employer loaded before (INV-G2: a Standalone employer party needs it) */
                const createdId = res?.payload?.data?.id;
                const saved = employer_id ? { ...currentEmployer, ...formData } : { ...formData, ...(createdId ? { employer_id: createdId, id: createdId } : {}) };
                if (props.asModal && props.onDone) {
                    props.onDone(saved);
                } else if (actionType === 'exchange') {
                    navigate(`/invoices/exchange/select-contract-exchange`, { state: { currentInvoiceEmployer: saved } });
                } else {
                    navigate(`/invoices/add-contract-invoice`, { state: { currentInvoiceEmployer: saved } });
                }
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, navigate, setError, currentEmployer, employer_id, actionType]);

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
    }, [setError, setValue, clearErrors]);

    const breadcrumbItems = useMemo(() => [
        { label: t('key_select_employer'), link: '../' + routes.selectEmployer },
        { label: `${ translation('key_add_employer') }} Details` },
    ], [t]);

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

    const reqStar = <span className="req-star">*</span>;

    const formBody = (
        <form className="takeover form-takeover" onSubmit={ handleSubmit(onSubmit) }>
                    <div className="tk-head">
                        <button type="button" className="btn-icon" onClick={ goStepBack } aria-label="Back"><i className="ri-arrow-left-s-line" /></button>
                        <div>
                            <h2>{ t('key_employer_details') }</h2>
                            <div className="sub">{ props.standalone ? t('key_create_employer_record_for_standalone_invoice') : (t('key_create_employer_record_for_contract_invoice') || 'Create an employer record to use on this Contract Invoice.') }</div>
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
                                        <label>{ translation('key_title') }{ reqStar }</label>
                                        <div className="select">
                                            <Controller name="title" control={ control } rules={ { required: t('key_title_is_required') } }
                                                render={ ({ field }) => (
                                                    <select { ...field } className="input">
                                                        <option value="">{ t('key_select_title') }</option>
                                                        <option value="Mr">{ translation('key_mr') }</option>
                                                        <option value="Mrs">{ t('key_mrs') }</option>
                                                        <option value="Ms">{ t('key_ms') }</option>
                                                    </select>
                                                ) } />
                                        </div>
                                        { errors.title && <small className="text-danger">{ errors.title.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ translation('key_surname') }{ reqStar }</label>
                                        <Controller name="surname" control={ control } rules={ { required: translation('key_surname_is_required') } }
                                            render={ ({ field }) => (<input { ...field } type="text" className={ 'input' + (errors.surname ? ' invalid' : '') } placeholder="Surname" />) } />
                                        { errors.surname && <small className="text-danger">{ errors.surname.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ translation('key_given_names') }</label>
                                        <Controller name="name" control={ control } rules={ { required: t('key_given_names_are_required') } }
                                            render={ ({ field }) => (<input { ...field } type="text" className={ 'input' + (errors.name ? ' invalid' : '') } placeholder={ translation('key_given_names') } />) } />
                                        { errors.name && <small className="text-danger">{ errors.name.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ t('key_chinese_name') }</label>
                                        <Controller name="chinese_name" control={ control } rules={ { required: t('key_chinese_name_is_required') } }
                                            render={ ({ field }) => (<input { ...field } type="text" className="input" placeholder={ t('key_chinese_name') } />) } />
                                        { errors.chinese_name && <small className="text-danger">{ errors.chinese_name.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ t('key_primary_language') }{ reqStar }</label>
                                        <div className="select">
                                            <Controller name="spoken_language" control={ control } rules={ { required: t('key_primary_language_is_required') } }
                                                render={ ({ field }) => (
                                                    <select { ...field } className="input">
                                                        <option value="">{ t('key_select_language') }</option>
                                                        { spokenLanguagesListEmp?.map((item) => (<option key={ item.id } value={ item.id }>{ item.name }</option>)) }
                                                    </select>
                                                ) } />
                                        </div>
                                        { errors.spoken_language && <small className="text-danger">{ errors.spoken_language.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ translation('key_employer_nationality') }{ reqStar }</label>
                                        <div className="select">
                                            <Controller name="nationality" control={ control } rules={ { required: translation('key_employer_nationality_is_required') } }
                                                render={ ({ field }) => (
                                                    <select { ...field } className="input">
                                                        <option value="">{ t('key_please_select') }</option>
                                                        { employerNationalities?.map((nationality) => (<option key={ nationality.id } value={ nationality.id }>{ nationality.name }</option>)) }
                                                    </select>
                                                ) } />
                                        </div>
                                        { errors.nationality && <small className="text-danger">{ errors.nationality.message }</small> }
                                    </div>
                                </div>
                            </div>

                            {/* Contact details */}
                            <div className="ne-section">
                                <div className="sec-h">{ t('key_contact_details') || 'Contact details' }</div>
                                <Suspense fallback={ <CustomSpinner /> }>
                                    <EntityContactDetailsForm control={ control } errors={ errors }
                                        getValues={ getValues }
                                        setError={ setError }
                                        setValue={ setValue }
                                        clearErrors={ clearErrors }
                                        countries={ employerCountries }
                                        shouldDisabledCountry={ employer_id ? true : false }
                                    />
                                </Suspense>
                                { duplicateEmployer && (
                                    <div className="dup-warn">
                                        <span className="ico"><i className="ri-alert-line" /></span>
                                        <span>
                                            { t('key_duplicate_employer_warn_lead') }{ ' ' }
                                            <strong>{ duplicateEmployer.name }</strong>
                                            { duplicateEmployer.reference_id ? ` (${ duplicateEmployer.reference_id })` : '' }.{ ' ' }
                                            { t('key_duplicate_employer_warn_tail') }
                                        </span>
                                    </div>
                                ) }
                            </div>

                            {/* Identity & address */}
                            <div className="ne-section">
                                <div className="sec-h">{ t('key_identity_and_address') || 'Identity & address' }</div>
                                <div className="ne-grid">
                                    <div className="field">
                                        <label>HKID{ reqStar }</label>
                                        <Controller name="hk_id" control={ control } rules={ { required: t('key_hkid_is_required') } }
                                            render={ ({ field }) => (
                                                <input { ...field } type="text" className={ 'input mono' + (errors.hk_id ? ' invalid' : '') } placeholder="Enter HKID"
                                                    onChange={ (e) => { validate(e.target.value) } } value={ isHKID } />
                                            ) } />
                                        { errors.hk_id && <small className="text-danger">{ errors.hk_id.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ t('key_date_of_birth') || 'Date of birth' }</label>
                                        <Controller name="birth_date" control={ control }
                                            render={ ({ field }) => (<input { ...field } type="date" className="input" placeholder="Date Of Birth" />) } />
                                        { errors.birth_date && <small className="text-danger">{ errors.birth_date.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ translation('key_district') }</label>
                                        <div className="select">
                                            <Controller name="district" control={ control } rules={ { required: translation('key_district_is_required') } }
                                                render={ ({ field }) => (
                                                    <select { ...field } className="input">
                                                        <option value="">{ t('key_please_select') }</option>
                                                        { districtsByCountryCode?.map((dist) => (<option key={ dist.id } value={ dist.id }>{ dist.name }</option>)) }
                                                    </select>
                                                ) } />
                                        </div>
                                        { errors.district && <small className="text-danger">{ errors.district.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ t('key_branch') || 'Branch' }{ reqStar }</label>
                                        <div className="select">
                                            <Controller name="branch_id" control={ control }
                                                render={ ({ field }) => (
                                                    <select { ...field } className="input">
                                                        <option value="">{ t('key_select_branch') }</option>
                                                        { currentActiveBranches?.map((branch) => (<option key={ branch.id } value={ branch.id }>{ branch.branch_name }</option>)) }
                                                    </select>
                                                ) } />
                                        </div>
                                        { errors.branch_id && <small className="text-danger">{ errors.branch_id.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ t('key_occupation') }</label>
                                        <Controller name="occupation" control={ control } rules={ { required: t('key_hkid_is_required') } }
                                            render={ ({ field }) => (<input { ...field } type="text" className="input" placeholder={ t('key_enter_occupation') } />) } />
                                        { errors.occupation && <small className="text-danger">{ errors.occupation.message }</small> }
                                    </div>
                                    <div className="field">
                                        <label>{ t('key_source') }</label>
                                        <div className="select">
                                            <Controller name="source" control={ control } rules={ { required: "Source is required" } }
                                                render={ ({ field }) => (
                                                    <select { ...field } className="input">
                                                        <option value="">{ t('key_please_select') }</option>
                                                        <option key="newspaper" value="newspaper">{ t('key_newspaper') }</option>
                                                        <option key="friend" value="friend">{ t('key_friend') }</option>
                                                        <option key="internet" value="internet">{ t('key_internet') }</option>
                                                    </select>
                                                ) } />
                                        </div>
                                        { errors.source && <small className="text-danger">{ errors.source.message }</small> }
                                    </div>
                                    <div className="field span2">
                                        <label className={ currentEmployer?.primary_residential_address?.id ? 'req' : '' }>{ t('key_residential_address') }{ currentEmployer?.primary_residential_address?.id ? reqStar : null }</label>
                                        <Controller name="residential_address" control={ control } rules={ { required: "Residential is required" } }
                                            render={ ({ field }) => (<input { ...field } type="text" className="input" placeholder={ t('key_enter_residential_address') } />) } />
                                        { errors.residential_address && <small className="text-danger">{ errors.residential_address.message }</small> }
                                        <Link className="form-link form-link-sm" onClick={ (e) => e.preventDefault() }>{ t('key_change_address') }</Link>
                                    </div>
                                    <div className="field span2">
                                        <label>{ t('key_correspondence_address_if_different') }{ currentEmployer?.primary_correspondence_address?.id ? reqStar : null }</label>
                                        <Controller name="correspondence_address" control={ control } rules={ { required: t('key_correspondence_is_required') } }
                                            render={ ({ field }) => (<input { ...field } type="text" className="input" placeholder={ t('key_enter_correspondence_address') } />) } />
                                        { errors.correspondence_address && <small className="text-danger">{ errors.correspondence_address.message }</small> }
                                    </div>
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
                        <button type="submit" className="btn btn-primary md" disabled={ status === 'loading' }>
                            { status === 'loading' ? translation('key_processing') + "..." : translation('key_next') }<i className="ri-arrow-right-s-line" />
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
            <CustomBreadcrumb items={ breadcrumbItems } />
            <div className="invd tk-page">
                { formBody }
            </div>
        </CommonContentContainer>
    );
};

AddEmployerDetailsOfInvoice.propTypes = {
    asModal: PropTypes.bool,
    employerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func,
    /* modal reached from a picker: Back returns to that picker; absent (opened from the card) → Cancel only */
    onBack: PropTypes.func,
    onDone: PropTypes.func,
    /** opened from Standalone Invoice setup (INV-G2): its own subtitle */
    standalone: PropTypes.bool,
};

export default AddEmployerDetailsOfInvoice;