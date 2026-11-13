import React, { useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { Controller, useFormContext } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Field, FormGrid, RadioGroup, SelectBox, TextInput } from "../../../../../../components/ui/FormControls";
import constData from "../../../../../../components/ReusableComponents/constants";
import { fetchDoops } from "../../../../../../redux/Slices/settings/doops/DoopSlice";
import { fetchHolidaysByStatus } from "../../../../../../redux/Slices/settings/holidays/HolidaySlice";
import { fetchLeavePolicyMaster } from "../../../../../../redux/Slices/settings/leavePolicy/LeavePolicySlice";
import translation from "../../../../../../utils/translation";
import shared from "../../settings-newui.module.css";
import styles from "../UserForm.module.css";
import { headingCase } from "../../../../../../utils/utils";
import {
    ACTIVE_HOLIDAYS_QUERY,
    NUMBER_INPUT_BLOCKED_KEYS,
    SALARY_AMOUNT_MAX,
    SALARY_AMOUNT_MAX_LENGTH,
    SALARY_AMOUNT_STEP,
    YES_NO_OPTIONS,
} from "../../settingsNewUiConstants";

const blockSignKeys = (event) => { if (NUMBER_INPUT_BLOCKED_KEYS.includes(event.key)) event.preventDefault(); };
const clampAmountLength = (event) => {
    if (event.target.value.length > SALARY_AMOUNT_MAX_LENGTH) event.target.value = event.target.value.slice(0, SALARY_AMOUNT_MAX_LENGTH);
};

const UserSalaryTab = ({ loadOnce }) => {
    const dispatch = useDispatch();
    const { register, control, formState: { errors } } = useFormContext();
    const { doops, doopsOrder } = useSelector((state) => state.doops);
    const { holidayListByStatus } = useSelector((state) => state.holidays);
    const { leavePolicyMaster } = useSelector((state) => state.leavePolicy);

    useEffect(() => {
        loadOnce("doops", () => dispatch(fetchDoops()));
        loadOnce("leavePolicyMaster", () => dispatch(fetchLeavePolicyMaster()));
        loadOnce("holidays:active", () => dispatch(fetchHolidaysByStatus(ACTIVE_HOLIDAYS_QUERY)));
    }, [dispatch, loadOnce]);

    const doopOptions = useMemo(
        () => (Array.isArray(doopsOrder) ? doopsOrder.map((id) => doops?.[id]).filter(Boolean) : []),
        [doops, doopsOrder]
    );
    const leavePolicyOptions = useMemo(() => (leavePolicyMaster ? Object.values(leavePolicyMaster) : []), [leavePolicyMaster]);
    const yesNoOptions = useMemo(() => YES_NO_OPTIONS.map((option) => ({ value: option.value, label: translation(option.key) })), []);

    const radioField = (name, labelKey) => (
        <Field label={translation(labelKey)} error={errors[name]?.message}>
            <Controller name={name} control={control} render={({ field }) => (
                <RadioGroup name={name} value={field.value == null ? "" : String(field.value)} options={yesNoOptions} onChange={field.onChange} ariaLabel={translation(labelKey)} />
            )} />
        </Field>
    );

    return (
        <>
            <section className={styles.section}>
                <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_salary_information"))}</h2>
                <FormGrid columns={4}>
                    <Field label={translation("key_enter_salary_basis")} htmlFor="user-salary_basis" error={errors.salary_basis?.message}>
                        <SelectBox id="user-salary_basis" invalid={Boolean(errors.salary_basis)} {...register("salary_basis")}>
                            <option value="">{translation("key_enter_salary_basis")}</option>
                            {constData.salaryBasis.map((basis) => <option key={basis.id} value={basis.id}>{basis.name}</option>)}
                        </SelectBox>
                    </Field>

                    <Field label={translation("key_salary_amount")} htmlFor="user-salary_amount" error={errors.salary_amount?.message}>
                        <TextInput
                            id="user-salary_amount"
                            type="number"
                            min={0}
                            max={SALARY_AMOUNT_MAX}
                            step={SALARY_AMOUNT_STEP}
                            placeholder={`${translation("key_enter")} ${translation("key_salary_amount")}`}
                            invalid={Boolean(errors.salary_amount)}
                            onKeyDown={blockSignKeys}
                            onInput={clampAmountLength}
                            {...register("salary_amount")}
                        />
                    </Field>

                    {radioField("salary_mpf_contri_type", "key_mpf_contribution")}

                    <Field label={translation("key_mpf_contribution_amount")} htmlFor="user-salary_mpf_contri_amount" error={errors.salary_mpf_contri_amount?.message}>
                        <TextInput
                            id="user-salary_mpf_contri_amount"
                            type="number"
                            placeholder={`${translation("key_enter")} ${translation("key_mpf_contribution_amount")}`}
                            invalid={Boolean(errors.salary_mpf_contri_amount)}
                            {...register("salary_mpf_contri_amount")}
                        />
                    </Field>

                    <Field label={translation("key_mpf_contribution_rate")} htmlFor="user-salary_mpf_contri_rate" error={errors.salary_mpf_contri_rate?.message}>
                        <TextInput
                            id="user-salary_mpf_contri_rate"
                            type="number"
                            placeholder={`${translation("key_enter")} ${translation("key_mpf_contribution_rate")}`}
                            invalid={Boolean(errors.salary_mpf_contri_rate)}
                            {...register("salary_mpf_contri_rate")}
                        />
                    </Field>
                </FormGrid>
            </section>

            <section className={styles.section}>
                <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_benefits_entitled"))}</h2>
                <FormGrid columns={4}>
                    {radioField("overtime_pay", "key_overtime_pay")}

                    <Field label={translation("key_doop_days_of_operation")} htmlFor="user-doop_id" error={errors.doop_id?.message}>
                        <SelectBox id="user-doop_id" invalid={Boolean(errors.doop_id)} {...register("doop_id")}>
                            <option value="">{translation("key_please_select")}</option>
                            {doopOptions.map((doop) => <option key={doop.id} value={doop.id}>{doop.doop_name}</option>)}
                        </SelectBox>
                    </Field>

                    <Field label={translation("key_leave_policy")} htmlFor="user-leave_policy_id" error={errors.leave_policy_id?.message}>
                        <SelectBox id="user-leave_policy_id" invalid={Boolean(errors.leave_policy_id)} {...register("leave_policy_id")}>
                            <option value="">{translation("key_enter_leave_policy")}</option>
                            {leavePolicyOptions.map((policy) => <option key={policy.id} value={policy.id}>{policy.leave_policy_name}</option>)}
                        </SelectBox>
                    </Field>

                    <Field label={translation("key_holiday_list")} htmlFor="user-holiday_list_id" error={errors.holiday_list_id?.message}>
                        <SelectBox id="user-holiday_list_id" invalid={Boolean(errors.holiday_list_id)} {...register("holiday_list_id")}>
                            <option value="">{translation("key_please_select")}</option>
                            {(holidayListByStatus || []).map((holiday) => <option key={holiday.id} value={holiday.id}>{holiday.list_name}</option>)}
                        </SelectBox>
                    </Field>
                </FormGrid>
            </section>
        </>
    );
};

UserSalaryTab.propTypes = {
    loadOnce: PropTypes.func.isRequired,
};

export default React.memo(UserSalaryTab);
