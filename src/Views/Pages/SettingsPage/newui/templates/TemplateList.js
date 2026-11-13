import React, { useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import ConfirmModal from "../../../../../components/ui/ConfirmModal";
import DataTable from "../../../../../components/ui/DataTable";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";
import { isAdminUser } from "../../../../../services/commonService";
import routes from "../../../routes/routesConfig";
import { useConfigurationPermissions } from "../../../../../utils/permissions/configurationPermissionUtils";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import useTemplateList from "./useTemplateList";
import TemplateFilters from "./TemplateFilters";
import TemplateCategoriesView from "./TemplateCategoriesView";
import { getTemplateListColumns } from "./templateListColumns";
import LastRefresh from "../LastRefresh";
import shared from "../settings-newui.module.css";
import { SEND_TEMPLATE_MANAGER_TITLE } from "../settingsNewUiConstants";

const editTemplatePath = (row) => `${absoluteRoute(routes.addTemplate)}?id=${encodeURIComponent(row?.id)}`;

/* Send Template Manager tabs: the template library, and (10 Nov 2026 package, F-16) the read-only category configuration */
const TABS = Object.freeze([
    { key: "templates", label: "key_templates" },
    { key: "categories", label: "key_st_categories" },
]);

const TemplateList = () => {
    const navigate = useNavigate();
    const { permissionList } = useSelector((state) => state.users);
    const permissions = useConfigurationPermissions(permissionList);
    const isAdmin = useMemo(() => isAdminUser(), []);
    const canAdd = isAdmin || Boolean(permissions?.canAddTemplate);
    const canEdit = isAdmin || Boolean(permissions?.canEditTemplate);
    const canDelete = isAdmin || Boolean(permissions?.canDeleteTemplate);

    const list = useTemplateList();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") === "categories" ? "categories" : "templates";
    const selectTab = useCallback((key) => setSearchParams(key === "templates" ? {} : { tab: key }, { replace: true }), [setSearchParams]);

    const openEdit = useCallback((row) => {
        if (canEdit && row?.id != null) navigate(editTemplatePath(row));
    }, [canEdit, navigate]);

    const askDelete = useCallback((row) => { if (row?.id != null) list.requestDelete(row.id); }, [list]);

    const columns = useMemo(
        () => getTemplateListColumns({ canEdit, canDelete, onEdit: openEdit, onDelete: askDelete }),
        [canEdit, canDelete, openEdit, askDelete]
    );

    const goPrev = useCallback(() => list.setPage(list.pageInfo.currentPage - 1), [list]);
    const goNext = useCallback(() => list.setPage(list.pageInfo.currentPage + 1), [list]);

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{translation(SEND_TEMPLATE_MANAGER_TITLE)}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{translation(SEND_TEMPLATE_MANAGER_TITLE)}</h1>
                    <LastRefresh value={list.lastUpdated} />
                </div>
                {canAdd && (
                    <div className={listStyles.pageHeaderActions}>
                        <Btn variant="primary" as={Link} to={absoluteRoute(routes.addTemplate)}>
                            <Icon name="plus" size={14} /> {translation("key_new_template")}
                        </Btn>
                    </div>
                )}
            </div>

            <div className={shared.tabStrip} role="tablist">
                {TABS.map((tab) => {
                    const active = tab.key === activeTab;
                    return (
                        <button key={tab.key} type="button" role="tab" aria-selected={active} className={`${shared.tabStripItem} ${active ? shared.tabStripActive : ""}`} onClick={() => selectTab(tab.key)}>
                            {translation(tab.label)}
                        </button>
                    );
                })}
            </div>

            {activeTab === "categories" ? (
                <TemplateCategoriesView moduleList={list.moduleList} />
            ) : (
                <>
                    <TemplateFilters
                        filters={list.filters}
                        moduleList={list.moduleList}
                        categoryList={list.categoryList}
                        languageList={list.languageList}
                        onSearch={list.setSearch}
                        onModule={list.setModule}
                        onCategory={list.setCategory}
                        onLanguage={list.setLanguage}
                        onClear={list.clearFilters}
                    />

                    <DataTable
                        columns={columns}
                        rows={list.rows}
                        rowKey="id"
                        isLoading={list.isLoading}
                        error={list.error}
                        sortBy={list.sort.by}
                        sortOrder={list.sort.order}
                        pageInfo={list.pageInfo}
                        unitLabel={translation("key_templates").toLowerCase()}
                        emptyText={translation("key_no_template_list_added")}
                        onSort={list.setSortKey}
                        onRowClick={canEdit ? openEdit : undefined}
                        onPrev={goPrev}
                        onNext={goNext}
                        onLimitChange={list.setLimit}
                        onRetry={list.refresh}
                    />
                </>
            )}

            {list.deletingId != null && (
                <ConfirmModal
                    title={headingCase(translation("key_confirm_delete"))}
                    body={`${translation("key_are_you_sure_you_want_to_delete")}?`}
                    danger
                    busy={list.isDeleting}
                    onConfirm={list.confirmDelete}
                    onClose={list.cancelDelete}
                />
            )}
        </div>
    );
};

export default TemplateList;
