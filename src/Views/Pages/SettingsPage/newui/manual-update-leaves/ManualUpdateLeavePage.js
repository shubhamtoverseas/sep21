import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import { Field, FormGrid, SelectBox, TextArea, TextInput } from "../../../../../components/ui/FormControls";
import formStyles from "../../../../../components/ui/FormControls.module.css";
import translation from "../../../../../utils/translation";
import routes from "../../../routes/routesConfig";
import { useHrmsPermissions } from "../../../../../utils/permissions/hrmsPermissionsUtils";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "./ManualUpdateLeave.module.css";
import useManualUpdateLeave from "./useManualUpdateLeave";
import { COMMENT_ROWS, LEAVE_COUNT_MAX, LEAVE_COUNT_MIN, MANUAL_LEAVE_METHOD_OPTIONS } from "../settingsNewUiConstants";
import { headingCase } from "../../../../../utils/utils";

const ManualUpdateLeavePage = () => {
    const { permissionList } = useSelector((state) => state.users);
    const { canManualUpdateLeave } = useHrmsPermissions(permissionList);
    const page = useManualUpdateLeave();
    const { register, handleSubmit, formState: { errors } } = page.form;

    const methodOptions = useMemo(
        () => MANUAL_LEAVE_METHOD_OPTIONS.map((option) => ({ value: option.value, label: translation(option.key) })),
        []
    );

    if (!canManualUpdateLeave) {
        return <div className={shared.notAuthorized}>{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={routes.settings}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{headingCase(translation("key_manual_update_leaves"))}</span>
            </nav>

            <form className={shared.card} onSubmit={handleSubmit(page.onSubmit)} noValidate>
                <div className={shared.cardHead}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{headingCase(translation("key_manual_update_leaves"))}</h1>
                </div>

                <div className={styles.employeeRow}>
                    <Field label={translation("key_select_employee")} htmlFor="mul-user" required error={errors.user_id?.message} className={styles.employeeField}>
                        <SelectBox id="mul-user" value={page.selectedUserId} invalid={Boolean(errors.user_id)} onChange={page.onUserChange}>
                            <option value="">{translation("key_select_employee")}</option>
                            {page.users.map((user) => <option key={user?.user_id} value={user?.user_id}>{user?.name}</option>)}
                        </SelectBox>
                    </Field>
                    <Btn variant="secondary" type="button" onClick={page.loadBalance} disabled={!page.selectedUserId}>
                        <Icon name="refresh" size={13} /> {translation("key_go")}
                    </Btn>
                </div>

                {page.balances.length > 0 && (
                    <section className={`${shared.chipCard} ${styles.balances}`}>
                        <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_current_leave_balance"))}</h2>
                        <div className={shared.chipRow}>
                            {page.balances.map((balance) => (
                                <span key={balance.leave_type} className={shared.chip}>
                                    <span className={shared.chipLabel}>{balance.leave_type}</span>
                                    <span className={shared.chipCount}>{balance.remaining_leaves}</span>
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                <section className={styles.section}>
                    <Field label={translation("key_choose_mode_of_withdrawal")} required error={errors.method?.message}>
                        <div className={formStyles.radioRow} role="radiogroup" aria-label={translation("key_choose_mode_of_withdrawal")}>
                            {methodOptions.map((option) => (
                                <label key={option.value} className={formStyles.radioLabel}>
                                    <input
                                        type="radio"
                                        className={formStyles.radio}
                                        value={option.value}
                                        {...register("method", { onChange: page.onMethodChange })}
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                    </Field>
                </section>

                <section className={styles.section}>
                    <FormGrid columns={4}>
                        <Field label={translation("key_leave_type")} htmlFor="mul-leave-type" required error={errors.leave_policy_details_id?.message}>
                            <SelectBox id="mul-leave-type" invalid={Boolean(errors.leave_policy_details_id)} {...register("leave_policy_details_id", { onChange: page.onLeaveTypeChange })}>
                                <option value="">{translation("key_select_leave_type")}</option>
                                {page.leaveTypes.map((leave) => <option key={leave.id} value={leave.id}>{leave.leave_policy_type}</option>)}
                            </SelectBox>
                        </Field>

                        <Field label={translation("key_count")} htmlFor="mul-count" required error={errors.leave_count?.message}>
                            <TextInput id="mul-count" className="mc-spin" type="number" min={LEAVE_COUNT_MIN} max={LEAVE_COUNT_MAX} invalid={Boolean(errors.leave_count)} {...register("leave_count")} />
                        </Field>

                        {page.isEncashment && (
                            <Field label={translation("key_eligible")}>
                                <span className={`${shared.chip} ${shared.chipSuccess} ${styles.eligibleChip}`}>
                                    <span className={shared.chipLabel}>{translation("key_eligible")}</span>
                                    <span className={shared.chipCount}>{page.eligibility ?? "—"}</span>
                                </span>
                            </Field>
                        )}

                        <Field label={translation("key_comment")} htmlFor="mul-comment" required error={errors.comment?.message} full>
                            <TextArea
                                id="mul-comment"
                                rows={COMMENT_ROWS}
                                placeholder={`${translation("key_enter")} ${translation("key_comment")}`}
                                invalid={Boolean(errors.comment)}
                                className={styles.comment}
                                {...register("comment")}
                            />
                        </Field>
                    </FormGrid>
                </section>

                <div className={shared.formFoot}>
                    <Btn variant="secondary" type="button" onClick={page.onCancel} disabled={page.isSaving}>
                        {translation("key_cancel")}
                    </Btn>
                    <span className={shared.formFootSpacer} />
                    <Btn variant="primary" type="submit" disabled={page.isSaving}>
                        {page.isSaving ? translation("key_saving") : translation("key_save")}
                    </Btn>
                </div>
            </form>
        </div>
    );
};

export default ManualUpdateLeavePage;
