import * as yup from 'yup';
import translation from '../../../../utils/translation';

export const templateSchema = yup.object().shape({
    module_key: yup.string().required(translation('key_module_is_required')),
    category_id: yup.string().required(translation('key_category_is_required')),
    language_id: yup.string().required(translation('key_language_is_required')),
    template_name: yup.string().required(translation('key_template_name_is_required')),
    //dynamic_field_key: yup.string().required(translation('key_dynamic_field_is_required')),
    accessibility: yup.string().required(translation('key_accessibility_is_required')),
    template_content: yup.string().required(translation('key_template_content_is_required')),
});


export const sendTemplateSchema = yup.object().shape({
    module_key: yup.string().required(translation('key_module_is_required')),
    category_id: yup.string().required(translation('key_category_is_required')),
    language_id: yup.string().required(translation('key_language_is_required')),
    template_name: yup.string().required(translation('key_template_name_is_required')),
    template_content: yup.string().required(translation('key_template_content_is_required')),
    channel: yup.string().required(translation('key_channel_is_required')),
    send_to: yup.string().required(translation('key_receipt_is_required')),
});

export const sendTemplateChatSchema = yup.object().shape({
    module_key: yup.string().required(translation('key_module_is_required')),
    category_id: yup.string().required(translation('key_category_is_required')),
    language_id: yup.string().required(translation('key_language_is_required')),
    template_name: yup.string().required(translation('key_template_name_is_required')),
    template_content: yup.string().required(translation('key_template_content_is_required')),
    channel: yup.string().required(translation('key_channel_is_required')),
    //send_to: yup.string().required(translation('key_receipt_is_required')),
});



export const addEndorsmentTemplateSchema = yup.object().shape({
    module_key: yup.string().required(translation('key_module_is_required')),
    category_id: yup.string().required(translation('key_category_is_required')),
    language_id: yup.string().required(translation('key_language_is_required')),
    template_name: yup.string().required(translation('key_template_name_is_required')),
    template_content: yup.string().required(translation('key_template_content_is_required')),
});