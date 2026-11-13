import React, { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import "./contract.css";
import ContractsDashboard from "./dashboard/ContractsDashboard";
import { fetchMappingBranches } from "../../../redux/Slices/settings/branches/BranchesSlice";
import { fetchWorkerReferenceIdInitials } from "../../../redux/Slices/worker/WorkerSlice";
import routes from "../routes/routesConfig";

/*
 * /contracts — the Contracts dashboard (prototype Contracts_Dashboard.html; CT-01) with the PAOS roster (CT-06) as its
 * one secondary view. The route is gated by the Contract Global Screen key (contractRoutes); the retired Processing
 * list redirects here (10 Oct workbook Contract #1).
 */
const Contract = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { mappingBranches, workerRefIdInitials } = useSelector((state) => ({
        mappingBranches: state.branches.mappingBranches,
        workerRefIdInitials: state.worker.workerRefIdInitials,
    }), shallowEqual);

    useEffect(() => {
        if (!workerRefIdInitials.length) dispatch(fetchWorkerReferenceIdInitials());
        /* always: `branches.mappingBranches` is shared and may hold another screen's (country-filtered) list (work order 27 Oct) */
        dispatch(fetchMappingBranches({ module_key: 'processing' }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openContract = useCallback((contractId) => { navigate(routes.contractDetails.replace(':contract_id', contractId)); }, [navigate]);

    return (
        <div className="centerContent greyBg coverpage_space jo-page">
            <div className="tableBox bg-transparent">
                <ContractsDashboard onOpenContract={ openContract } mappingBranches={ mappingBranches } workerRefIdInitials={ workerRefIdInitials } />
            </div>
        </div>
    );
};

export default React.memo(Contract);
