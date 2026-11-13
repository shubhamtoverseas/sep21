import React, { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import DataTable from "../../../../../components/ui/DataTable";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase, toTitleCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import { useSettingsPermissions } from "../../../../../utils/permissions/settingsPermissionsUtils";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import useAgencyList from "./useAgencyList";
import SettingsListFilters from "../SettingsListFilters";
import { getAgencyListColumns } from "./agencyListColumns";
import LastRefresh from "../LastRefresh";

const addAgencyPath = () => `/${routes.addAgency}`;
const editAgencyPath = (row) => `/${routes.addAgency}?id=${encodeURIComponent(row?.id)}`;

const AgencyList = () => {
    const navigate = useNavigate();
    const { permissionList } = useSelector((state) => state.users);
    const { canEditAgency, canViewAgency } = useSettingsPermissions(permissionList);

    const list = useAgencyList();

    const openEdit = useCallback((row) => {
        if (canEditAgency && row?.id != null) navigate(editAgencyPath(row));
    }, [canEditAgency, navigate]);

    const columns = useMemo(
        () => getAgencyListColumns({ canEdit: Boolean(canEditAgency), onEdit: openEdit }),
        [canEditAgency, openEdit]
    );

    const goPrev = useCallback(() => list.setPage(list.pageInfo.currentPage - 1), [list]);
    const goNext = useCallback(() => list.setPage(list.pageInfo.currentPage + 1), [list]);

    if (!canViewAgency) {
        return <div className={shared.notAuthorized}>{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{toTitleCase(translation("key_agencies"))}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{toTitleCase(translation("key_agencies"))}</h1>
                    <LastRefresh value={list.lastUpdated} />
                </div>
                {canEditAgency && (
                    <div className={listStyles.pageHeaderActions}>
                        <Btn variant="primary" as={Link} to={addAgencyPath()}>
                            <Icon name="plus" size={14} /> {translation("key_add_agency")}
                        </Btn>
                    </div>
                )}
            </div>

            <SettingsListFilters
                id="agency"
                filters={list.filters}
                searchInput={list.searchInput}
                isFiltered={list.isFiltered}
                onSearchChange={list.onSearchChange}
                onFilterChange={list.setFilter}
                onClear={list.clearFilters}
            />

            <DataTable
                columns={columns}
                rows={list.rows}
                rowKey="id"
                isLoading={list.isLoading}
                error={list.error}
                sortBy={list.filters.sort_by}
                sortOrder={list.filters.sort_order}
                pageInfo={list.pageInfo}
                unitLabel={translation("key_agencies").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={list.setSort}
                onRowClick={canEditAgency ? openEdit : undefined}
                onPrev={goPrev}
                onNext={goNext}
                onLimitChange={list.setLimit}
                onRetry={list.refresh}
            />
        </div>
    );
};

export default AgencyList;
