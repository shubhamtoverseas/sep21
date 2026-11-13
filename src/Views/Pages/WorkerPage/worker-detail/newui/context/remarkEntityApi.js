import {
    fetchWorkerRemarks, addWorkerRemark, updateWorkerRemark, deleteWorkerRemark,
    fetchEmployerRemarks, addEmployerRemark, updateEmployerRemark, deleteEmployerRemark,
} from "../../../../../../redux/Slices/remarks/RemarkSlice";

/*
 * Per-entity edit policy (U-0048, 21 Oct catalogue): Worker keeps the author's indefinite edit plus the "manage another
 * author's remarks" elevation. Employer uses Employer authorship and its own time rule — the Worker indefinite edit is not
 * inherited and there is no other-author elevation for Employers. The Employer time window is still Mike's, so until it
 * lands an author's edit / delete stay unavailable (as Invoices do under an unresolved time policy) rather than invented.
 */
export const REMARK_EDIT_POLICY = Object.freeze({
    worker: Object.freeze({ authorEdit: true, othersGrant: true }),
    employer: Object.freeze({ authorEdit: false, othersGrant: false }),
});

const REMARK_ENTITY_API = {
    worker: {
        select: (state) => state.remarks.workerRemarks,
        selectHostHidden: (state) => state.remarks.workerHostRemarksHidden,
        fetch: (id) => fetchWorkerRemarks({ worker_id: id, module_key: 'worker' }),
        add: (id, remarks) => addWorkerRemark({ remarks, worker_id: id, module_key: 'worker' }),
        update: (id, remarks, remarkId) => updateWorkerRemark({ remarks, worker_id: id, remark_id: remarkId, module_key: 'worker' }),
        remove: (id, remarkId) => deleteWorkerRemark({ remark_id: remarkId, worker_id: id, module_key: 'worker' }),
        composerLabelKey: 'key_add_a_worker_remark',
        editPolicy: REMARK_EDIT_POLICY.worker,
    },
    employer: {
        select: (state) => state.remarks.employerRemarks,
        fetch: (id) => fetchEmployerRemarks({ employer_id: id }),
        add: (id, remarks) => addEmployerRemark({ remarks, employer_id: id }),
        update: (id, remarks, remarkId) => updateEmployerRemark({ remarks, employer_id: id, remark_id: remarkId }),
        remove: (id, remarkId) => deleteEmployerRemark({ remark_id: remarkId }),
        composerLabelKey: 'key_add_an_employer_remark',
        editPolicy: REMARK_EDIT_POLICY.employer,
    },
};

export const getRemarkEntityApi = (entityType) => REMARK_ENTITY_API[entityType] || REMARK_ENTITY_API.worker;
