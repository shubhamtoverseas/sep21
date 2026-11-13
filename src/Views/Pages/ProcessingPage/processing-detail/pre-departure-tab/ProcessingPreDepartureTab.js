import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import translation from "../../../../../utils/translation";
import { fetchProcessingActivityLog, preDepartureDocumentView, preDepartureMedicalDocChangeStatus, preDepartureMedicalDocStatusList, preDepartureOtherDocChangeStatus, preDepartureOtherDocStatusList } from "../../../../../redux/Slices/processing/ProcessingSlice";
import { fetchContractDetailsById } from "../../../../../redux/Slices/contract/ContractSlice";
import { showSuccessOrError } from "../../../../../services/commonService";
import { SubTabs } from "../../../../../components/Processing/newui/StagePanel";
import PreDeparturePanel from "./PreDeparturePanel";
import { PRE_DEPARTURE_SUBS } from "../../processingConstants";

/**
 * Pre-Departure stage (Group 2; prototype pdSubTabs + preDeparturePanel): the seven sub-stage pills (dot green when the
 * worker answered Yes) and one panel for the selected sub-stage. Each sub-stage keeps its own status list and status
 * command as the API records them (Medical has its own endpoints).
 */
const ProcessingPreDepartureTab = ({ stageActionPermission, reloadGlobalActivityList }) => {
    const dispatch = useDispatch();
    const { contract_id } = useParams();
    const [active, setActive] = useState(PRE_DEPARTURE_SUBS[0].key);
    const [statusLists, setStatusLists] = useState({});
    /* per sub-stage: the message of a failed status-list request — the menu then says why it is empty instead of "No options"
       (Priyanka 23 Oct: before the processing-API deploy these routes answered 401 to every non-admin) */
    const [statusErrors, setStatusErrors] = useState({});
    const { preDepartureDocument, preDepartureMedicalDocStatuses } = useSelector((state) => state.processing);
    const doc = useMemo(() => preDepartureDocument || {}, [preDepartureDocument]);

    const loadActivity = useCallback(() => dispatch(fetchProcessingActivityLog({ contract_id, type: `predeparture_${ active }` })), [dispatch, contract_id, active]);
    useEffect(() => { loadActivity(); }, [loadActivity]);
    const loadStatusList = useCallback((key) => {
        const call = key === "medical" ? preDepartureMedicalDocStatusList(contract_id) : preDepartureOtherDocStatusList({ id: contract_id, type: key });
        return dispatch(call).then((res) => {
            setStatusErrors((e) => ({ ...e, [key]: res?.error ? (res?.payload?.message || translation("key_something_went_wrong")) : null }));
            if (!res?.error && key !== "medical") setStatusLists((s) => ({ ...s, [key]: res?.payload?.data }));
        });
    }, [dispatch, contract_id]);
    useEffect(() => { dispatch(preDepartureDocumentView(contract_id)); loadStatusList("medical"); }, [dispatch, contract_id, loadStatusList]);
    useEffect(() => { if (active !== "medical") loadStatusList(active); }, [active, loadStatusList]);

    /* the stage rail reads the record row (`stages[].token`), so a sub-stage change must also hand the record page its refresh
       (Mubin 29 Oct: Pre-Departure turned green only after a reload or a sub-tab round trip) */
    const refresh = useCallback(() => { dispatch(preDepartureDocumentView(contract_id)); dispatch(fetchContractDetailsById(contract_id)); loadActivity(); reloadGlobalActivityList?.(); }, [dispatch, contract_id, loadActivity, reloadGlobalActivityList]);
    const handleChangeStatus = useCallback((id) => {
        const call = active === "medical" ? preDepartureMedicalDocChangeStatus({ contract_id, status: id }) : preDepartureOtherDocChangeStatus({ contract_id, type: active, status: id });
        dispatch(call).then((res) => { showSuccessOrError(res); if (!res.error) { loadStatusList(active); refresh(); } });
    }, [active, contract_id, dispatch, loadStatusList, refresh]);

    const tabs = useMemo(() => PRE_DEPARTURE_SUBS.map((s) => ({ key: s.key, label: translation(s.labelKey), tone: doc[`${ s.field }_completed`] === "y" ? "green" : "gray" })), [doc]);
    const sub = PRE_DEPARTURE_SUBS.find((s) => s.key === active) || PRE_DEPARTURE_SUBS[0];
    const file = doc.medical_file_path && doc.medical_file ? { name: doc.medical_file, url: doc.medical_file_path, isImage: /\.(jpe?g|png|gif|webp)$/i.test(doc.medical_file) } : null;

    return (
        <div className="g1-stack">
            <SubTabs tabs={ tabs } active={ active } onSelect={ setActive } ariaLabel={ translation("key_pre_departure") } />
            <PreDeparturePanel key={ sub.key } title={ translation(sub.labelKey) } question={ `${ translation(sub.questionKey) }${ sub.key === "medical" ? "" : "?" }` }
                done={ doc[`${ sub.field }_completed`] === "y" } status={ doc[`${ sub.field }_status`] } updatedAt={ doc[`${ sub.field }_last_status_updated_at`] } updatedBy={ doc[`${ sub.field }_last_status_updated_name`] }
                statusList={ sub.key === "medical" ? preDepartureMedicalDocStatuses : statusLists[sub.key] } statusNote={ statusErrors[sub.key] || null } onChangeStatus={ handleChangeStatus } stageActionPermission={ stageActionPermission }
                isMedical={ sub.key === "medical" } file={ file } onFileChanged={ refresh } />
        </div>
    );
};

ProcessingPreDepartureTab.propTypes = { stageActionPermission: PropTypes.array, reloadGlobalActivityList: PropTypes.func };

export default React.memo(ProcessingPreDepartureTab);
