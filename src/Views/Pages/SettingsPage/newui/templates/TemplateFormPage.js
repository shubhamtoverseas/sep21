import React, { lazy, Suspense, useMemo } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { Controller } from "react-hook-form";
import "react-quill/dist/quill.snow.css";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import { Field, FormGrid, RadioGroup, SelectBox, TextInput } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "./Template.module.css";
import useTemplateForm from "./useTemplateForm";
import TemplateCategoryPanel from "./TemplateCategoryPanel";
import TemplateVersionHistory from "./TemplateVersionHistory";
import { fieldOptionLabel } from "./templateConfiguration";
import { SEND_TEMPLATE_MANAGER_TITLE, TEMPLATE_EDITOR_HEIGHT, TEMPLATE_IMAGE_EXTENSIONS } from "../settingsNewUiConstants";

const ReactQuill = lazy(() => import("react-quill"));

const MediaPreview = ({ mediaFile }) => {
    if (!mediaFile) return null;
    const isImage = TEMPLATE_IMAGE_EXTENSIONS.includes(mediaFile.fileExtension);
    return (
        <div className={styles.media}>
            {isImage
                ? <img src={mediaFile.url} alt={translation("key_media")} className={styles.mediaImage} />
                : <span className={styles.mediaIcon}><Icon name="filetext" size={18} /></span>}
            <span className={styles.mediaName}>{mediaFile.name}</span>
        </div>
    );
};

MediaPreview.propTypes = {
    mediaFile: PropTypes.shape({ fileExtension: PropTypes.string, url: PropTypes.string, name: PropTypes.string }),
};

const TemplateFormPage = () => {
    const template = useTemplateForm();
    const { control, handleSubmit, formState: { errors } } = template.form;
    const title = headingCase(translation(template.isEdit ? "key_edit_template" : "key_new_template"));

    const languageOptions = useMemo(
        () => template.languageList.map((language) => ({ value: language.id, label: language.name_en })),
        [template.languageList]
    );
    /* the dynamic-field list is the recipient's own (TM01): nothing to insert until the recipient is known */
    const fieldPlaceholder = template.dynamicFieldGroups.length
        ? translation("key_please_select")
        : translation(template.recipients.length && !template.recipient ? "key_st_choose_recipient_first" : "key_st_no_fields");

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.templates)}>{translation(SEND_TEMPLATE_MANAGER_TITLE)}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{title}</span>
            </nav>

            <form className={shared.card} onSubmit={handleSubmit(template.onSubmit)} noValidate>
                <div className={shared.cardHead}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{title}</h1>
                </div>

                {template.isLoading ? (
                    <div className={shared.loadingState}>{translation("key_loading")}…</div>
                ) : (
                    <>
                        <FormGrid columns={3}>
                            <Field label={translation("key_module")} htmlFor="tpl-module" required error={errors.module_key?.message}>
                                <Controller name="module_key" control={control} render={({ field }) => (
                                    <SelectBox {...field} id="tpl-module" disabled={template.isEdit} invalid={Boolean(errors.module_key)} onChange={(event) => template.onModuleChange(event.target.value)}>
                                        <option value="">{translation("key_please_select")}</option>
                                        {template.moduleList.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                    </SelectBox>
                                )} />
                            </Field>

                            <Field label={translation("key_category")} htmlFor="tpl-category" required error={errors.category_id?.message}>
                                <Controller name="category_id" control={control} render={({ field }) => (
                                    <SelectBox {...field} id="tpl-category" disabled={template.isEdit} invalid={Boolean(errors.category_id)}>
                                        <option value="">{translation("key_please_select")}</option>
                                        {template.categoryList.map((item) => <option key={item.id} value={item.id}>{item.name_en}</option>)}
                                    </SelectBox>
                                )} />
                            </Field>

                            <Field label={translation("key_template_name")} htmlFor="tpl-name" required error={errors.template_name?.message}>
                                <Controller name="template_name" control={control} render={({ field }) => (
                                    <TextInput {...field} id="tpl-name" type="text" placeholder={translation("key_enter_template_name").replace(/\s+/g, " ")} invalid={Boolean(errors.template_name)} />
                                )} />
                            </Field>

                            {template.configError && (
                                <div className={styles.configError} role="alert">{template.configError}</div>
                            )}
                            <TemplateCategoryPanel configuration={template.configuration} />

                            {template.recipients.length > 0 && (
                                <Field label={translation("key_st_recipient")} htmlFor="tpl-recipient" required error={errors.recipient_variant?.message} hint={translation("key_st_recipient_hint")}>
                                    <Controller name="recipient_variant" control={control} render={({ field }) => (
                                        <SelectBox {...field} id="tpl-recipient" invalid={Boolean(errors.recipient_variant)} disabled={template.recipients.length === 1} onChange={(event) => template.onRecipientChange(event.target.value)}>
                                            {template.recipients.length > 1 && <option value="">{translation("key_please_select")}</option>}
                                            {template.recipients.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                        </SelectBox>
                                    )} />
                                </Field>
                            )}

                            <Field label={translation("key_message_language")} required error={errors.language_id?.message} full>
                                <RadioGroup
                                    name="language_id"
                                    value={template.languageId}
                                    options={languageOptions}
                                    onChange={template.onLanguageChange}
                                    ariaLabel={translation("key_message_language")}
                                />
                            </Field>

                            <Field label={translation("key_message_body")} htmlFor="tpl-dynamic" hint={translation("key_dynamic_fields")}>
                                <Controller name="dynamic_field_key" control={control} render={({ field }) => (
                                    <SelectBox {...field} id="tpl-dynamic" disabled={!template.dynamicFieldGroups.length} onChange={(event) => template.insertDynamicField(event.target.value)}>
                                        <option value="">{fieldPlaceholder}</option>
                                        {template.dynamicFieldGroups.map((group) => (
                                            <optgroup key={group.family} label={group.label}>
                                                {group.fields.map((item) => <option key={item.id} value={item.token}>{fieldOptionLabel(item)}</option>)}
                                            </optgroup>
                                        ))}
                                    </SelectBox>
                                )} />
                            </Field>

                            <Field error={errors.template_content?.message || template.saveRefusal} full className={styles.editorField}>
                                <Suspense fallback={<div className={styles.editorFallback} style={{ height: TEMPLATE_EDITOR_HEIGHT }} />}>
                                    <div className={styles.editor}>
                                        <ReactQuill
                                            ref={template.quillRef}
                                            value={template.content}
                                            modules={template.quillModules}
                                            onChange={template.onContentChange}
                                        />
                                    </div>
                                </Suspense>
                            </Field>

                            <MediaPreview mediaFile={template.mediaFile} />
                            {template.isEdit && <TemplateVersionHistory templateId={template.templateId} />}
                        </FormGrid>

                        <div className={shared.formFoot}>
                            <Btn variant="secondary" type="button" onClick={template.onCancel} disabled={template.isSaving}>
                                {translation("key_cancel")}
                            </Btn>
                            <span className={shared.formFootSpacer} />
                            <Btn variant="primary" type="submit" disabled={template.isSaving}>
                                {template.isSaving ? translation("key_processing") : translation("key_save")}
                            </Btn>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
};

export default TemplateFormPage;
