import React, { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import tickMark from '../../../../assets/img/svg/tick-mark.svg';
import PropTypes from "prop-types";
import CustomCheckbox from "../../../../components/custom-checkbox/CustomCheckbox";
import { Controller } from "react-hook-form";
import { fetchDistrictByCountryCode } from "../../../../redux/Slices/common/district/DistrictSlice";
import { sendOtp } from "../../../../redux/Slices/employer/EmployerSlice";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import dayjs from 'dayjs';
import { validateEmail } from "../../../../utils/utils";
import translation from "../../../../utils/translation";
import { handleMobileInput, handleOtpInputChange } from "../../../../services/commonService";

const EntityContactDetailsForm = ({ countries = [], setValue, clearErrors, getValues, setError, errors, control, workerDetailTabInfo, actionType, shouldDisabledCountry = false }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const [isWhatsappSameAsMobile, setIsWhatsappSameAsMobile] = useState(false);
    const [mobileOtp, setMobileOtp] = useState();
    const [isEmailYes, setIsEmailYes] = useState(false);
    const [showVerifyMobileBlock, setShowVerifyMobileBlock] = useState(false);
    const [mobileVerified, setMobileVerified] = useState(false);
    const [showVerifyEmailBlock, setShowVerifyEmailBlock] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [emailOtp, setEmailOtp] = useState();

    useEffect(() => {
        if (workerDetailTabInfo) {
            if (workerDetailTabInfo?.email_verified) {
                setIsEmailYes(true);
            }
            setEmailVerified(Boolean(workerDetailTabInfo?.email_verified));
            setMobileVerified(Boolean(workerDetailTabInfo?.mobile_verified));
        }
    }, [workerDetailTabInfo]);

    const handleSameAsMobileCheck = useCallback((checked) => {
        setIsWhatsappSameAsMobile(checked);
        if (checked) {
            setValue("whatsapp_number", getValues("mobile_number"));
            setValue("whatsapp_country_code", getValues("country_code"));
        } else {
            setValue("whatsapp_number", "");
            setValue("whatsapp_country_code", "");
        }
    }, [setValue, getValues]);

    const handleManualError = useCallback((error) => {
        setError(error, {
            type: "manual",
            message: (error === 'whatsapp_country_code' ? 'country_code' : error).replace("_", " ") + " is required",
        });
    }, [setError]);

    const getOtpFormData = useCallback((type, mobileCode, mobileNo, otp = null) => ({
        type,
        source: 'mobile_update',
        send_to: `${ mobileCode }${ mobileNo }`,
        verification_type: "mobile_verified",
        ...(otp && { otp }),
    }), []);

    const handleSendMobileOtp = useCallback(() => {
        if (!getValues('country_code')) {
            handleManualError('country_code');
            return false;
        } else if (!getValues('mobile_number')) {
            handleManualError('mobile_number');
            return false;
        }
        clearErrors(["country_code", "mobile_number"]);
        dispatch(sendOtp(
            getOtpFormData(1, getValues('country_code'), getValues("mobile_number"))
        )).then(res => {
            if (res?.payload?.message && res?.payload?.status) {
                ShowToast('success', res.payload.message);
                setShowVerifyMobileBlock(res.payload.status);
            } else if (!res?.payload?.status) {
                ShowToast('error', res.payload.message);
            }
        });
    }, [dispatch, getValues, clearErrors, handleManualError, getOtpFormData]);

    const handleVerifyMobileOtp = useCallback(() => {
        dispatch(sendOtp(
            getOtpFormData(2, getValues('country_code'), getValues("mobile_number"), mobileOtp)
        )).then(res => {
            if (res?.payload?.message && res?.payload?.status) {
                ShowToast('success', res.payload.message);
                setShowVerifyMobileBlock(false);
                setMobileVerified(true);
                setValue('mobile_verified', 1);
                setValue('mobile_verified_at', dayjs().format('YYYY-MM-DD HH:mm:ss'));
            } else if (!res?.payload?.status) {
                ShowToast('error', res.payload.message);
            }
        });
    }, [dispatch, getValues, setValue, mobileOtp, getOtpFormData]);

    const getOTPFormDataEmail = useCallback((type, email, otp = null) => ({
        type,
        send_to: `${ email }`,
        verification_type: "email_verified",
        source: 'edit_employer',
        ...(otp && { otp }),
    }), []);

    const handleSendEmailOtp = useCallback(() => {
        if (!getValues('email')) {
            handleManualError('email');
            return false;
        }
        clearErrors(["email"]);
        dispatch(sendOtp(
            getOTPFormDataEmail(1, getValues('email'))
        )).then(res => {
            if (res?.payload?.message && res?.payload?.status) {
                ShowToast('success', res.payload.message);
                setShowVerifyEmailBlock(res.payload.status);
            } else if (!res?.payload?.status) {
                ShowToast('error', res.payload.message);
            }
        });
    }, [dispatch, getValues, clearErrors, handleManualError, getOTPFormDataEmail]);

    const handleVerifyEmailOtp = useCallback(() => {
        dispatch(sendOtp(
            getOTPFormDataEmail(2, getValues('email'), emailOtp)
        )).then(res => {
            if (res?.payload?.message && res?.payload?.status) {
                ShowToast('success', res.payload.message);
                setShowVerifyEmailBlock(false);
                setEmailVerified(true);
                setValue('email_verified', 1);
                setValue('email_verified_at', dayjs().format('YYYY-MM-DD HH:mm:ss'));
            } else if (!res?.payload?.status) {
                ShowToast('error', res.payload.message);
            }
        });
    }, [dispatch, getValues, setValue, emailOtp, getOTPFormDataEmail]);

    const handleUpdateStateEmail = useCallback((e) => {
        const { name, value } = e.target;
        if (validateEmail(value)) {
            setEmailVerified(false);
        }
        setValue(name, value);
    }, [setValue]);

    const handleCountrySelection = useCallback((e) => {
        const selectedCountryId = e?.target?.value;
        const selectedCountry = countries.find((country) => String(country.code) === String(selectedCountryId));
        if (selectedCountry) {
            setValue('country_code', selectedCountry.code);
            dispatch(fetchDistrictByCountryCode(selectedCountry.country_code));
        }
        /* ClickUp 13 Oct: an edited number (or code) needs a fresh code — hide Enter Code, drop the typed code, show Send OTP again */
        setShowVerifyMobileBlock(false);
        setMobileOtp(undefined);
    }, [countries, setValue, dispatch]);

    const handleMobileOtpChange = useCallback((val) => {
        setMobileOtp(val);
    }, []);

    const handlEmailOtpChange = useCallback((val) => {
        setEmailOtp(val);
    }, []);

    const handleRadioChange = useCallback((event) => {
        setIsEmailYes(event.target.id === "yes");
    }, []);

    const handleUpdateState = useCallback((e) => {
        handleMobileInput(e); /* digits only, 13 max — the RHF maxLength rule alone never blocked typing */
        const { name, value } = e.target;
        if (value.length > 5) {
            setMobileVerified(false);
        }
        /* ClickUp 13 Oct: an edited number (or code) needs a fresh code — hide Enter Code, drop the typed code, show Send OTP again */
        setShowVerifyMobileBlock(false);
        setMobileOtp(undefined);
        setValue(name, value);
    }, [setValue]);

    const handleUpdateStateWhatsup = useCallback((e) => {
        handleMobileInput(e);
        const { name, value } = e.target;
        setValue(name, value);
    }, [setValue]);

    return <>
        <div className="form-row medium d-sm-flex">
            <div className="col-sm-3 col-12">
                <label className="form-label required">{ translation('key_mobile') }</label>
                <Controller
                    name="country_code"
                    control={ control }
                    rules={ { required: translation('key_country_code_is_required') } }
                    render={ ({ field }) => (
                        <select { ...field } className="form-control custom-select" id="country_code"
                            onChange={ handleCountrySelection } disabled={shouldDisabledCountry}>
                            <option value="">{ t('key_select_country_code') }</option>
                            { countries?.map((item, index) => (
                                <option key={ index } value={ item.code }>
                                    { item.name + " " + item.code }
                                </option>
                            )) }
                        </select>
                    ) }
                />
                { errors.country_code && (
                    <small className="text-danger">{ errors.country_code.message }</small>
                ) }
            </div>
            <div className="col-sm-9 col-6">
                <label className="form-label">&nbsp;</label>
                <Controller
                    name="mobile_number"
                    control={ control }
                    rules={ {
                        required: t('key_mobile_number_is_required'),
                        maxLength: { value: 14, message: t('key_maximum') + " 14 " + t('key_characters_allowed') },
                    } }
                    render={ ({ field }) => (
                        <input
                            { ...field }
                            type="number"
                            placeholder={ translation('key_mobile') }
                            id="mobile_number"
                            className="form-control without-label"
                            onChange={ handleUpdateState }
                        />
                    ) }
                />
                { errors.mobile_number && (
                    <small className="text-danger">{ errors.mobile_number.message }</small>
                ) }
            </div>
        </div>
        <div className="send-varify-otp">
            <div className="row medium d-sm-flex justify-content-end">
                { mobileVerified ?
                    <span className="tick-mark-text col-auto mb-2 fz14">
                        <img src={ tickMark } className="mr-1" width="16" height="16" alt={ t('key_verified') } />
                        { t('key_verified') }
                    </span>
                    : !showVerifyMobileBlock && <Link className="form-link col-sm-auto mb-2 fz12" onClick={ handleSendMobileOtp }>{ t('key_send_otp') }</Link> }
            </div>
            { showVerifyMobileBlock && (
                <div className="wrap-div mb-3">
                    <span className="grey2 fz15 fw-600 mt-1 d-inline-block">
                        { translation('key_code_sent_not_received') }
                        <Link className="blue ml-2" onClick={ handleSendMobileOtp }>{ t('key_resend_code') }</Link>
                    </span>
                    <div className="row">
                        <div className="col-6">
                            <label className="form-label required">{ t('key_enter_code') }</label>
                            <div className="d-flex align-items-center">
                                <input type="number" className="form-control"
                                    onChange={(e) => handleOtpInputChange(e, 6, handleMobileOtpChange)}
                                />
                                <Link className="ml5" onClick={ handleVerifyMobileOtp }>{ t('key_verify') }</Link>
                            </div>
                        </div>
                    </div>
                </div>
            ) }
        </div>
        { actionType !== "mobile" && <>
            <div className="form-row mb-1">
                <div className="col-sm-3 col-12">
                    <label className="form-label">{ translation('key_whatsapp') }</label>
                    <Controller
                        name="whatsapp_country_code"
                        control={ control }
                        rules={ { required: translation('key_country_code_is_required') } }
                        render={ ({ field }) => (
                            <select { ...field } className="form-control custom-select" id="whatsapp_country_code" 
                                disabled={shouldDisabledCountry}>
                                <option value="">{ t('key_select_country_code') }</option>
                                { countries?.map((item, index) => (
                                    <option key={ index } value={ item.code }>
                                        { item.name + " " + item.code }
                                    </option>
                                )) }
                            </select>
                        ) }
                    />
                    { errors.whatsapp_country_code && (
                        <small className="text-danger">{ errors.whatsapp_country_code.message }</small>
                    ) }
                </div>
                <div className="col-sm-9 col-6">
                    <label className="form-label">&nbsp;</label>
                    <Controller
                        name="whatsapp_number"
                        control={ control }
                        rules={ {
                            required: translation('key_whatsapp_number_is_required'),
                            maxLength: { value: 14, message: t('key_maximum') + " 14 " + t('key_characters_allowed') },
                        } }
                        render={ ({ field }) => (
                            <input
                                { ...field }
                                type="number"
                                placeholder={ translation('key_whatsapp_no') }
                                id="whatsapp_number"
                                className="form-control without-label"
                                onChange={ handleUpdateStateWhatsup }
                            />
                        ) }
                    />
                    { errors.whatsapp_number && (
                        <small className="text-danger">{ errors.whatsapp_number.message }</small>
                    ) }
                </div>
            </div>
            <div className="send-varify-otp">
                <div className="medium d-sm-flex justify-content-between mb-3">
                    <CustomCheckbox
                        checkId="isWhatsappSameAsMobile"
                        checked={ isWhatsappSameAsMobile }
                        onChange={ (event) => handleSameAsMobileCheck(event.target.checked) }
                        checkedLabel={ translation('key_whatsapp_number_same_as_mobile') }
                        labelClasses="grey-border"
                        inputClasses="checkbox-input"
                    />
                    {/* { whatsappVerified ?
                        <span className="tick-mark-text  mb-3">
                            <img src={ tickMark } className="mr8" alt={ t('key_verified') } />
                            { t('key_verified') }
                        </span>
                        : <Link className="form-link col-sm-auto mb-3 medium p-0" onClick={ handleSendWhatsappOtp }>{ t('key_send_otp') }</Link> } */}
                </div>
                {/* { showVerifyWhatsappBlock && (
                    <div className="wrap-div mb-3">
                        <span className="grey2 fz15 fw-600">
                            { translation('key_code_sent_not_received') }
                            <Link className="blue ml-2" onClick={ handleSendWhatsappOtp }>{ t('key_resend_code') }</Link>
                        </span>
                        <div className="row">
                            <div className="col-6">
                                <label className="form-label required">{ t('key_enter_code') }</label>
                                <div className="d-flex align-items-center">
                                    <input type="number" className="form-control" onChange={ handleWhatsappOtpChange } />
                                    <Link className="ml5" onClick={ handleVerifyWhatsappOtp }>{ t('key_verify') }</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ) } */}
            </div>
            <div className="row mb20">
                <div className="col-sm-8 col-12">
                    <label className="form-label required mb-3">
                        {translation('key_email_address')}
                    </label>
                    <div className="radioList form-inline">
                        <div className="form-check mr-3">
                            <input
                                className="form-check-input"
                                type="radio"
                                id="yes"
                                name="emailOption"
                                checked={ isEmailYes }
                                onChange={ handleRadioChange }
                            />
                            <label
                                className="form-check-label medium mt-0 text-black"
                                htmlFor="yes"
                            >
                                {translation('key_yes')}
                            </label>
                        </div>
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="radio"
                                id="no"
                                name="emailOption"
                                checked={ !isEmailYes }
                                onChange={ handleRadioChange }
                            />
                            <label
                                className="form-check-label medium mt-0 text-black"
                                htmlFor="no"
                            >
                                {translation('key_no')}
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </>

        }


        { actionType !== "mobile" && isEmailYes && (
            <>
                <div className="row medium d-sm-flex">
                    <div className="col-12">
                        <label className="form-label">{translation('key_email_address')}</label>
                        <Controller
                            name="email"
                            control={ control }
                            rules={ {
                                required: translation('key_this_field_is_required'),
                                pattern: {
                                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                    message: t('key_enter_valid_email'),
                                },
                            } }
                            render={ ({ field }) => (
                                <input
                                    { ...field }
                                    type="email"
                                    placeholder={ translation('key_email') }
                                    id="email"
                                    className="form-control"
                                    onChange={ handleUpdateStateEmail }
                                />
                            ) }
                        />
                        { errors.email && (
                            <small className="text-danger">
                                { errors.email.message }
                            </small>
                        ) }
                    </div>
                </div>
                <div className="send-varify-otp">
                    <div className="row medium d-sm-flex justify-content-end">

                        { emailVerified ?
                            <span className="tick-mark-text col-auto mb-2 fz14">
                                <img src={ tickMark } className="mr8" alt={ t('key_verified') } />
                                { t('key_verified') }
                            </span>
                            : !showVerifyEmailBlock && <Link className="form-link col-sm-auto mb-2 fz12 medium" onClick={ handleSendEmailOtp }>{ t('key_send_otp') }</Link>
                        }
                    </div>
                    { showVerifyEmailBlock && (
                        <div className="wrap-div mb-3">
                            <span className="grey2 fz15 fw-600 mt-1 d-inline-block">
                                { translation('key_code_sent_not_received') }
                                <Link className="blue ml-2" onClick={ handleSendEmailOtp }>{ t('key_resend_code') }</Link>
                            </span>
                            <div className="row">
                                <div className="col-6">
                                    <label className="form-label required">{ t('key_enter_code') }</label>
                                    <div className="d-flex align-items-center">
                                        <input type="number" className="form-control"
                                            onChange={(e) => handleOtpInputChange(e, 6, handlEmailOtpChange)}
                                            
                                        />
                                        <Link className="ml5" onClick={ handleVerifyEmailOtp }>{ t('key_verify') }</Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) }
                </div>
            </>
        ) }
    </>
}
EntityContactDetailsForm.propTypes = {
    getValues: PropTypes.any.isRequired,
    clearErrors: PropTypes.any.isRequired,
    setError: PropTypes.any.isRequired,
    setValue: PropTypes.any.isRequired,
    countries: PropTypes.array.isRequired,
    control: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired,
    workerDetailTabInfo: PropTypes.object,
    actionType: PropTypes.string,
    shouldDisabledCountry: PropTypes.bool,
};
export default React.memo(EntityContactDetailsForm);
