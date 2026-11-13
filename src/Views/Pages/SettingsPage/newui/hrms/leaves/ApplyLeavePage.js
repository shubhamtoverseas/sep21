import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import Btn from "../../../../../../components/ui/Btn";
import ConfirmModal from "../../../../../../components/ui/ConfirmModal";
import DateInput from "../../../../../../components/ui/DateInput";
import Icon from "../../../../../../components/Icon/Icon";
import { Field, FormGrid, RadioGroup, SelectBox, TextArea } from "../../../../../../components/ui/FormControls";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import translation from "../../../../../../utils/translation";
import { absoluteRoute, headingCase, toTitleCase } from "../../../../../../utils/utils";
import routes from "../../../../routes/routesConfig";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import styles from "../Hrms.module.css";
import useApplyLeave from "./useApplyLeave";
import { halfDayOptions } from "../hrmsConfig";
import { LEAVE_COMMENT_ROWS } from "../../settingsNewUiConstants";

const API_DATE_FORMAT = "YYYY-MM-DD";
const toInputValue = (date) => (date ? dayjs(date).format(API_DATE_FORMAT) : "");

/** Ports ApplyLeave.js — balance chips, leave type, from/to + half-day, remaining, comment. */
const ApplyLeavePage = () => {
    const leave = useApplyLeave();
    const dayOptions = useMemo(() => halfDayOptions(), []);
    const title = headingCase(translation("key_apply_leave"));

    if (!leave.canAddLeave) {
        ShowToast("error", translation("key_you_are_not_authorized_to_access_this_page"));
        return null;
    }

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.leaves)}>{toTitleCase(translation("key_leaves"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{title}</span>
            </nav>

            <form className={shared.card} onSubmit={leave.form.handleSubmit(leave.onSubmit)} noValidate>
                <div className={`${shared.cardHead} ${shared.cardHeadRow}`}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{title}</h1>
                    {leave.isEdit && (
                        <div className={shared.cardHeadActions}>
                            <Btn variant="danger" type="button" onClick={leave.openWithdraw}>{translation("key_withdraw_leave")}</Btn>
                        </div>
                    )}
                </div>

                {leave.isLoading ? (
                    <div className={shared.loadingState}>{translation("key_loading")}…</div>
                ) : (
                    <>
                        <div className={`${shared.chipCard} ${styles.balanceCard}`}>
                            <p className={styles.balanceTotal}>
                                {translation("key_total_leave_balance")}: <strong>{leave.leaveBalance?.total_leave_count || 0}</strong>
                            </p>
                            {leave.balances.length > 0 && (
                                <div className={shared.chipRow}>
                                    {leave.balances.map((balance) => (
                                        <span key={balance.leave_policy_details_id ?? balance.leave_type} className={shared.chip}>
                                            <span className={shared.chipLabel}>{balance.leave_type}</span>
                                            <span className={shared.chipCount}>{balance.remaining_leaves}</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <FormGrid columns={3}>
                            <Field label={translation("key_leave_type")} htmlFor="reasonSelect" required error={leave.errors.leave_policy_details_id?.message}>
                                <SelectBox id="reasonSelect" invalid={Boolean(leave.errors.leave_policy_details_id)} {...leave.register("leave_policy_details_id", { onChange: leave.onLeaveTypeChange })}>
                                    <option value="">{translation("key_select_reason")}</option>
                                    {leave.leaveTypes.map((type) => <option key={type.id} value={type.id}>{type.leave_policy_type}</option>)}
                                </SelectBox>
                            </Field>

                            <Field label={translation("key_from")} htmlFor="leave-from" required error={leave.errors.from_date?.message}>
                                <DateInput
                                    id="leave-from"
                                    value={toInputValue(leave.dateFilterFrom)}
                                    onChange={leave.onFromDateChange}
                                    min={toInputValue(leave.minDate)}
                                    max={toInputValue(leave.maxDate)}
                                    placeholder={translation("key_start_date")}
                                    invalid={Boolean(leave.errors.from_date)}
                                />
                            </Field>
                            <Field error={leave.errors.from_date_type?.message} className={styles.halfDayAlign}>
                                <div className={styles.halfDayField}>
                                    <RadioGroup name="from_date_type" value={leave.fromDateType} options={dayOptions} onChange={leave.onFromDateTypeChange} ariaLabel={translation("key_from")} />
                                </div>
                            </Field>

                            <Field label={translation("key_to")} htmlFor="leave-to" required error={leave.errors.to_date?.message}>
                                <DateInput
                                    id="leave-to"
                                    value={toInputValue(leave.dateFilterTo)}
                                    onChange={leave.onToDateChange}
                                    min={toInputValue(leave.dateFilterFrom || leave.minDate)}
                                    max={toInputValue(leave.maxDate)}
                                    placeholder={translation("key_end_date")}
                                    disabled={!leave.dateFilterFrom}
                                    invalid={Boolean(leave.errors.to_date)}
                                />
                            </Field>
                            <Field error={leave.errors.to_date_type?.message} className={styles.halfDayAlign}>
                                <div className={styles.halfDayField}>
                                    <RadioGroup name="to_date_type" value={leave.toDateType} options={dayOptions} onChange={leave.onToDateTypeChange} ariaLabel={translation("key_to")} />
                                </div>
                            </Field>

                            <div className={`${shared.chipCard} ${styles.remainingCard}`}>
                                <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_after_taking_leave"))}</h2>
                                <div className={shared.chipRow}>
                                    <span className={shared.chip}>
                                        <span className={shared.chipLabel}>{translation("key_remaining")}</span>
                                        <span className={shared.chipCount}>{leave.remainingLeaves || 0}</span>
                                    </span>
                                </div>
                            </div>

                            <Field label={translation("key_add_comment")} htmlFor="leave-comment" required error={leave.errors.comment?.message} full>
                                <TextArea id="leave-comment" rows={LEAVE_COMMENT_ROWS} invalid={Boolean(leave.errors.comment)} {...leave.register("comment")} />
                            </Field>
                        </FormGrid>

                        <div className={shared.formFoot}>
                            <Btn variant="secondary" type="button" onClick={leave.onCancel} disabled={leave.isSaving}>{translation("key_cancel")}</Btn>
                            <span className={shared.formFootSpacer} />
                            <Btn variant="primary" type="submit" disabled={leave.isSaveButtonDisabled || leave.isSaving}>
                                {leave.isSaving ? translation("key_saving") : translation("key_save")}
                            </Btn>
                        </div>
                    </>
                )}
            </form>

            {leave.isWithdrawOpen && (
                <ConfirmModal
                    title={headingCase(translation("key_withdraw_leave"))}
                    body={`${translation("key_are_you_sure_you_want_to_withdraw_leave")} ${translation("key_if_yes_your_leave_will_be_cancelled_and_leave_balance_will_be_restored")}`}
                    confirmLabel={translation("key_yes")}
                    cancelLabel={translation("key_no")}
                    danger
                    onConfirm={leave.confirmWithdraw}
                    onClose={leave.closeWithdraw}
                />
            )}
        </div>
    );
};

export default ApplyLeavePage;
