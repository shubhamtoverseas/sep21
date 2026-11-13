import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../../components/ui/Modal";
import Btn from "../../../../../components/ui/Btn";
import formStyles, { Field, FormGrid, Switch, TextArea, TextInput } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { headingCase } from "../../../../../utils/utils";
import { TASK_TEMPLATE_COPY, TASK_TEMPLATE_NOTES_MAX, TASK_TEMPLATE_STATUS, TASK_TEMPLATE_TITLE_MAX } from "../settingsNewUiConstants";

/*
 * Add New / Edit task template (conflict sheet U-0011 + U-0261): Task Title, Task Title (Traditional Chinese), optional Notes
 * in each language (internal, typed by the manager, never auto-translated; saving notes onto a title-only preset is a new
 * version), Save; editing adds the Active / Retired toggle. At least one title is required (HRMS API spec §2.4). A server refusal (duplicate
 * title 422, missing permission 403) is shown in the form and the dialog stays open.
 */
const TaskTemplateFormModal = ({ template, onSave, onClose, isSaving, formError }) => {
    const isEdit = template?.id != null;
    const [titleEn, setTitleEn] = useState(template?.title_en || "");
    const [titleZh, setTitleZh] = useState(template?.title_zh || "");
    const [notesEn, setNotesEn] = useState(template?.notes_en || "");
    const [notesZh, setNotesZh] = useState(template?.notes_zh || "");
    const [active, setActive] = useState(template?.status !== TASK_TEMPLATE_STATUS.RETIRED);
    const [error, setError] = useState("");
    const firstRef = useRef(null);
    useEffect(() => { firstRef.current?.focus(); }, []);

    const submit = (event) => {
        event.preventDefault();
        if (!titleEn.trim() && !titleZh.trim()) { setError(TASK_TEMPLATE_COPY.titleRequired); return; }
        setError("");
        onSave({ title_en: titleEn, title_zh: titleZh, notes_en: notesEn, notes_zh: notesZh, retired: !active });
    };

    const footer = (
        <>
            <Btn variant="secondary" onClick={onClose} disabled={isSaving}>{translation("key_cancel")}</Btn>
            <Btn variant="primary" type="submit" form="task-template-form" disabled={isSaving}>{isSaving ? translation("key_loading") : translation("key_save")}</Btn>
        </>
    );

    return (
        <Modal title={headingCase(isEdit ? `${translation("key_edit")} ${TASK_TEMPLATE_COPY.item}` : TASK_TEMPLATE_COPY.addNew)} width={560} onClose={onClose} footer={footer} busy={isSaving}>
            <form id="task-template-form" onSubmit={submit} noValidate>
                <FormGrid columns={2}>
                    <Field label={TASK_TEMPLATE_COPY.titleEn} htmlFor="task-template-en" full error={error}>
                        <TextInput ref={firstRef} id="task-template-en" type="text" value={titleEn} maxLength={TASK_TEMPLATE_TITLE_MAX} invalid={Boolean(error)} onChange={(event) => { setTitleEn(event.target.value); setError(""); }} />
                    </Field>
                    <Field label={TASK_TEMPLATE_COPY.titleZh} htmlFor="task-template-zh" full>
                        <TextInput id="task-template-zh" type="text" lang="zh-HK" value={titleZh} maxLength={TASK_TEMPLATE_TITLE_MAX} onChange={(event) => { setTitleZh(event.target.value); setError(""); }} />
                    </Field>
                    <Field label={TASK_TEMPLATE_COPY.notesEn} htmlFor="task-template-notes-en" full hint={TASK_TEMPLATE_COPY.notesHint}>
                        <TextArea id="task-template-notes-en" rows={3} value={notesEn} maxLength={TASK_TEMPLATE_NOTES_MAX} onChange={(event) => setNotesEn(event.target.value)} />
                    </Field>
                    <Field label={TASK_TEMPLATE_COPY.notesZh} htmlFor="task-template-notes-zh" full>
                        <TextArea id="task-template-notes-zh" rows={3} lang="zh-HK" value={notesZh} maxLength={TASK_TEMPLATE_NOTES_MAX} onChange={(event) => setNotesZh(event.target.value)} />
                    </Field>
                    {isEdit && (
                        <Field label={translation("key_status")} htmlFor="task-template-active" full hint={TASK_TEMPLATE_COPY.retireHint}>
                            <Switch id="task-template-active" label={active ? translation("key_active") : TASK_TEMPLATE_COPY.retired} checked={active} onChange={setActive} disabled={isSaving} />
                        </Field>
                    )}
                </FormGrid>
                {formError && <div role="alert" className={formStyles.fieldError}>{formError}</div>}
            </form>
        </Modal>
    );
};

TaskTemplateFormModal.propTypes = {
    template: PropTypes.shape({ id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), title_en: PropTypes.string, title_zh: PropTypes.string, notes_en: PropTypes.string, notes_zh: PropTypes.string, status: PropTypes.string }),
    onSave: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    isSaving: PropTypes.bool,
    formError: PropTypes.string,
};

export default TaskTemplateFormModal;
