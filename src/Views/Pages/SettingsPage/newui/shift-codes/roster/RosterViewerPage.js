import React, { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import Btn from "../../../../../../components/ui/Btn";
import DataTable from "../../../../../../components/ui/DataTable";
import DateInput from "../../../../../../components/ui/DateInput";
import FilterSelect from "../../../../../../components/ui/FilterSelect";
import Icon from "../../../../../../components/Icon/Icon";
import { Field } from "../../../../../../components/ui/FormControls";
import translation from "../../../../../../utils/translation";
import { useShiftManagementPermissions } from "../../../../../../utils/permissions/shiftManagementPermissionUtils";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import styles from "./RosterViewer.module.css";
import useRosterViewer from "./useRosterViewer";
import { getRosterViewerColumns } from "./rosterViewerColumns";
import LastRefresh from "../../LastRefresh";
import { absoluteRoute, headingCase } from "../../../../../../utils/utils";
import routes from "../../../../routes/routesConfig";
import { Link } from "react-router-dom";

const RosterViewerPage = () => {
    const { permissionList } = useSelector((state) => state.users);
    const { canViewShiftRoster } = useShiftManagementPermissions(permissionList);
    const roster = useRosterViewer();

    const columns = useMemo(() => getRosterViewerColumns(), []);
    const userOptions = useMemo(() => [{ value: "", label: translation("key_all") }, ...roster.userOptions], [roster.userOptions]);
    const goPrev = useCallback(() => roster.setPage(roster.pageInfo.currentPage - 1), [roster]);
    const goNext = useCallback(() => roster.setPage(roster.pageInfo.currentPage + 1), [roster]);

    if (!canViewShiftRoster) {
        return <div className={shared.notAuthorized}>{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{headingCase(translation("key_shift_roster_viewer"))}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{headingCase(translation("key_shift_roster_viewer"))}</h1>
                    <LastRefresh value={roster.lastUpdated} />
                </div>
                <div className={listStyles.pageHeaderActions}>
                    <Btn variant="secondary" type="button" onClick={roster.exportRows} disabled={!roster.rows.length}>
                        <Icon name="download" size={14} /> {translation("key_export_to_csv")}
                    </Btn>
                </div>
            </div>

            <div className={listStyles.filterBar}>
                <div className={styles.filtersRow}>
                    <div className={listStyles.controlsSearch}>
                        <Icon name="search" size={14} />
                        <input
                            id="roster-search"
                            type="search"
                            className={listStyles.controlsSearchInput}
                            placeholder={translation("key_search")}
                            value={roster.searchInput}
                            onChange={(event) => roster.onSearchChange(event.target.value)}
                            aria-label={translation("key_search")}
                            autoComplete="off"
                        />
                    </div>

                    <Field required error={roster.usersError} className={styles.usersField}>
                        <FilterSelect
                            id="roster-users"
                            label={translation("key_users")}
                            value={roster.draftUserIds}
                            options={userOptions}
                            multiple
                            menuWidth={240}
                            onChange={roster.onUsersChange}
                        />
                    </Field>

                    <Field label={translation("key_from")} htmlFor="roster-from" className={styles.dateField}>
                        <DateInput id="roster-from" value={roster.draftFromDate} onChange={roster.setDraftFromDate} max={roster.draftToDate || undefined} />
                    </Field>

                    <Field label={translation("key_to")} htmlFor="roster-to" className={styles.dateField}>
                        <DateInput id="roster-to" value={roster.draftToDate} onChange={roster.setDraftToDate} min={roster.draftFromDate || undefined} />
                    </Field>

                    <div className={styles.actions}>
                        <Btn variant="primary" type="button" onClick={roster.go} disabled={roster.isLoading}>
                            {translation("key_go")}
                        </Btn>
                        <button type="button" className={shared.clearBtn} onClick={roster.clearFilters}>
                            {translation("key_clear_filters")}
                        </button>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                rows={roster.rows}
                rowKey={(row) => row?.id ?? `${row?.username}-${row?.shift_date}-${row?.shift_code}`}
                isLoading={roster.isLoading}
                error={roster.error}
                sortBy={roster.sortBy}
                sortOrder={roster.sortOrder}
                pageInfo={roster.pageInfo}
                unitLabel={translation("key_shift_roster").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={roster.setSort}
                onPrev={goPrev}
                onNext={goNext}
                onLimitChange={roster.setLimit}
                onRetry={roster.refresh}
            />
        </div>
    );
};

export default RosterViewerPage;
