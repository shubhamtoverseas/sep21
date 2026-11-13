import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import Btn from "../../../../../components/ui/Btn";
import DataTable from "../../../../../components/ui/DataTable";
import Icon from "../../../../../components/Icon/Icon";
import { Field, FormGrid, Switch, TextInput } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "./LeavePolicy.module.css";
import useLeavePolicyForm from "./useLeavePolicyForm";
import LeaveTypeForm from "./LeaveTypeForm";
import { getLeavePolicyRowColumns } from "./leavePolicyRowColumns";
import { headingCase } from "../../../../../utils/utils";

const LeavePolicyFormPage = () => {
    const policy = useLeavePolicyForm();
    const title = policy.isEdit
        ? translation("key_edit_leave_policy")
        : `${translation("key_add")} ${translation("key_leave_policy")}`;

    const columns = useMemo(() => getLeavePolicyRowColumns({ onEdit: policy.editRow }), [policy.editRow]);

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={`/${routes.leavePolicy}`}>{translation("key_leave_policy")}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{title}</span>
            </nav>

            <div className={shared.card}>
                <div className={shared.cardHead}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{title}</h1>
                </div>

                {policy.isLoading ? (
                    <div className={shared.loadingState}>{translation("key_loading")}…</div>
                ) : (
                    <>
                        <div className={styles.masterRow}>
                            <FormGrid columns={3} className={styles.masterGrid}>
                                <Field label={translation("key_policy_name")} htmlFor="leave-policy-name" required>
                                    <TextInput
                                        id="leave-policy-name"
                                        type="text"
                                        value={policy.policyName}
                                        placeholder={`${translation("key_enter")} ${translation("key_policy_name")}`}
                                        onChange={(event) => policy.setPolicyName(event.target.value)}
                                    />
                                </Field>
                            </FormGrid>
                            {/* Shubham 6 Nov: Add carries no Active toggle — a new policy saves Active; Edit keeps the switch */}
                            {policy.isEdit && (
                                <div className={styles.statusRow}>
                                    <Switch id="leave-policy-status" label={translation("key_active")} checked={policy.isActive} onChange={policy.setIsActive} />
                                </div>
                            )}
                        </div>

                        <section className={styles.section}>
                            <div className={styles.sectionHead}>
                                <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_leave_type"))}</h2>
                                <Btn variant="secondary" type="button" onClick={policy.openNewRowForm}>
                                    <Icon name="plus" size={14} /> {translation("key_add")} {translation("key_leave_type")}
                                </Btn>
                            </div>
                            <DataTable
                                columns={columns}
                                rows={policy.rows}
                                rowKey="tempId"
                                emptyText={translation("key_no_records_found")}
                            />
                        </section>

                        {policy.isFormVisible && (
                            <LeaveTypeForm
                                key={policy.editingRow?.tempId ?? "new"}
                                editData={policy.editingRow}
                                onSubmitRow={policy.addOrUpdateRow}
                                onDiscard={policy.closeRowForm}
                            />
                        )}

                        <div className={styles.footer}>
                            <span className={styles.footerSpacer} />
                            {/* U-0439: the note names the consequence, not an instruction — the open row is not part of the policy yet */}
                            {policy.isFormVisible && policy.rows.length > 0 && (
                                <span className={styles.footerNote}>{translation("key_lp_rows_only_saved")}</span>
                            )}
                            {/* both actions sit right (user, 6 Nov) */}
                            <Btn variant="secondary" type="button" onClick={policy.onCancel} disabled={policy.isSaving}>
                                {translation("key_cancel")}
                            </Btn>
                            <Btn variant="primary" type="button" onClick={policy.save} disabled={!policy.canSave}>
                                {policy.isSaving ? translation("key_saving") : translation("key_save")}
                            </Btn>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LeavePolicyFormPage;
