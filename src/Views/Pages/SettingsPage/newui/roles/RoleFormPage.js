import React from "react";
import { Link } from "react-router-dom";
import { Controller } from "react-hook-form";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import { Field, FormGrid, Switch, TextInput } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { toTitleCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "../agencies/AgencyForm.module.css";
import useRoleForm from "./useRoleForm";

const RoleFormPage = () => {
    const roleForm = useRoleForm();
    const { control, handleSubmit, formState: { errors } } = roleForm.form;
    const title = toTitleCase(translation(roleForm.isEdit ? "key_edit_role" : "key_add_role"));

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={`/${routes.roles}`}>{toTitleCase(translation("key_roles"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{title}</span>
            </nav>

            <form className={shared.card} onSubmit={handleSubmit(roleForm.onSubmit)} noValidate>
                <div className={shared.cardHead}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{title}</h1>
                </div>

                {roleForm.isLoading ? (
                    <div className={shared.loadingState}>{translation("key_loading")}…</div>
                ) : (
                    <>
                        <FormGrid columns={3}>
                            <Field label={translation("key_role_name")} htmlFor="role_name" required error={errors.role_name?.message}>
                                <Controller name="role_name" control={control} render={({ field }) => (
                                    <TextInput {...field} id="role_name" type="text" invalid={Boolean(errors.role_name)} />
                                )} />
                            </Field>
                        </FormGrid>

                        <div className={styles.statusRow}>
                            <Switch
                                id="role-status"
                                label={translation("key_active")}
                                checked={roleForm.roleStatus}
                                onChange={roleForm.toggleStatus}
                            />
                        </div>

                        <div className={styles.footer}>
                            <Btn variant="primary" type="submit" disabled={roleForm.isSaving}>
                                {roleForm.isSaving ? translation("key_saving") : translation("key_done")}
                            </Btn>
                            <Btn variant="secondary" type="button" onClick={roleForm.onCancel} disabled={roleForm.isSaving}>
                                {translation("key_cancel")}
                            </Btn>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
};

export default RoleFormPage;
