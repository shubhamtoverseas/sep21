import React from "react";
import PropTypes from "prop-types";
import { useFormContext } from "react-hook-form";
import { Field, FormGrid, Switch, TextInput } from "../../../../../../components/ui/FormControls";
import translation from "../../../../../../utils/translation";
import shared from "../../settings-newui.module.css";
import styles from "../UserForm.module.css";
import { headingCase } from "../../../../../../utils/utils";

const UserSecurityTab = ({ mfaEnabled, onToggleMfa }) => {
    const { register, formState: { errors } } = useFormContext();

    return (
        <>
            <section className={styles.section}>
                <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_multi_factor_authentication_email_based_otp"))}</h2>
                <div className={styles.statusRow}>
                    <Switch id="user-mfa" label={translation("key_active")} checked={mfaEnabled} onChange={onToggleMfa} />
                </div>
            </section>

            <section className={styles.section}>
                <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_create_password"))}</h2>
                <FormGrid columns={4}>
                    <Field label={translation("key_add_password")} htmlFor="user-password" error={errors.password?.message}>
                        <TextInput
                            id="user-password"
                            type="password"
                            autoComplete="new-password"
                            placeholder={translation("key_enter_password")}
                            invalid={Boolean(errors.password)}
                            {...register("password")}
                        />
                    </Field>
                </FormGrid>
            </section>
        </>
    );
};

UserSecurityTab.propTypes = {
    mfaEnabled: PropTypes.bool,
    onToggleMfa: PropTypes.func.isRequired,
};

export default React.memo(UserSecurityTab);
