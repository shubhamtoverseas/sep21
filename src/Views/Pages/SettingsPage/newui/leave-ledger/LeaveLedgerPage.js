import React, { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import DataTable from "../../../../../components/ui/DataTable";
import DateInput from "../../../../../components/ui/DateInput";
import Icon from "../../../../../components/Icon/Icon";
import { Field, SelectBox } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import routes from "../../../routes/routesConfig";
import { useLeaveManagementPermissions } from "../../../../../utils/permissions/leaveManagementPermissionUtils";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "./LeaveLedger.module.css";
import useLeaveLedger from "./useLeaveLedger";
import { getLeaveLedgerColumns } from "./leaveLedgerColumns";
import LastRefresh from "../LastRefresh";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";

const LeaveLedgerPage = () => {
    const { permissionList } = useSelector((state) => state.users);
    /* Priyanka 11 Nov (audit #115): both ledger keys live in the leave_management module, not hrms —
       either grant opens the page */
    const { canViewLeaveLedger, canViewLeaveLedgerNonReportees } = useLeaveManagementPermissions(permissionList);
    const ledger = useLeaveLedger();

    const columns = useMemo(() => getLeaveLedgerColumns(), []);
    const goPrev = useCallback(() => ledger.setPage(ledger.pageInfo.currentPage - 1), [ledger]);
    const goNext = useCallback(() => ledger.setPage(ledger.pageInfo.currentPage + 1), [ledger]);

    const submit = useCallback((event) => {
        event.preventDefault();
        ledger.search();
    }, [ledger]);

    if (!canViewLeaveLedger && !canViewLeaveLedgerNonReportees) {
        return <div className={shared.notAuthorized}>{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={listStyles.pageWrap}>

            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{headingCase(translation("key_view_leave_ledger"))}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{headingCase(translation("key_view_leave_ledger"))}</h1>
                    <LastRefresh value={ledger.lastUpdated} />
                </div>
            </div>

            <form className={listStyles.filterBar} onSubmit={submit} noValidate>
                <div className={styles.filtersRow}>
                    <Field label={translation("key_select_employee")} htmlFor="ledger-user" required error={ledger.userError} className={styles.userField}>
                        <SelectBox id="ledger-user" value={ledger.userId} invalid={Boolean(ledger.userError)} onChange={(event) => ledger.onUserChange(event.target.value)}>
                            <option value="">{translation("key_select_employee")}</option>
                            {ledger.users.map((user) => <option key={user.user_id} value={user.user_id}>{user.name}</option>)}
                        </SelectBox>
                    </Field>

                    <Field label={translation("key_from")} htmlFor="ledger-from" className={styles.dateField}>
                        <DateInput id="ledger-from" value={ledger.fromDate} onChange={ledger.setFromDate} max={ledger.toDate || undefined} />
                    </Field>

                    <Field label={translation("key_to")} htmlFor="ledger-to" className={styles.dateField}>
                        <DateInput id="ledger-to" value={ledger.toDate} onChange={ledger.setToDate} min={ledger.fromDate || undefined} />
                    </Field>

                    <div className={styles.goCell}>
                        <Btn variant="primary" type="submit" disabled={ledger.isLoading}>
                            <Icon name="search" size={13} /> {translation("key_go")}
                        </Btn>
                    </div>
                </div>
            </form>

            {ledger.balances.length > 0 && (
                <section className={shared.chipCard}>
                    <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_current_leave_balance"))}</h2>
                    <div className={shared.chipRow}>
                        {ledger.balances.map((balance) => (
                            <span key={balance.leave_type} className={shared.chip}>
                                <span className={shared.chipLabel}>{balance.leave_type}</span>
                                <span className={shared.chipCount}>{balance.remaining_leaves}</span>
                            </span>
                        ))}
                    </div>
                </section>
            )}

            <DataTable
                columns={columns}
                rows={ledger.rows}
                rowKey={(row) => row?.id ?? `${row?.leave_type}-${row?.created_at}-${row?.balance}`}
                isLoading={ledger.isLoading}
                error={ledger.error}
                sortBy={ledger.sort.by}
                sortOrder={ledger.sort.order}
                pageInfo={ledger.pageInfo}
                unitLabel={translation("key_leave_ledger").toLowerCase()}
                emptyText={translation(ledger.hasSearched ? "key_no_records_found" : "key_select_employee")}
                onSort={ledger.setSortKey}
                onPrev={goPrev}
                onNext={goNext}
                onLimitChange={ledger.setLimit}
            />
        </div>
    );
};

export default LeaveLedgerPage;
