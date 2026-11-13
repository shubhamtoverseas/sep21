import React from "react";
import PropTypes from "prop-types";
import WkdEditWorkerDrawer from "../../../WorkerPage/worker-detail/newui/WkdEditWorkerDrawer";
import Btn from "../../../../../components/ui/Btn";
import translation from "../../../../../utils/translation";
import useNewEmployerForm from "../useNewEmployerForm";
import NewEmployerForm from "../NewEmployerForm";
import EmployerDuplicateWarning from "../EmployerDuplicateWarning";
import { bannerMessage, DUPLICATE_WARNING_CLASSES } from "../NewEmployerModal";
import { employerDisplayName } from "./employerDetailsConfig";
import styles from "../NewEmployerModal.module.css";
import { EMPLOYER_DUPLICATE_COPY } from "../employerNewUiConstants";


const EditEmployerDrawer = ({ employer, locked, hidden, onClose, onSaved }) => {
    const { form, errors, lookups, derived, actions } = useNewEmployerForm({ employer, onSaved });

    return (
        <WkdEditWorkerDrawer
            title={ translation('key_edit_employer') }
            onClose={ onClose }
            workerName={ employerDisplayName(employer) }
            workerCode={ employer?.reference_id }
        >
            <form id="edit-employer-form" className={ `${ styles.form } ${ styles.drawerForm }` } onSubmit={ actions.submit } noValidate>
                <div className={ styles.drawerBody }>
                    { derived.duplicateWarning ? (
                        <EmployerDuplicateWarning warning={ derived.duplicateWarning } classes={ DUPLICATE_WARNING_CLASSES } />
                    ) : (
                        <>
                            { derived.banner && (
                                <div className={ styles.banner } role="alert">
                                    <div className={ styles.bannerTitle }>{ translation('key_cannot_save_changes') }</div>
                                    <div className={ styles.bannerText }>{ bannerMessage(derived.banner) }</div>
                                </div>
                            ) }
                            <NewEmployerForm control={ form.control } errors={ errors } lookups={ lookups } derived={ derived } actions={ actions } variant="drawer" locked={ locked } hidden={ hidden } />
                        </>
                    ) }
                </div>
                {/* E-1 / U-0032 warn step: nothing is saved yet — Back returns to the form, Save anyway resends with the confirm flag */}
                <div className={ styles.drawerFoot }>
                    <span className={ styles.spacer } />
                    { derived.duplicateWarning ? (
                        <>
                            <Btn variant="secondary" type="button" onClick={ actions.backFromDuplicate } disabled={ derived.isSubmitting }>{ translation('key_back') }</Btn>
                            <Btn variant="primary" type="button" onClick={ actions.confirmDuplicate } disabled={ derived.isSubmitting }>
                                { derived.isSubmitting ? translation('key_loading') : EMPLOYER_DUPLICATE_COPY.saveAnyway }
                            </Btn>
                        </>
                    ) : (
                        <>
                            <Btn variant="secondary" onClick={ onClose }>{ translation('key_cancel') }</Btn>
                            <Btn variant="primary" type="submit" disabled={ derived.isSubmitting }>
                                { derived.isSubmitting ? translation('key_loading') : translation('key_save_changes') }
                            </Btn>
                        </>
                    ) }
                </div>
            </form>
        </WkdEditWorkerDrawer>
    );
};

EditEmployerDrawer.propTypes = {
    employer: PropTypes.object.isRequired,
    /* blocks the actor may not edit (PERM §9.2 / §9.4): rendered disabled */
    locked: PropTypes.shape({ identity: PropTypes.bool, contact: PropTypes.bool, profile: PropTypes.bool }),
    /* blocks the actor may not view (U-0346): not rendered */
    hidden: PropTypes.shape({ identity: PropTypes.bool, contact: PropTypes.bool, profile: PropTypes.bool }),
    onClose: PropTypes.func.isRequired,
    onSaved: PropTypes.func.isRequired,
};

export default React.memo(EditEmployerDrawer);
