import React, { useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import "./remarks.css";
import Icon from "../Icon/Icon";
import { ShowToast } from "../../components/show-toast/ShowToast";
const AddRemarksPopup = React.lazy(() => import("./AddRemarksPopup"));
const ConfirmApproval = React.lazy(() => import("../Layout/popups/confirm-approval/ConfirmApproval"));
const NotFoundMessage = React.lazy(() => import("../ReusableComponents/NotFoundMessage"));
const CustomSpinner = React.lazy(() => import("../ReusableComponents/CustomSpinner"));

import {
    deleteEmployerRemark,
    deleteProcessingRemark,
    deleteWorkerRemark,
    fetchEmployerRemarks,
    fetchProcessingRemarks,
    fetchWorkerRemarks,
    fetchInvoiceRemarks,
    deleteInvoiceRemark,
} from "../../redux/Slices/remarks/RemarkSlice";
import { getCurrentUser, hasAnyModulePermission, isAdminUser } from "../../services/commonService";
import constData from "../ReusableComponents/constants";
import translation from "../../utils/translation";
import { INVOICE_REMARKS_PERMISSION_KEYS } from "../../utils/permissions/invoiceActionPermissionUtils";

/* PK-01 P1-19 (register #82): an invoice remark is edited or deleted only by a holder of invoice_remarks, as the contract API checks */
const remarkKeysOf = (entityType) => (entityType === "invoice" ? INVOICE_REMARKS_PERMISSION_KEYS : constData.REMARKS_PERMISSION_KEYS[entityType]);

/* Employer, Worker, Processing and Invoice remarks. Insurance remarks have their own drawer (Insurance record, PROMPT 7). */
const Remarks = ({ isAddRemarksPopup, handleOnCloseAddRemarks, entityId, entityType, dateFormat = "DD MMM, YYYY [at] hh:mm A" }) => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();

    const { permissionList } = useSelector((state) => state.users);
    const {
        employerRemarks,
        workerRemarks,
        processingRemarks,
        invoiceRemarks,
    } = useSelector((state) => state.remarks);

    const canManageOwnRemarks =
        isAdminUser() ||
        !remarkKeysOf(entityType) ||
        hasAnyModulePermission(permissionList?.data, remarkKeysOf(entityType));

    const canUpdateOthersRemarks =
        isAdminUser() ||
        hasAnyModulePermission(permissionList?.data, constData.REMARKS_UPDATE_ELSE_PERMISSION_KEYS[entityType]);

    const [selectedRemark, setSelectedRemark] = useState(null);
    const [isConfirmPopup, setIsConfirmPopup] = useState(false);
    const [remarksId, setRemarksId] = useState(null);

    // ------------ Query Config -------------
    const fetchRemarksFn = async () => {
        if (!entityId) return;
        if (entityType === "employer") return dispatch(fetchEmployerRemarks({ employer_id: entityId })).unwrap();
        if (entityType === "worker") return dispatch(fetchWorkerRemarks({ worker_id: entityId, module_key: entityType })).unwrap();
        if (entityType === "processing") return dispatch(fetchProcessingRemarks({ contract_id: entityId })).unwrap();
        if (entityType === "invoice") return dispatch(fetchInvoiceRemarks({ invoice_id: entityId })).unwrap();
    };

    const { isLoading } = useQuery({
        queryKey: ["remarks", entityType, entityId],
        queryFn: fetchRemarksFn,
        enabled: !!entityId, // only run when entityId exists
        refetchOnWindowFocus: false
    });

    // Select remarks list based on entity type
    let remarksList =
        entityType === "employer"
            ? employerRemarks
            : entityType === "worker"
                ? workerRemarks
                : entityType === "invoice"
                    ? invoiceRemarks
                    : processingRemarks;

    remarksList = [...(remarksList || [])].sort((a, b) => b.id - a.id);

    // ------------ Delete Mutation -------------
    const deleteFn = async () => {
        if (entityType === "employer") return dispatch(deleteEmployerRemark({ remark_id: remarksId })).unwrap();
        if (entityType === "worker") return dispatch(deleteWorkerRemark({ remark_id: remarksId, worker_id: entityId, module_key: entityType })).unwrap();
        if (entityType === "processing") return dispatch(deleteProcessingRemark({ remark_id: remarksId, contract_id: entityId })).unwrap();
        if (entityType === "invoice") return dispatch(deleteInvoiceRemark({ remark_id: remarksId })).unwrap();
    };

    const deleteRemarkMutation = useMutation({
        mutationFn: deleteFn,
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["remarks", entityType, entityId] }); // refresh list
            ShowToast('success', res.message);
            setIsConfirmPopup(false);
            setRemarksId(null);
        }
    });

    const handleDeleteConfirm = () => {
        deleteRemarkMutation.mutate();
    };

    return (
        <div className="remarks-wrapper">
            {/* Add popup */ }
            { isAddRemarksPopup && (
                <AddRemarksPopup
                    entityId={ entityId }
                    entityType={ entityType }
                    onClose={ () => {
                        handleOnCloseAddRemarks(false);
                        setSelectedRemark(null);  
                    }}
                    initialData={ selectedRemark }
                    updateInitialData={ (data) => setSelectedRemark(data) }
                />
            ) }

            {/* Delete confirm popup */ }
            { isConfirmPopup && (
                <ConfirmApproval
                    handleConfirmation={ handleDeleteConfirm }
                    onClose={ () => setIsConfirmPopup(false) }
                    title={ translation("key_confirm_delete") }
                    description="Are you sure you want to delete this remark?"
                />
            ) }

            <div className="remarks-list">
                { isLoading ? (
                    <CustomSpinner />
                ) : remarksList?.length ? (
                    remarksList.map((remark) => {
                        const isEndorsement = remark?.category === "endorsement";
                        const isAuthor =
                            getCurrentUser().data?.id === remark?.remarks_by ||
                            getCurrentUser().data?.id === remark?.updated_by;
                        /* 10 Nov package (remarks F1 / WDAC-C01, supersedes C15 §2.3/§6.1 and CHT #40): there is NO
                           edit/delete time window — authors keep edit/delete while record access and the Remarks
                           write permission allow; every countdown/lock UI is removed */
                        const canEditOrDelete = !isEndorsement && ((isAuthor && canManageOwnRemarks) || canUpdateOthersRemarks);

                        return (
                            <div className="remarks-block" key={ remark.id }>
                                <div className="d-flex justify-content-between">
                                    <h6>
                                        { remark?.remarksby_info || remark?.remarks_by_name }
                                    </h6>
                                    <span className="grey fz14">
                                        { dayjs(remark.created_at).format(dateFormat) }
                                    </span>
                                </div>

                                <p className="grey mb-0">{ remark.remarks }</p>

                                { canEditOrDelete && (
                                    <div className="remark-actions mb-1">
                                        <Link className="remark-act del" title={ translation('key_delete') } onClick={ () => { setRemarksId(remark.id); setIsConfirmPopup(true); } }>
                                            <Icon name="trash" size={ 14 } />
                                        </Link>
                                        <Link className="remark-act edit" title={ translation('key_edit') } onClick={ () => {
                                            setSelectedRemark(remark);
                                            handleOnCloseAddRemarks(true);
                                        } }>
                                            <Icon name="edit" size={ 14 } />
                                        </Link>
                                    </div>
                                ) }
                            </div>
                        );
                    })
                ) : (
                    <NotFoundMessage message={ translation("key_remarks") } paddingClass="p-3" />
                ) }
            </div>
        </div>
    );
};

Remarks.propTypes = {
    isAddRemarksPopup: PropTypes.bool.isRequired,
    handleOnCloseAddRemarks: PropTypes.func.isRequired,
    entityType: PropTypes.string.isRequired,
    entityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    dateFormat: PropTypes.string,
};

export default Remarks;
