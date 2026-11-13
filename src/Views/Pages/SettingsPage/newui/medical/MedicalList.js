import React, { useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Btn from "../../../../../components/ui/Btn";
import DataTable from "../../../../../components/ui/DataTable";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import { useConfigurationPermissions } from "../../../../../utils/permissions/configurationPermissionUtils";
import { fetchMedicalList } from "../../../../../redux/Slices/settings/medical/MedicalSlice";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import useSettingsList from "../useSettingsList";
import { buildSortedListPayload } from "../settingsListConfig";
import { DEFAULT_MEDICAL_FILTERS, MEDICAL_VIEW_STATE_KEY } from "../settingsNewUiConstants";
import { getMedicalListColumns } from "./medicalListColumns";
import LastRefresh from "../LastRefresh";

const selectMedicalList = (state) => ({
    rows: Array.isArray(state.medical.medicalList) ? state.medical.medicalList : [],
    totalPages: state.medical.totalPages,
    total: state.medical.totalCount,
    lastUpdated: state.medical.lastUpdate,
});

/* Legacy medical list sends sort_order as ASC/DESC (uppercase). */
const buildMedicalPayload = (filters) => {
    const payload = buildSortedListPayload(filters);
    if (payload.sort_order) payload.sort_order = payload.sort_order.toUpperCase();
    return payload;
};

const editClinicPath = (row) => `${absoluteRoute(routes.addMedicalClinic)}?id=${encodeURIComponent(row?.id)}`;

const MedicalList = () => {
    const navigate = useNavigate();
    const { permissionList } = useSelector((state) => state.users);
    const { canViewMedicalClinic, canEditMedicalClinic } = useConfigurationPermissions(permissionList);

    const fetchAction = useCallback((payload) => fetchMedicalList(payload), []);
    const list = useSettingsList({
        viewStateKey: MEDICAL_VIEW_STATE_KEY,
        fetchAction,
        selectList: selectMedicalList,
        defaultFilters: DEFAULT_MEDICAL_FILTERS,
        buildPayload: buildMedicalPayload,
    });

    const openEdit = useCallback((row) => {
        if (canEditMedicalClinic && row?.id != null) navigate(editClinicPath(row));
    }, [canEditMedicalClinic, navigate]);

    const columns = useMemo(
        () => getMedicalListColumns({ canEdit: Boolean(canEditMedicalClinic), onEdit: openEdit }),
        [canEditMedicalClinic, openEdit]
    );

    const goPrev = useCallback(() => list.setPage(list.pageInfo.currentPage - 1), [list]);
    const goNext = useCallback(() => list.setPage(list.pageInfo.currentPage + 1), [list]);

    if (!canViewMedicalClinic) {
        return <div className={shared.notAuthorized}>{translation("key_you_are_not_authorized_to_access_this_page")}</div>;
    }

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.settings)}>{headingCase(translation("key_settings"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{headingCase(translation("key_medical_clinic"))}</span>
            </nav>

            <div className={listStyles.pageHeader}>
                <div className={listStyles.pageHeaderBody}>
                    <h1 className={listStyles.pageTitle}>{headingCase(translation("key_medical_clinic"))}</h1>
                    <LastRefresh value={list.lastUpdated} />
                </div>
                {canEditMedicalClinic && (
                    <div className={listStyles.pageHeaderActions}>
                        <Btn variant="primary" as={Link} to={absoluteRoute(routes.addMedicalClinic)}>
                            <Icon name="plus" size={14} /> {translation("key_add")} {translation("key_medical_clinic")}
                        </Btn>
                    </div>
                )}
            </div>

            <DataTable
                columns={columns}
                rows={list.rows}
                rowKey="id"
                isLoading={list.isLoading}
                error={list.error}
                sortBy={list.filters.sort_by}
                sortOrder={list.filters.sort_order}
                pageInfo={list.pageInfo}
                unitLabel={translation("key_medical_clinic").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={list.setSort}
                onRowClick={canEditMedicalClinic ? openEdit : undefined}
                onPrev={goPrev}
                onNext={goNext}
                onLimitChange={list.setLimit}
                onRetry={list.refresh}
            />
        </div>
    );
};

export default MedicalList;
