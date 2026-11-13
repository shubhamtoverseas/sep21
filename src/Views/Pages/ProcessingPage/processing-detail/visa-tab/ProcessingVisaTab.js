import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import translation from "../../../../../utils/translation";
import { headingCase } from "../../../../../utils/utils";
import { SubTabs } from "../../../../../components/Processing/newui/StagePanel";
import { stageToken } from "../../../../../components/Processing/StageTitle";
import AuthorizationLetterTab from "./authorization-letter/AuthorizationLetterTab";
import EVisaTab from "./e-visa/EVisaTab";

const SUB = Object.freeze({ AUTH: "e-registration", EVISA: "e-visa" });

/** Visa stage (Groups 1 / 3 / 4; prototype visaSubTabs): Authorization Letter · E-Visa pills, one panel for the selected sub-stage. */
const ProcessingVisaTab = ({ contractDetails, stageActionPermission, activityLogList, reloadGlobalActivityList, onFetchProcessingTabActivities }) => {
    const [active, setActive] = useState(SUB.AUTH);
    const { visaDocument } = useSelector((state) => state.processing);

    useEffect(() => { onFetchProcessingTabActivities(active === SUB.AUTH ? "authorization_letter" : "evisa"); }, [active, onFetchProcessingTabActivities]);

    const tabs = useMemo(() => [
        { key: SUB.AUTH, label: translation("key_authorization_letter"), tone: stageToken("authorization_letter", visaDocument?.authorization_letter_status).tone },
        { key: SUB.EVISA, label: translation("key_e_visa"), tone: stageToken("e_visa", visaDocument?.e_visa_status).tone },
    ], [visaDocument?.authorization_letter_status, visaDocument?.e_visa_status]);

    const shared = { contractDetails, stageActionPermission, activityLogList, reloadGlobalActivityList, onFetchProcessingTabActivities };
    return (
        <div className="g1-stack">
            <SubTabs tabs={ tabs } active={ active } onSelect={ setActive } ariaLabel={ headingCase(translation("key_visa")) } />
            { active === SUB.AUTH ? <AuthorizationLetterTab { ...shared } isActive /> : <EVisaTab { ...shared } isActive /> }
        </div>
    );
};

ProcessingVisaTab.propTypes = {
    contractDetails: PropTypes.object.isRequired,
    stageActionPermission: PropTypes.array,
    activityLogList: PropTypes.array,
    reloadGlobalActivityList: PropTypes.func,
    onFetchProcessingTabActivities: PropTypes.func,
};

export default React.memo(ProcessingVisaTab);
