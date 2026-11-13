import React from "react";
import PropTypes from "prop-types";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import translation from "../../../../utils/translation";
import { headingCase } from "../../../../utils/utils";
import useNewEmployerForm from "./useNewEmployerForm";
import NewEmployerForm from "./NewEmployerForm";
import DedupeSearch from "./DedupeSearch";
import EmployerDuplicateWarning from "./EmployerDuplicateWarning";
import styles from "./NewEmployerModal.module.css";
import { EMPLOYER_DUPLICATE_COPY, EMPLOYER_FORM_COPY } from "./employerNewUiConstants";

/* E-1 warn step inside the New Employer dialog / Edit drawer — module classes of the duplicates block */
export const DUPLICATE_WARNING_CLASSES = {
    root: styles.warn, title: styles.warnTitle, text: styles.warnText, list: styles.warnList, row: styles.warnRow,
    source: styles.warnSource, name: styles.warnName, number: styles.warnNumber, note: styles.warnNote,
};

/* prototype validate(): "1 required field is missing (Surname)" / "2 required fields are missing (Surname, Given Names)" */
export const bannerMessage = (banner) => {
    if (banner.apiMessage) return banner.apiMessage;
    const count = banner.missing.length;
    if (count) {
        return `${count} ${count === 1 ? EMPLOYER_FORM_COPY.missingOne : EMPLOYER_FORM_COPY.missingMany} (${banner.missing.join(", ")}).`;
    }
    return translation("key_complete_highlighted_fields");
};

/* New Employer dialog (prototype #modal-new-employer): creation only. A dedupe match offers "Open" — the record;
   editing lives in the Employer Details edit drawer behind its own grants. */
/* U-0417 (29 Oct, CHANGE THE BUILD): no Send Registration Link here — the catalogue has no employer send-link grant and no endpoint */
const NewEmployerModal = ({ onClose, onAdded, onOpenEmployer, matchLabel }) => {
    const { form, errors, lookups, derived, actions } = useNewEmployerForm({ onAdded });

    /* E-1 / U-0032 warn step: nothing is saved yet — Back returns to the form, Save anyway resends with the confirm flag */
    const footer = derived.duplicateWarning ? (
        <>
            <span className={styles.spacer} />
            <Btn variant="secondary" onClick={actions.backFromDuplicate} disabled={derived.isSubmitting}>{translation("key_back")}</Btn>
            <Btn variant="primary" onClick={actions.confirmDuplicate} disabled={derived.isSubmitting}>
                {derived.isSubmitting ? translation("key_loading") : EMPLOYER_DUPLICATE_COPY.saveAnyway}
            </Btn>
        </>
    ) : (
        <>
            <span className={styles.spacer} />
            <Btn variant="secondary" onClick={onClose}>{translation("key_cancel")}</Btn>
            <Btn variant="primary" type="submit" form="new-employer-form" disabled={derived.isSubmitting}>
                {derived.isSubmitting ? translation("key_loading") : translation("key_add_employer")}
            </Btn>
        </>
    );

    return (
        <Modal title={headingCase(translation("key_new_employer"))} width={640} onClose={onClose} footer={footer}>
            {derived.duplicateWarning ? (
                <EmployerDuplicateWarning warning={derived.duplicateWarning} classes={DUPLICATE_WARNING_CLASSES} />
            ) : (
                <form id="new-employer-form" className={styles.form} onSubmit={actions.submit} noValidate>
                    <DedupeSearch onOpenEmployer={onOpenEmployer} matchLabel={matchLabel} />

                    {derived.banner && (
                        <div className={styles.banner} role="alert">
                            <div className={styles.bannerTitle}>{translation("key_cannot_add_employer")}</div>
                            <div className={styles.bannerText}>{bannerMessage(derived.banner)}</div>
                        </div>
                    )}

                    <NewEmployerForm control={form.control} errors={errors} lookups={lookups} derived={derived} actions={actions} />
                </form>
            )}
        </Modal>
    );
};

NewEmployerModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    onAdded: PropTypes.func.isRequired,
    onOpenEmployer: PropTypes.func.isRequired,
    /* label of the dedupe match action; the Employers page opens the record, the Job Offer flow selects the employer */
    matchLabel: PropTypes.string,
};

export default React.memo(NewEmployerModal);
