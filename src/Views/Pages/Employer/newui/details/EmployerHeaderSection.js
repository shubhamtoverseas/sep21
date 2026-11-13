import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import WorkerIdentityHeader from "../../../WorkerPage/worker-detail/newui/WorkerIdentityHeader";
import RemoveOrBanEmployer from "../../../../../components/Layout/popups/remove-or-ban-employer/RemoveOrBanEmployer";
import translation from "../../../../../utils/translation";
import { getEngagementKind } from "../../../../../services/commonService";
import { EMPLOYER_BAN_COPY } from "../employerNewUiConstants";
import { primaryLanguageLabel } from "../usePrimaryLanguages";
import {
    ACTIVE_EMPLOYER_STATUS,
    EMPLOYER_ENGAGEMENT_HEADER,
    employerDisplayName,
    formatPhone,
} from "./employerDetailsConfig";

/* U-0036 (21 Oct, backend 332): an Employer has no owner — ownership engines are Job Offer · Contract · Invoice · Insurance
   (DASH §1.2). The header carries no Owners chip and no Change CS Owner action; `employers.cs_owner_id` is only the default
   owner of the employer's NEXT Job Offer and is never shown or changed here. */
const EmployerHeaderSection = ({ employer, employerId, onEdit, showContacts = true, canBan = false, canRestore = false, tabs, activeTab, onSelectTab }) => {
    const [isBanOpen, setIsBanOpen] = useState(false);

    const isActive = employer?.status === ACTIVE_EMPLOYER_STATUS;

    /* U-0046 (21 Oct): Ban and Restore are two separate record actions, each on its own grant and only in the lifecycle state
       it applies to (Ban while active, Restore while banned); without the grant the item does not exist */
    const menuActions = useMemo(() => (
        (isActive ? canBan : canRestore) ? [{ id: 'ban', label: isActive ? EMPLOYER_BAN_COPY.banAction : EMPLOYER_BAN_COPY.restoreAction, onClick: () => setIsBanOpen(true) }] : []
    ), [isActive, canBan, canRestore]);

    const engagement = EMPLOYER_ENGAGEMENT_HEADER[getEngagementKind(employer)];

    const closeBan = useCallback(() => setIsBanOpen(false), []);

    return (
        <>
            <WorkerIdentityHeader
                name={ employerDisplayName(employer) }
                avatarIcon={ engagement?.icon }
                avatarTitle={ engagement?.title }
                code={ employer?.reference_id }
                hideCodeCopy
                statusLabel={ isActive ? undefined : translation('key_banned') }
                statusTone="dark"
                typeLabel={ primaryLanguageLabel(employer) || undefined }
                nationalityLabel={ employer?.district_info?.name }
                omitEmptyNationality
                locationLabel={ employer?.location_info?.name }
                mobile={ formatPhone(employer?.country_code, employer?.mobile_number) }
                mobile2={ employer?.alternate_mobile_number ? formatPhone(employer?.alternate_mobile_country_code, employer?.alternate_mobile_number) : undefined }
                whatsapp={ formatPhone(employer?.whatsapp_country_code, employer?.whatsapp_number) }
                email={ employer?.email }
                showContacts={ showContacts }
                menuActions={ menuActions }
                onEdit={ onEdit }
                tabs={ tabs }
                activeTab={ activeTab }
                onSelectTab={ onSelectTab }
            />
            { isBanOpen && (
                <RemoveOrBanEmployer isBan={ isActive } employerId={ employerId } onClose={ closeBan } />
            ) }
        </>
    );
};

EmployerHeaderSection.propTypes = {
    employer: PropTypes.object.isRequired,
    employerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    onEdit: PropTypes.func,
    showContacts: PropTypes.bool,
    canBan: PropTypes.bool,
    canRestore: PropTypes.bool,
    tabs: PropTypes.array.isRequired,
    activeTab: PropTypes.string.isRequired,
    onSelectTab: PropTypes.func.isRequired,
};

export default React.memo(EmployerHeaderSection);
