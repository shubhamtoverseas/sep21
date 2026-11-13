import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Btn from "../../../../components/ui/Btn";
import Icon from "../../../../components/Icon/Icon";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import configData from "../../../../components/ReusableComponents/app-configs";
import { COLUMN_VIEW_STATE_KEYS } from "../../../../components/ReusableComponents/constants";
import { loadColumnKeys, saveColumnKeys } from "../../../../services/commonService";
import routes from "../../routes/routesConfig";
import listStyles from "../../Invoice/InvoiceList.module.css";
import styles from "./InsuranceDashboard.module.css";
import useInsuranceDashboard from "./useInsuranceDashboard";
import InsuranceSummary from "./InsuranceSummary";
import InsuranceFilterBar from "./InsuranceFilterBar";
import InsuranceRecordsTable from "./InsuranceRecordsTable";
import InsuranceMenu, { MenuItem } from "./InsuranceMenu";
import { getInsuranceColumns } from "./insuranceDashboardColumns";
import { migrateInsurancePreferences, translation } from "./insuranceDashboardConfig";
import { targetFromRow } from "../ownership/ownershipConfig";
import useCanOpenContract from "../shared/useCanOpenContract";

const ChangeOwnerDialog = lazy(() => import("../ownership/ChangeOwnerDialog"));
const PortfolioHandoverDialog = lazy(() => import("../ownership/PortfolioHandoverDialog"));
const HandoverResultDialog = lazy(() => import("../ownership/HandoverResultDialog"));

const MANDATORY = () => configData.insuranceMandatoryColumnsTrans();

/* Insurance dashboard — route /insurance (INDEX §3.1, TARGET_FE §3). A row opens the record page;
   New Insurance opens the wizard. With Bulk Change Owner, selected standalone rows change CS Owner and
   Administrative › Portfolio handover moves one person's records (ownership.js). */
const InsuranceDashboardPage = () => {
    const navigate = useNavigate();
    const dashboard = useInsuranceDashboard();
    const { meta, metaStatus, records, filters, markReturn, refresh, setFilter, setPage } = dashboard;
    const { currentPage, lastPage } = dashboard.pageInfo;

    const [visibleColumns, setVisibleColumns] = useState(() => {
        migrateInsurancePreferences(COLUMN_VIEW_STATE_KEYS.insurance);   /* Q-19: "nextStep" → "openRequests" before reading */
        return loadColumnKeys(
            COLUMN_VIEW_STATE_KEYS.insurance,
            configData.insuranceColumnsConfigTrans(),
            configData.insuranceColumnsConfigTranslate({ translation }).map((o) => o.value),
            MANDATORY()
        );
    });
    /* the Contract column links only when the viewer can open that Contract record (the Contract page's own check) */
    const canOpenContract = useCanOpenContract();
    const [selected, setSelected] = useState([]);
    const [ownerChange, setOwnerChange] = useState(null);
    const [portfolioOpen, setPortfolioOpen] = useState(false);
    const [handover, setHandover] = useState(null);

    /* the selection belongs to the displayed rows */
    useEffect(() => {
        setSelected((prev) => prev.filter((s) => (records.rows || []).some((r) => r.ref === s.ref)));
    }, [records.rows]);

    const select = useCallback((rows, on) => {
        setSelected((prev) => {
            const rest = prev.filter((s) => !rows.some((r) => r.ref === s.ref));
            return on ? [...rest, ...rows] : rest;
        });
    }, []);

    const columns = useMemo(() => getInsuranceColumns(visibleColumns, { canOpenContract }), [visibleColumns, canOpenContract]);
    /* stable props, so the memoised table and cards re-render only when what they show changes (not on each keystroke) */
    const selectedRefs = useMemo(() => selected.map((s) => s.ref), [selected]);
    const onCoverage = useCallback((v) => setFilter("coverage", v), [setFilter]);
    const onRequest = useCallback((v) => setFilter("request", v), [setFilter]);
    const onReview = useCallback((v) => setFilter("review", v), [setFilter]);
    const onChangeOwner = useCallback(() => setOwnerChange({ mode: "bulk", targets: selected.map(targetFromRow) }), [selected]);

    const toggleColumn = useCallback((id) => {
        setVisibleColumns((prev) => {
            const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
            saveColumnKeys(COLUMN_VIEW_STATE_KEYS.insurance, next);
            return next;
        });
    }, []);

    const resetColumns = useCallback((close) => {
        const defaults = configData.insuranceColumnsConfigTrans();
        saveColumnKeys(COLUMN_VIEW_STATE_KEYS.insurance, defaults);
        setVisibleColumns(defaults);
        close();
    }, []);

    const columnsMenu = useMemo(() => (
        <InsuranceMenu
            id="ins-columns"
            align="right"
            label={translation("key_ins_select_fields")}
            trigger={<><Icon name="columns" size={13} /><span>{translation("key_ins_columns")}</span><span className={styles.badge}>{visibleColumns.length}</span></>}
        >
            {(close) => (
                <>
                    {configData.insuranceColumnsConfigTranslate({ translation }).map((option) => {
                        const locked = MANDATORY().includes(option.value);
                        return (
                            <MenuItem
                                key={option.value}
                                role="menuitemcheckbox"
                                checked={locked || visibleColumns.includes(option.value)}
                                disabled={locked}
                                onSelect={() => toggleColumn(option.value)}
                                trailing={locked ? <span className={styles.always}>{translation("key_ins_always_shown")}</span> : null}
                            >
                                {option.label}
                            </MenuItem>
                        );
                    })}
                    <div className={styles.menuSep} />
                    <MenuItem onSelect={() => resetColumns(close)}>{translation("key_ins_reset_columns")}</MenuItem>
                </>
            )}
        </InsuranceMenu>
    ), [visibleColumns, toggleColumn, resetColumns]);

    const openRecord = useCallback((row) => {
        if (!meta?.caps?.detailsView) {
            ShowToast("error", translation("key_ins_cannot_open"));
            return;
        }
        markReturn(row.ref);
        navigate(routes.insuranceRecord.replace(":ref", row.ref));
    }, [markReturn, meta, navigate]);

    /* a bulk or portfolio change ends on the Handover result */
    const handleOwnerChanged = useCallback((result) => {
        setOwnerChange(null);
        setSelected([]);
        if (result) setHandover(result);
        refresh();
    }, [refresh]);

    const goPrev = useCallback(() => {
        if (currentPage > 1) setPage(currentPage - 1);
    }, [currentPage, setPage]);
    const goNext = useCallback(() => {
        if (currentPage < lastPage) setPage(currentPage + 1);
    }, [currentPage, lastPage, setPage]);

    const header = (actions) => (
        <div className={`${listStyles.pageHeader} ${styles.pageHead}`}>
            <div className={listStyles.pageHeaderBody}>
                <h1 className={styles.title}>{translation("key_insurance")}</h1>
            </div>
            {actions}
        </div>
    );

    if (metaStatus === "failed") {
        return (
            <div className={`${listStyles.pageWrap} ${styles.pageWrapIns}`}>
                {header(null)}
                <div className={styles.notice}>
                    {translation("key_couldnt_load_this_view")}
                </div>
            </div>
        );
    }
    if (!meta) return <div className={`${listStyles.pageWrap} ${styles.pageWrapIns}`}>{header(null)}<CustomSpinner /></div>;
    if (!meta.access) {
        return (
            <div className={`${listStyles.pageWrap} ${styles.pageWrapIns}`}>
                {header(null)}
                <div className={styles.notice} role="status">{translation("key_ins_not_available")}</div>
            </div>
        );
    }

    const bulk = Boolean(meta.caps?.bulkChangeOwner && meta.caps?.changeOwner);

    return (
        <div className={`${listStyles.pageWrap} ${styles.pageWrapIns}`}>
            {header(bulk || meta.caps?.addNewInsurance ? (
                <div className={listStyles.pageHeaderActions}>
                    {bulk && (
                        <InsuranceMenu id="ins-admin" align="right" trigger={<span>{translation("key_ins_group_admin")}</span>}>
                            {(close) => <MenuItem onSelect={() => { close(); setPortfolioOpen(true); }}>{translation("key_ins_portfolio_handover")}</MenuItem>}
                        </InsuranceMenu>
                    )}
                    {meta.caps?.addNewInsurance && (
                        <Btn variant="primary" onClick={() => navigate(routes.insuranceNew)}>
                            <Icon name="plus" size={13} /> {translation("key_ins_new_insurance")}
                        </Btn>
                    )}
                </div>
            ) : null)}

            <InsuranceSummary
                cards={records.cards}
                work={records.work}
                restricted={records.restricted}
                coverage={filters.coverage}
                request={filters.request}
                review={filters.review}
                onCoverage={onCoverage}
                onRequest={onRequest}
                onReview={onReview}
            />

            <InsuranceFilterBar
                meta={meta}
                filters={filters}
                searchInput={dashboard.searchInput}
                isFiltered={dashboard.isFiltered}
                columnsMenu={columnsMenu}
                onSearchChange={dashboard.onSearchChange}
                onFilterChange={dashboard.setFilter}
                onClear={dashboard.clearFilters}
            />

            <InsuranceRecordsTable
                columns={columns}
                records={records}
                isLoading={dashboard.isLoading}
                error={dashboard.error}
                sort={filters.sort}
                pageInfo={dashboard.pageInfo}
                selectable={bulk}
                selectedRefs={selectedRefs}
                onSort={dashboard.setSort}
                onRowOpen={openRecord}
                onSelect={select}
                onChangeOwner={onChangeOwner}
                onPrev={goPrev}
                onNext={goNext}
                onLimitChange={dashboard.setLimit}
                onRetry={dashboard.refresh}
                returnTo={dashboard.returnTo}
                onReturned={dashboard.returned}
            />

            <Suspense fallback={null}>
                {portfolioOpen && (
                    <PortfolioHandoverDialog
                        onClose={() => setPortfolioOpen(false)}
                        onContinue={({ ownerId, records: set }) => { setPortfolioOpen(false); setOwnerChange({ mode: "portfolio", targets: set, ownerId }); }}
                    />
                )}
                {ownerChange && (
                    <ChangeOwnerDialog
                        mode={ownerChange.mode}
                        targets={ownerChange.targets}
                        portfolioOwnerId={ownerChange.ownerId}
                        onClose={() => setOwnerChange(null)}
                        onDone={handleOwnerChanged}
                    />
                )}
                {handover && <HandoverResultDialog result={handover} onClose={() => setHandover(null)} />}
            </Suspense>
        </div>
    );
};

export default InsuranceDashboardPage;
