import React, { useCallback, useState } from "react";
import OverseasOverview from "./OverseasOverview";
import AgencySchedule from "./AgencySchedule";
import { useFrameLink } from "../shared/priceListFrame";
import { PRICE_LIST_PAGE } from "../../settingsNewUiConstants";

/*
 * Price List · Overseas (27 Oct package, PL-S3 / PL-S4): the overview of nationality bases and partner agencies, and each
 * agency's schedule opened from its code. Returning to the overview reloads it, so each agency's status is current.
 */
const OverseasPricingSection = () => {
    const [agencyId, setAgencyId] = useState(null);
    const onOpenPricingCountries = useFrameLink(PRICE_LIST_PAGE.COUNTRIES);
    const back = useCallback(() => setAgencyId(null), []);
    if (agencyId != null) {
        return (
            <AgencySchedule
                key={agencyId}
                agencyId={agencyId}
                onBack={back}
                onSwitch={setAgencyId}
                onOpenPricingCountries={onOpenPricingCountries}
            />
        );
    }
    return <OverseasOverview onOpenAgency={setAgencyId} />;
};

export default OverseasPricingSection;
