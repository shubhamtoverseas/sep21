import React, { useEffect, useState } from "react";
import { sanitizeHtml } from "../../utils/sanitize";
import { useDispatch, useSelector } from "react-redux";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import PropTypes from "prop-types";
import 'react-quill/dist/quill.snow.css';
import './template-form.css';
import { Link } from 'react-router-dom';
import userPdf from "../../assets/img/pdf.png";
import whatsappGrey from '../../assets/img/svg/whatsapp-grey.svg';
import whatsappBlue from '../../assets/img/svg/whatsapp-blue.svg';
import sendIcon from "../../assets/img/svg/send-white.svg";
import copyIcon from '../../assets/img/svg/copy.svg';
import { fetchModuleList, fetchCategoryList, fetchLanguageList, sendTemplateMessage, fetchTemplateWhatsApp, sendChatMessage, sentWhatsAppTemplateMessage } from "../../redux/Slices/settings/templates/TemplateSlice";
import { sendTemplateSchema } from "../../Views/Pages/SettingsPage/templates/templateSchema";
import { sendTemplateFormState } from "../ReusableComponents/form-states";
import { ShowToast } from "../show-toast/ShowToast";
import translation from "../../utils/translation";


function TemplateFormWhatsApp(props) {
    const dispatch = useDispatch();
    const [channelId, setChannelId] = useState("");
    const [languageValue, setLanguageValue] = useState("");
    const [categoryKeyValue, setCategoryKeyValue] = useState([]);
    const [currentTemplateData, setCurrentTemplateData] = useState(null);
    const [mediaFile, setMediaFile] = useState("");
    const [templateText, setTemplateText] = useState("");
    const { moduleList, categoryList, languageList, status, templatesWhatsApp } = useSelector((state) => state.templates);
    const methods = useForm({
        resolver: yupResolver(props.isCategoryRequired ? sendTemplateSchema : sendTemplateSchema.omit(['category_id', 'module_key'])),
        defaultValues: sendTemplateFormState
    });
    const { handleSubmit, setValue, getValues, control, formState: { errors }, } = methods;
    const [isInitialFetch, setIsInitialFetch] = useState(true);
    useEffect(() => {
        if (isInitialFetch) {
            setIsInitialFetch(false);
            if (moduleList.length === 0) {
                dispatch(fetchModuleList());
            }
            if (languageList && (languageList?.error || languageList.length === 0)) {
                dispatch(fetchLanguageList());
            }
            if ((categoryList.length === 0 || props.userType) && props.isCategoryRequired) {
                dispatch(fetchCategoryList({ module: props.userType })).then((res) => {
                    if (!res.error && res?.payload?.data) {
                        const filteredCategoryList = res.payload.data.filter(category => category.slug === props.slug);
                        setCategoryKeyValue(filteredCategoryList);
                        setValue('category_id', filteredCategoryList[0]?.id);
                    }
                });
            }
            if (moduleList.length > 0) {
                setValue('module_key', props.userType);
            }

            setValue('send_to', props?.userType);

            if (props.action === "action_required") {
                setValue('channel', "chat");
                setChannelId("chat");
            }
            if (props.action === "whatsapp") {
                setValue('channel', "whatsapp");
                setChannelId("whatsapp");
            }
        }
    }, [dispatch, moduleList, languageList, categoryList, props.userType, props.slug, props.action, isInitialFetch, categoryKeyValue, setValue, props.isCategoryRequired]);

    const handleSetChannelId = (value) => {
        setChannelId(value);
        setValue('channel', value);
    }

    const handleGetCategory = (e) => {
        e.preventDefault();
        dispatch(fetchCategoryList({ module: e.target.value }));
        setValue('module_key', e.target.value);
    }

    const handleGetTemplateNameList = (e) => {
        e.preventDefault();
        const template = JSON.parse(e.target.value);
        const components = template.components;
        if (components && components.length > 0) {
            const mediaComponent = components.find(comp => comp.type === 'BODY');
            setValue('template_content', mediaComponent.text);
        }
        setValue('template_name', e.target.value);
        if (template.file_path) {
            const fileExtension = template.file_path.split('.').pop().toLowerCase();
            setMediaFile({ url: template?.file_path, filename: template?.file_path_name, action: "update", fileExtension: fileExtension, name: template?.file_path.replace(/^.*[\\/]/, '') });
        }
        template.module_key = getValues('module_key');
        template.category_id = getValues('category_id');
        template.language_id = getValues('language_id');
        props.onEditTemplate(JSON.stringify(template));
    }

    const handleSetLanguageValue = (value, code) => {
        setLanguageValue(value)
        setValue('language_id', value);
        dispatch(fetchTemplateWhatsApp({ name: props.whatsAppTemplatesRequired, language: code })).then((res) => {
            if (res && res.payload && Array.isArray(res.payload.data) && res.payload.data.length > 0) {
                const template = res.payload.data[0];
                const components = template.components;
                if (components && components.length > 0) {

                    const bodyComponent = components.find(comp => comp.type === "BODY");
                    const headerComponent = components.find(comp => comp.type === "HEADER");
                    let template_content_text = bodyComponent ? bodyComponent.text : "";
                    if (headerComponent && headerComponent.type === "HEADER" && headerComponent.format === "TEXT") {
                        template_content_text = headerComponent.text.replace("{{1}}", props.custom_content_params?.name || "") + "\n" + template_content_text;
                    }

                    //const mediaComponent = components.find(comp => comp.type === 'BODY');
                    setValue('template_content', template_content_text);
                    setValue('template_name', JSON.stringify(template));
                    setTemplateText(template_content_text);
                    setCurrentTemplateData({ template_content: template_content_text, id: template?.id, template_name: template?.name, file_path_name: "" });
                }
            }
        });
    }

    const handleCopyTemplateContent = () => {
        const content = methods.getValues('template_content');
        navigator.clipboard.writeText(content).then(() => {
            ShowToast('success', translation('key_template_content_copied_to_clipboard'));
        }).catch((error) => {
            ShowToast('error', translation('key_failed_to_copy_template_content'));
            console.error('Error copying template content:', error);
        });
    };

    const onSubmit = (formData) => {
        // Replace {{key}} in template_content with values from customWorkerInfo
        let replacedContent = currentTemplateData.template_content.replace(/{{(.*?)}}/g, (match, key) => {
            const trimmedKey = key.trim();
            return Object.prototype.hasOwnProperty.call(props.workerInfoMapping, trimmedKey) ? props.workerInfoMapping[trimmedKey] : match;
        });

        const payload =
        {
            "channel": formData.channel,
            "template_module_key": formData.module_key,
            "template_category_id": formData.category_id,
            "template_language_id": Number(formData.language_id),
            "template_content_id": currentTemplateData.id,
            "template_name": currentTemplateData.template_name,
            "send_to": Number(props.send_to),
            "send_to_user_id": props.userId,
            /* U-0442 / F-25: an immediate Send carries no schedule — the legacy today+7 pair was written by every
               composer and read by nothing, and made every send-log row claim a dispatch a week out */
            "template_content": replacedContent,
        };

        if (props.slug === "whatsapp") {
            let messagePayload = {
                "platform": "whatsapp",
                "friend_id": props.userId,
                "template_id": currentTemplateData.id,
                "friend_type": props.userType,
                "custom_content_params": JSON.stringify(props.custom_content_params)
            }
            dispatch(sentWhatsAppTemplateMessage(messagePayload)).then(res => {
                if (res?.payload?.success === false) {
                    ShowToast("error", res?.payload?.message);
                } else {
                    ShowToast("success", res?.payload?.message);
                    props.onClick(false, messagePayload);
                }
            });
        } else {
            dispatch(sendTemplateMessage(payload));
            let messagePayload = {
                "platform": (formData.channel == "chat") ? "app" : "whatsapp",
                "friend_id": props.userId,
                "entity_id": currentTemplateData.id,
                "entity_type": (props.status_key == "action_required") ? "template_action_required" : "template",
                "friend_type": props.userType,
                "template_file_path": currentTemplateData?.file_path_name,
                "template_content": replacedContent,
            }
            dispatch(sendChatMessage(messagePayload)).then(res => {
                if (res?.payload?.success === false) {
                    ShowToast("error", res?.payload?.message);
                } else {
                    ShowToast("success", res?.payload?.message);
                    props.onClick(false, messagePayload);
                }
            });
        }
    };

    const handleClosePopup = (value) => {
        props.onClick(value);
    }

    return <form onSubmit={ handleSubmit(onSubmit) } >
        <div className="modal-body px-4">
            <div className='row'>
                <div className='col-6'>
                    <label className='form-label grey'>{ translation('key_send_to') }</label>
                    <div className="mode-radio-buttons d-flex">

                        <div className="custom-radio compact">
                            <input type="radio" name="sendTo" value="employer" id="employer" checked={ props.userType == "employer" } disabled={ props.userType == "worker" || props.action === "action_required" } readOnly />
                            <label htmlFor="employer" className="radio-label black">{ translation('key_employer') }</label>
                        </div>
                        <div className="custom-radio compact">
                            <input type="radio" name="sendTo" value="worker" id="worker" checked={ props.userType == "worker" } disabled={ props.userType == "employer" } readOnly />
                            <label htmlFor="worker" className="radio-label black">{ translation('key_worker') }</label>
                        </div>
                        {/* <div className="custom-radio compact">
                        <input type="radio" name="sendTo" value="processing" id="processing" checked={ props.userType == "processing" } disabled={ props.userType == "employer" } />
                        <label htmlFor="processing" className="radio-label black">{ translation('key_processing') }</label>
                    </div> */}

                    </div>
                </div>
                <div className="col-6">
                    <label className="form-label grey"> { translation('key_channel') }</label>
                    <div className='d-flex'>

                        {/* { (props?.actionLocation !== "partner" && props?.actionLocation !== "assign-pt") && <figure className={ ` channel-box mr-3 ${ channelId === "chat" ? 'blue' : '' }` } onClick={ () => handleSetChannelId("chat") }>
                            <img className='' src={ channelId === "chat" ? phoneBlue : phoneGrey } />
                        </figure> } */}

                        { (props.action != "action_required") && <figure className={ ` channel-box mr-3 ${ channelId === "whatsapp" ? 'blue' : '' }` } onClick={ () => handleSetChannelId("whatsapp") }><img className='' src={ channelId === "whatsapp" ? whatsappBlue : whatsappGrey } /></figure> }
                    </div>
                    { !getValues('channel') && (
                        <div className="w-100"><small className="text-danger">
                            { errors?.channel?.message }
                        </small></div>
                    ) }
                </div>
                <div className="col-6">
                    <div className='d-flex'>
                        <label className="form-label">{ props.userType?.toUpperCase() } : { props?.fullname }</label>
                    </div>
                </div>
            </div>

            { props.isCategoryRequired && <div className="row mb-3">
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
            </div> }
            { props.isCategoryRequired && <div className="row mb-3">
                <div className="col-12">
                    <label className="form-label grey">{ translation('key_category') }</label>
                    <Controller
                        control={ control }
                        name="category_id"
                        render={ ({ field }) => (
                            <select { ...field } className="form-control ht44" id="category_id" onChange={ (e) => handleGetTemplateNameList(e) } disabled>
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
            </div> }

            <div className="row">
                <div className="col-auto mb24">
                    <label className="form-label">{ translation('key_message_language') }</label>
                    <div className="mode-radio-buttons d-flex">
                        { languageList && !languageList?.error && languageList.map((language) => (
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
                                                onChange={ () => handleSetLanguageValue(language.id, language.code) }
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
                    <label className="form-label grey">{ translation('key_template_name') }</label>
                    <Controller
                        control={ control }
                        name="template_name"
                        render={ ({ field }) => (
                            <select { ...field } className="form-control ht44" id="template_name" onChange={ (e) => handleGetTemplateNameList(e) } >
                                { !templatesWhatsApp?.error && languageValue && templatesWhatsApp?.map((item) => (
                                    <option key={ item.id } value={ JSON.stringify(item) } >{ item.name.replaceAll("_", " ") }</option>
                                )) }
                            </select>
                        ) }
                    />
                    { errors.template_name && (
                        <small className="text-danger">
                            { errors.template_name.message }
                        </small>
                    ) }
                </div>
            </div>
            <div className="row">
                <div className="col-12">
                    <div className='d-flex justify-content-between align-items-center mb-2'>
                        <label className="form-label grey mb-2">{ translation('key_message_body') }</label>
                        <Link onClick={ handleCopyTemplateContent }>
                            <img src={ copyIcon } className='mr-2' />
                        </Link>
                    </div>
                    <div className="mb48">
                        <div className="message-box" dangerouslySetInnerHTML={sanitizeHtml(templateText)} />
                        {/* <ReactQuill
                            theme="snow"
                            value={ currentTemplateData?.template_content }
                            modules={ configModules }
                            style={ { height: '200px' } }
                            readOnly={ true }
                        /> */}
                    </div>
                    <p className="fz12 font-italic fw-400 font-roboto"> <span className="grey97">{ translation('key_created_by') } :</span>{ currentTemplateData?.created_by_name } |  <span className="grey97"> { translation('key_modified_by') }:</span> { currentTemplateData?.updated_by_name }</p>
                </div>
                <div className="col-auto">
                    {
                        (mediaFile && mediaFile?.fileExtension == "jpg" || mediaFile?.fileExtension == "jpeg" || mediaFile?.fileExtension == "png") ? (
                            <div className="mb24">
                                <img src={ mediaFile.url } alt="media" style={ { width: '100px', height: '100px' } } />
                            </div>
                        ) : mediaFile && mediaFile?.fileExtension != "image" ? (
                            <div className="mb24">
                                <img src={ userPdf } alt="media" /> { mediaFile.name }
                            </div>
                        ) : ""
                    }
                </div>
            </div>
        </div>
        <div className="modal-footer d-flex justify-content-end send-template-bottom-bar px-4">
            <button type="button" className="btn btn-outline mb-0 mr12" onClick={ () => handleClosePopup(false) } data-dismiss="modal">{ translation('key_cancel') }</button>
            {/* <button type="button" className="btn btn-outline mb-0 mr12" onClick={() => handleShowSchedulePopup(true)}>
                <i className="ri-time-line mr10 fz16"></i>
                Schedule for lator
            </button> */}
            <button disabled={ status === 'loading' } type="submit" className="btn filled-btn d-flex align-items-center mb-0">
                <img src={ sendIcon } className="mr10" />
                { status === 'loading' ? translation('key_processing') + "..." : translation('key_send') }</button>
        </div>
    </form>
}
TemplateFormWhatsApp.propTypes = {
    onClose: PropTypes.func,
    userId: PropTypes.any,
    userType: PropTypes.string,
    slug: PropTypes.string,
    send_to: PropTypes.string,
    employee_worker_id: PropTypes.any,
    status_key: PropTypes.string,
    onClick: PropTypes.any,
    onShowSchedulePopup: PropTypes.any,
    onEditTemplate: PropTypes.any,
    action: PropTypes.string,
    actionStatusType: PropTypes.string,
    fullname: PropTypes.string,
    handleRefreshProfile: PropTypes.func,
    onRefreshProfile: PropTypes.func,
    customWorkerInfo: PropTypes.object,
    workerInfoMapping: PropTypes.object,
    isCategoryRequired: PropTypes.bool,
    whatsAppTemplatesRequired: PropTypes.string,
    custom_content_params: PropTypes.any,
};
export default TemplateFormWhatsApp;