import React, { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Btn from "../../../../../components/ui/Btn";
import ConfirmModal from "../../../../../components/ui/ConfirmModal";
import DataTable from "../../../../../components/ui/DataTable";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import usePromptManagerList from "./usePromptManagerList";
import { getPromptManagerColumns } from "./promptManagerColumns";
import LastRefresh from "../LastRefresh";
import shared from "../settings-newui.module.css";
import { useConfigurationPermissions } from "../../../../../utils/permissions/configurationPermissionUtils";

const editPromptPath = (row) => `${absoluteRoute(routes.newPromptTemplate)}?id=${encodeURIComponent(row?.id)}`;

/** Ports PromptManager.js — list with active toggle, edit link and delete confirm. */
const PromptManagerList = () => {
    const navigate = useNavigate();
    const list = usePromptManagerList();
    const { permissionList } = useSelector((state) => state.users);
    /* R-SET-1 (owner 5 Nov): New, the active toggle, edit and delete for a holder of Edit Prompt Manager */
    const { canEditPromptManager } = useConfigurationPermissions(permissionList);

    const openEdit = useCallback((row) => { if (row?.id != null) navigate(editPromptPath(row)); }, [navigate]);

    const columns = useMemo(
        () => getPromptManagerColumns({ onToggle: list.handleToggleStatus, onEdit: openEdit, onDelete: list.requestDelete })
            .filter((column) => canEditPromptManager || column.key !== "actions"),
        [list.handleToggleStatus, openEdit, list.requestDelete, canEditPromptManager]
    );

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{headingCase(translation("key_prompt_manager"))}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{headingCase(translation("key_prompt_manager"))}</h1>
                    <LastRefresh value={list.lastUpdate} />
                </div>
                {canEditPromptManager && (
                    <div className={listStyles.pageHeaderActions}>
                        <Btn variant="primary" as={Link} to={absoluteRoute(routes.newPromptTemplate)}>
                            <Icon name="plus" size={14} /> {translation("key_new_prompt")}
                        </Btn>
                    </div>
                )}
            </div>

            <DataTable
                columns={columns}
                rows={list.rows}
                rowKey="id"
                isLoading={list.isLoading}
                sortBy={list.sort.sort}
                sortOrder={list.sort.order.toLowerCase()}
                pageInfo={list.pageInfo}
                unitLabel={translation("key_prompt_manager").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={list.sortTable}
                onPrev={list.handlePrevClick}
                onNext={list.handleNextClick}
                onLimitChange={list.handlePerPageChange}
                onRetry={list.handleRefresh}
            />

            {list.deletingId != null && (
                <ConfirmModal
                    title={headingCase(translation("key_confirm_delete"))}
                    body={`${translation("key_are_you_sure_you_want_to_delete")}?`}
                    danger
                    onConfirm={list.confirmDelete}
                    onClose={list.cancelDelete}
                />
            )}
        </div>
    );
};

export default PromptManagerList;
