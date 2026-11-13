import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import DataTable from "../../../../../components/ui/DataTable";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";
import { isAdminUser } from "../../../../../services/commonService";
import routes from "../../../routes/routesConfig";
import { useConfigurationPermissions } from "../../../../../utils/permissions/configurationPermissionUtils";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import LastRefresh from "../LastRefresh";
import { TASK_TEMPLATE_COPY } from "../settingsNewUiConstants";
import useTaskTemplateManager from "./useTaskTemplateManager";
import TaskTemplateFormModal from "./TaskTemplateFormModal";
import { getTaskTemplateColumns } from "./taskTemplateColumns";

/*
 * Settings → Configuration → Task Template Manager (conflict sheet U-0011 / U-0012): the agency's shared task titles
 * (English + Traditional Chinese) with status, Add New, and Edit with the Active / Retired toggle. Reads and writes the
 * HRMS task-template API (spec A8 / A9 / A10).
 * @migration-unspecified(settings/task-templates): the sheet names a NEW permission "Task Template Manager" whose key
 * is `task_template_manager` (Configuration panel, y/n — backend 14 Oct): it opens the page and allows managing;
 * admin / sub-admin always.
 */
const TaskTemplateList = () => {
    const { permissionList } = useSelector((state) => state.users);
    const permissions = useConfigurationPermissions(permissionList);
    const isAdmin = useMemo(() => isAdminUser(), []);
    const canView = isAdmin || Boolean(permissions?.canTaskTemplateManager);
    const canManage = canView;

    const manager = useTaskTemplateManager();
    const columns = useMemo(() => getTaskTemplateColumns({ canManage, onEdit: manager.openEdit }), [canManage, manager.openEdit]);

    if (!canView) {
        return <div className={shared.notAuthorized}>{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{TASK_TEMPLATE_COPY.title}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{TASK_TEMPLATE_COPY.title}</h1>
                    <LastRefresh value={manager.lastUpdated} />
                </div>
                {canManage && (
                    <div className={listStyles.pageHeaderActions}>
                        <Btn variant="primary" onClick={manager.openNew}>
                            <Icon name="plus" size={14} /> {TASK_TEMPLATE_COPY.addNew}
                        </Btn>
                    </div>
                )}
            </div>

            <DataTable
                columns={columns}
                rows={manager.rows}
                rowKey="id"
                isLoading={manager.isLoading}
                error={manager.error}
                sortBy={manager.sort.by}
                sortOrder={manager.sort.order}
                pageInfo={manager.pageInfo}
                unitLabel={TASK_TEMPLATE_COPY.unit}
                emptyText={translation("key_no_records_found")}
                onSort={manager.setSortKey}
                onRowClick={canManage ? manager.openEdit : undefined}
                onRetry={manager.refresh}
            />

            {manager.editing && (
                <TaskTemplateFormModal
                    key={manager.editing.id ?? "new"}
                    template={manager.editing}
                    onSave={manager.save}
                    onClose={manager.closeForm}
                    isSaving={manager.isSaving}
                    formError={manager.formError}
                />
            )}
        </div>
    );
};

export default TaskTemplateList;
