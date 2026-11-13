import React from "react";
import { Link } from "react-router-dom";
import Select from "react-select";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import { Field, FormGrid, SelectBox, TextArea, TextInput } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import formStyles from "../users/UserForm.module.css";
import styles from "./PromptManager.module.css";
import usePromptTemplateForm from "./usePromptTemplateForm";
import { PROMPT_DYNAMIC_FIELDS, PROMPT_EDITOR_ROWS, PROMOTION_SELECT_MAX_MENU_HEIGHT } from "../settingsNewUiConstants";

/** Ports NewPromptTemplate.js — name, languages, dynamic field insert, prompt editor, counters. */
const PromptTemplateFormPage = () => {
    const form = usePromptTemplateForm();
    const title = headingCase(translation("key_new_prompt_template"));

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.promptManager)}>{headingCase(translation("key_prompt_manager"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{title}</span>
            </nav>

            <form className={shared.card} onSubmit={form.onSubmit} noValidate>
                <div className={`${shared.cardHead} ${shared.cardHeadRow}`}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{title}</h1>
                    <div className={shared.cardHeadActions}>
                        <Btn variant="secondary" type="button" onClick={form.onCancel} disabled={form.isSubmitting}>{translation("key_cancel")}</Btn>
                        <Btn variant="primary" type="submit" disabled={form.isSubmitting}>
                            {form.isSubmitting ? translation("key_saving") : translation("key_save")}
                        </Btn>
                    </div>
                </div>

                <FormGrid columns={3}>
                    <Field label={translation("key_prompt_template_name")} htmlFor="prompt-name" required error={form.errors.name}>
                        <TextInput
                            id="prompt-name"
                            type="text"
                            placeholder={`${translation("key_enter")} ${translation("key_prompt_template_name")}`}
                            value={form.name}
                            onChange={(event) => form.setName(event.target.value)}
                            invalid={Boolean(form.errors.name)}
                        />
                    </Field>

                    <Field label={translation("key_language")} htmlFor="prompt-language" required error={form.errors.language}>
                        <Select
                            inputId="prompt-language"
                            className={`${formStyles.reactSelect} ${form.errors.language ? formStyles.reactSelectInvalid : ""}`}
                            classNamePrefix="nuform"
                            options={form.languageOptions}
                            value={form.languageOptions.filter((option) => form.languages.includes(option.value))}
                            onChange={(selected) => form.setLanguages(selected ? selected.map((option) => option.value) : [])}
                            closeMenuOnSelect={false}
                            maxMenuHeight={PROMOTION_SELECT_MAX_MENU_HEIGHT}
                            placeholder={translation("key_please_select")}
                            noOptionsMessage={() => translation("key_no_options")}
                            name="languages"
                            isMulti
                        />
                    </Field>

                    <div className={styles.counters}>
                        <span className={shared.chip}>
                            <span className={shared.chipLabel}>{translation("key_dynamic_field_count")}</span>
                            <span className={shared.chipCount}>{form.dynamicCount}</span>
                        </span>
                        <span className={shared.chip}>
                            <span className={shared.chipLabel}>{translation("key_line_count")}</span>
                            <span className={shared.chipCount}>{form.lineCount}</span>
                        </span>
                    </div>

                    <Field label={translation("key_add_dynamic_field")} htmlFor="prompt-dynamic-field">
                        <SelectBox id="prompt-dynamic-field" value={form.dynamicFieldKey} onChange={(event) => form.insertDynamicField(event.target.value)}>
                            <option value="">{translation("key_please_select")}</option>
                            {PROMPT_DYNAMIC_FIELDS.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                        </SelectBox>
                    </Field>

                    <Field error={form.errors.promptText} full>
                        <TextArea
                            ref={form.textareaRef}
                            id="prompt-text"
                            className={styles.editor}
                            rows={PROMPT_EDITOR_ROWS}
                            value={form.promptText}
                            onChange={(event) => form.setPromptText(event.target.value)}
                            invalid={Boolean(form.errors.promptText)}
                            spellCheck={false}
                        />
                    </Field>
                </FormGrid>

                <div className={shared.formFoot}>
                    <Btn variant="secondary" type="button" onClick={form.onCancel} disabled={form.isSubmitting}>{translation("key_cancel")}</Btn>
                    <span className={shared.formFootSpacer} />
                    <Btn variant="primary" type="submit" disabled={form.isSubmitting}>
                        {form.isSubmitting ? translation("key_saving") : translation("key_save")}
                    </Btn>
                </div>
            </form>
        </div>
    );
};

export default PromptTemplateFormPage;
