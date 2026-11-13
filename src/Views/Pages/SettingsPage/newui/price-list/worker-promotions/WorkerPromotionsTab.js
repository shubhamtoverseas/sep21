import React, { useMemo } from "react";
import Btn from "../../../../../../components/ui/Btn";
import DataTable from "../../../../../../components/ui/DataTable";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import useWorkerPromotionList from "./useWorkerPromotionList";
import WorkerPromotionFormModal from "./WorkerPromotionFormModal";
import { getWorkerPromotionColumns } from "./workerPromotionColumns";
import { headingCase } from "../../../../../../utils/utils";

/** Ports WorkerPromotionsTab.js — sortable, paged worker promotion list + add/edit modal. */
const WorkerPromotionsTab = () => {
    const list = useWorkerPromotionList();
    const columns = useMemo(() => getWorkerPromotionColumns({ canEdit: list.canEditPrice, onEdit: list.openEdit }), [list.canEditPrice, list.openEdit]);

    return (
        <div className={shared.card}>
            <div className={`${shared.cardHead} ${shared.cardHeadRow}`}>
                <h2 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{headingCase(translation("key_worker_promotions"))}</h2>
                {list.canEditPrice && (
                    <div className={shared.cardHeadActions}>
                        <Btn variant="primary" type="button" onClick={list.openAdd}>
                            <Icon name="plus" size={14} /> {translation("key_add")}
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
                unitLabel={translation("key_worker_promotions").toLowerCase()}
                emptyText={translation("key_no_records_found")}
                onSort={list.sortTable}
                onPrev={list.handlePrevClick}
                onNext={list.handleNextClick}
                onLimitChange={list.handlePerPageChange}
                onRetry={list.handleRefresh}
            />

            {list.isFormOpen && (
                <WorkerPromotionFormModal currentWorkerPromotion={list.currentWorkerPromotion} onClose={list.closeForm} />
            )}
        </div>
    );
};

export default WorkerPromotionsTab;
