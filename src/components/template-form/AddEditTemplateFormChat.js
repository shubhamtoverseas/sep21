import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import PropTypes from "prop-types";
import 'react-quill/dist/quill.snow.css';
import sendIcon from "../../assets/img/svg/send-white.svg";
import userPdf from "../../assets/img/pdf.png";
import './template-form.css';
import ReactQuill from 'react-quill';
import { fetchModuleList, fetchCategoryList, fetchLanguageList, fetchTemplateNameByFilter, addTemplate, updateTemplate } from "../../redux/Slices/settings/templates/TemplateSlice";
import { templateSchema } from "../../Views/Pages/SettingsPage/templates/templateSchema";
import { addTemplateFormState } from "../ReusableComponents/form-states";
import { ShowToast } from "../show-toast/ShowToast";
import { uploadFile } from "../../services/commonService";
import translation from "../../utils/translation";
import { fieldOptionLabel, fieldToken, isInternal, recipientFieldGroups, recipientOptions, saveRefusalText, useTemplateConfiguration } from "../../Views/Pages/SettingsPage/newui/templates/templateConfiguration";

/* TM01 (10 Nov 2026 package): the recipient the template is written for, as in Settings → Send Template Manager */
const FORM_DEFAULTS = { ...addTemplateFormState, recipient_variant: "" };

function AddEditTemplateFormChat(props) {
    const dispatch = useDispatch();
    const [content, setContent] = useState('');
    const [mediaFile, setMediaFile] = useState("");
    const [languageValue, setLanguageValue] = useState("");
    const [categoryKeyValue, setCategoryKeyValue] = useState([]);
    const [saveRefusal, setSaveRefusal] = useState("");
    const id = (props.currentTemplateData) ? props.currentTemplateData?.id : null;
    const { moduleList, categoryList, languageList, status, templateNameList, currentTemplate } = useSelector((state) => state.templates);
    const methods = useForm({
        resolver: yupResolver(templateSchema),
        defaultValues: FORM_DEFAULTS
    });
    const { handleSubmit, setValue, getValues, register, control, watch, setError, formState: { errors }, } = methods;
    const categoryId = watch('category_id');
    const recipient = watch('recipient_variant');
    const { configuration } = useTemplateConfiguration(categoryId);
    const internal = isInternal(configuration);
    const recipients = useMemo(() => (internal ? [] : recipientOptions(configuration)), [configuration, internal]);
    const fieldGroups = useMemo(() => recipientFieldGroups(configuration, recipient), [configuration, recipient]);

    /* the recipient follows the category: one offered → selected; internal preset → none; a stale choice → cleared */
    useEffect(() => {
        if (!configuration) return;
        if (internal) setValue('recipient_variant', '');
        else if (recipients.length === 1) setValue('recipient_variant', recipients[0].value);
        else if (getValues('recipient_variant') && !recipients.some((r) => r.value === getValues('recipient_variant'))) setValue('recipient_variant', '');
    }, [configuration, internal, recipients, setValue, getValues]);

    useEffect(() => {
        if (moduleList.length === 0) {
            dispatch(fetchModuleList());
        }
        if (languageList.length === 0) {
            dispatch(fetchLanguageList());
        }
        if (categoryList.length === 0) {
            dispatch(fetchCategoryList({ module: props.userType }));
            setValue('module_key', props.userType);
        }
        if (moduleList.length > 0) {
            setValue('module_key', props.userType);
        }
        if (categoryList.length > 0) {
            // const filteredCategoryList = categoryList.filter(category => category.slug === props.slug);
            setCategoryKeyValue(categoryList);
            //setValue('category_id', filteredCategoryList[0]?.id);
        }
    }, [dispatch, moduleList, languageList, categoryList, templateNameList, props.userType, setValue, props.slug]);

    useEffect(() => {
        if (!props.currentTemplateData) setValue('accessibility', 'public');
    }, [props.currentTemplateData, setValue]);

    useEffect(() => {
        if (id) {
            Object.keys(FORM_DEFAULTS).forEach((key) => {
                console.log(key, currentTemplate?.[key])
                setValue(key, props.currentTemplateData?.[key] || '');
                if (key === 'template_content') {
                    setContent(props.currentTemplateData?.[key] || '');
                }
            });
            if (props.currentTemplateData?.file_path) {
                const fileExtension = props.currentTemplateData.file_path.split('.').pop().toLowerCase();
                setMediaFile({ url: props.currentTemplateData?.file_path, filename: props.currentTemplateData?.file_path_name, action: "update", fileExtension: fileExtension, name: props.currentTemplateData?.file_path.replace(/^.*[\\/]/, '') });
            }
            setLanguageValue(props.currentTemplateData?.language_id);
            if (props.currentTemplateData?.module_key)
                dispatch(fetchCategoryList({ module: props.currentTemplateData?.module_key }));
        }
    }, [dispatch, id, props.currentTemplateData, setValue, currentTemplate]);


    const handleGetCategory = (e) => {
        e.preventDefault();
        setValue('module_key', e.target.value);
    }

    const handleSetLanguageValue = (value) => {
        setLanguageValue(value)
        setValue('language_id', value);
        dispatch(fetchTemplateNameByFilter({ category_id: getValues('category_id'), module_key: getValues('module_key'), language_id: value }));
    }

    /* a rejected save (e.g. 422: recipient required, a field the recipient may not receive) keeps the form open with its
       reason; it used to be treated as a success because the rejected payload carries no `status` */
    const handleSaveResult = (res) => {
        if (res?.error) {
            const body = res?.payload?.data?.data || {};
            setSaveRefusal(saveRefusalText(body));
            ShowToast("error", body.message || body.error || translation('key_something_went_wrong'));
            return;
        }
        ShowToast("success", res?.payload?.message);
        props.onCloseAddEditTemplateOpenSendTemplatePopup();
    };

    const onSubmit = (formData) => {
        delete formData.dynamic_field_key;
        if (recipients.length > 1 && !formData.recipient_variant) {
            setError('recipient_variant', { type: 'required', message: translation('key_st_recipient_required') });
            return;
        }
        if (!formData.recipient_variant || internal) delete formData.recipient_variant;
        if (mediaFile && mediaFile.filename) {
            formData.file_path = mediaFile.filename;
        }
        setSaveRefusal("");
        if (id) {
            formData.id = id;
            dispatch(updateTemplate(formData)).then(handleSaveResult);
        } else {
            dispatch(addTemplate(formData)).then(handleSaveResult);
        }
    };

    const handleClosePopup = (value) => {
        props.onClick(value);
    }

    // Custom handler for file uploads
    const handleImageUpload = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/jpeg,image/jpg,image/png,application/pdf,application/doc,application/docx,image/x-eps,image/tiff,.doc,.docx,.pdf,.eps,.tiff');
        input.click();
        input.onchange = async () => {
            const file = input.files[0];
            if (file) {
                const fileExtension = file.name.split('.').pop().toLowerCase();
                const filesToUpload = [{ file: file, name: "template/master" }];
                const uploadedFileResponse = await uploadFile(filesToUpload);
                setMediaFile({ ...uploadedFileResponse, action: "add", fileExtension: fileExtension, name: file.name });
            }
        };
    };
    const configModuless = useMemo(() => ({
        toolbar: {
            container: [
                [{ header: [1, 2, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' },
                { indent: '+1' },],
                ['image', 'code-block'],
                ['clean'],
            ],
            handlers: {
                image: handleImageUpload
            }
        }
    }), [])


    const handleDynamicKeyChange = (event) => {
        const value = event.target.value; // The selected field's target token
        if (value) setContent(prevContent => prevContent + "<span  style='color: #1591ea; '>  " + fieldToken({ token: value }) + "</span> ");
        setValue('dynamic_field_key', value);
    }

    const handleSetContent = (value) => {
        setContent(value);
        setValue('template_content', value);
        setSaveRefusal("");
    }


    return <form onSubmit={ handleSubmit(onSubmit) }>
        <div className="modal-body px-4">
            <div className="row mb-3">
                <div className="col-12">
                    <label className="form-label grey">{ translation('key_module') }</label>
                    <Controller
                        control={ control }
                        name="module_key"
                        render={ ({ field }) => (
                            <select { ...field } className="form-control ht44" id="module_key" onChange={ (e) => handleGetCategory(e) } disabled>
                                <option value="">{ translation('key_please_select') }</option>
                                { moduleList?.map((item) => (
                                    <option key={ item.id } value={ item.id }>{ item.name }</option>
                                )) }
                            </select>
                        ) }
                    />
                    { errors.module_key && (
                        <small className="text-danger">
                            { errors.module_key.message }
                        </small>
                    ) }
                </div>
            </div>
            <div className="row mb-3">
                <div className="col-12">
                    <label className="form-label grey"> { translation('key_category') }</label>
                    <Controller
                        control={ control }
                        name="category_id"
                        render={ ({ field }) => (
                            <select { ...field } className="form-control ht44" id="category_id">
                                { categoryKeyValue?.map((item) => (
                                    <option key={ item.id } value={ item.id } >{ item.name_en }</option>
                                )) }
                            </select>
                        ) }
                    />
                    { errors.category_id && (
                        <small className="text-danger">
                            { errors.category_id.message }
                        </small>
                    ) }
                </div>
            </div>
            { recipients.length > 0 && (
                <div className="row mb-3">
                    <div className="col-12">
                        <label className="form-label grey" htmlFor="recipient_variant">{ translation('key_st_recipient') }</label>
                        <Controller
                            control={ control }
                            name="recipient_variant"
                            render={ ({ field }) => (
                                <select { ...field } className="form-control ht44" id="recipient_variant" disabled={ recipients.length === 1 }>
                                    { recipients.length > 1 && <option value="">{ translation('key_please_select') }</option> }
                                    { recipients.map((item) => (
                                        <option key={ item.value } value={ item.value }>{ item.label }</option>
                                    )) }
                                </select>
                            ) }
                        />
                        { errors.recipient_variant && (
                            <small className="text-danger">
                                { errors.recipient_variant.message }
                            </small>
                        ) }
                    </div>
                </div>
            ) }
            <div className="row">
                <div className="col-auto mb24">
                    <label className="form-label"> { translation('key_message_language') }</label>
                    <div className="mode-radio-buttons d-flex">
                        { languageList && languageList.map((language) => (
                            <div className="custom-radio compact" key={ language.id }>
                                <Controller
                                    control={ control }
                                    name="language_id"
                                    render={ ({ field }) => (
                                        <>
                                            <input
                                                { ...field }
                                                type="radio"
                                                value={ language.id }
                                                id={ language.id }
                                                checked={ languageValue == language.id }
                                                onChange={ () => handleSetLanguageValue(language.id) }
                                            />
                                            <label
                                                htmlFor={ language.id }
                                                className="radio-label black"
                                            >
                                                { language.name_en }
                                            </label>
                                        </>
                                    ) }
                                />
                            </div>
                        )) }
                    </div>
                    { errors.language_id && (
                        <small className="text-danger">
                            { errors.language_id.message }
                        </small>
                    ) }
                </div>
            </div>
            <div className="row mb-3">
                <div className="col-12">
                    <label className="form-label grey">  { translation('key_enter_template_name') }</label>
                    <Controller
                        name="template_name"
                        control={ control }
                        render={ ({ field, fieldState: { error } }) => (
                            <>
                                <input
                                    className={ `form-control ${ error?.message ? 'is-invalid' : '' }` }
                                    type="text"
                                    { ...field }
                                    { ...register('template_name') }
                                    placeholder={ translation('key_enter_template_name') }
                                />
                                { error && (
                                    <small className="text-danger">{ error.message }</small>
                                ) }
                            </>
                        ) }
                    />
                </div>
            </div>
            <div className="form-row">
                <div className="col-lg-5 col-md-6 mb24">
                    <label className="form-label"> { translation('key_message_body') }</label>
                    <Controller
                        control={ control }
                        name="dynamic_field_key"
                        render={ ({ field }) => (
                            <select { ...field } className="form-control ht44" id="dynamic_field_key" onChange={ handleDynamicKeyChange } disabled={ !fieldGroups.length }>
                                <option value="">{ translation(fieldGroups.length ? 'key_please_select' : (recipients.length && !recipient ? 'key_st_choose_recipient_first' : 'key_st_no_fields')) }</option>
                                { fieldGroups.map((group) => (
                                    <optgroup key={ group.family } label={ group.label }>
                                        { group.fields.map((item) => (
                                            <option key={ item.id } value={ item.token }>{ fieldOptionLabel(item) }</option>
                                        )) }
                                    </optgroup>
                                )) }
                            </select>
                        ) }
                    />
                    { errors.dynamic_field_key && (
                        <small className="text-danger">
                            { errors.dynamic_field_key.message }
                        </small>
                    ) }
                </div>
            </div>
            <div className="row">
                <div className="col-12">
                    {/* <div className='d-flex justify-content-between align-items-center mb-2'>
                <label className="form-label grey mb-2">{ translation('key_message_body') }</label>
                <Link onClick={handleCopyTemplateContent}>
                    <img src={copyIcon} className='mr-2' />
                </Link>
            </div> */}
                    <div className="mb48">
                        <Controller
                            name="template_content"
                            control={ control }
                            rules={ { required: 'Content is required' } }
                            render={ ({ field }) => (
                                <ReactQuill
                                    { ...field }
                                    value={ content }
                                    style={ { height: '200px' } }
                                    modules={ configModuless }
                                    onChange={ handleSetContent }
                                />
                            ) }
                        />
                        { errors.template_content && (
                            <small className="text-danger">
                                { errors.template_content.message }
                            </small>
                        ) }
                        { saveRefusal && (
                            <small className="text-danger d-block" role="alert">{ saveRefusal }</small>
                        ) }
                    </div>
                    {/* <p className="fz12 font-italic fw-400 font-roboto"> <span className="grey97">Created by:</span>{currentTemplateData?.created_by_name} |  <span className="grey97">Modified By:</span> {currentTemplateData?.updated_by_name}</p> */ }
                </div>
            </div>
            <div className="col-auto mb24">
                {
                    (mediaFile && mediaFile?.fileExtension == "jpg" || mediaFile?.fileExtension == "jpeg" || mediaFile?.fileExtension == "png") ? (
                        <div>
                            <img src={ mediaFile.url } alt="media" style={ { width: '100px', height: '100px' } } />
                        </div>

                    ) : mediaFile && mediaFile?.fileExtension != "image" ? (
                        <div>
                            <img src={ userPdf } alt="media" /> { mediaFile.name }
                        </div>
                    ) : ""
                }
            </div>
        </div>
        <div className="modal-footer d-flex justify-content-end send-template-bottom-bar px-4">
            <button type="button" className="btn btn-outline mb-0 mr12" onClick={ () => handleClosePopup(false) } data-dismiss="modal">{ translation('key_cancel') }</button>
            <button disabled={ status === 'loading' } type="submit" className="btn filled-btn d-flex align-items-center mb-0">
                <img src={ sendIcon } className="mr10" />
                { status === 'loading' ? translation('key_processing') + "..." : translation('key_save') }</button>
        </div>
    </form>
}
AddEditTemplateFormChat.propTypes = {
    onClose: PropTypes.func,
    userId: PropTypes.any,
    userType: PropTypes.string,
    slug: PropTypes.string,
    send_to: PropTypes.string,
    employee_worker_id: PropTypes.any,
    status_key: PropTypes.string,
    onClick: PropTypes.any,
    onShowSchedulePopup: PropTypes.any,
    onCloseAddEditTemplateOpenSendTemplatePopup: PropTypes.any,
    currentTemplateData: PropTypes.any,
};
export default AddEditTemplateFormChat;