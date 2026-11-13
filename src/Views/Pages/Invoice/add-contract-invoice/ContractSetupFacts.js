import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { isLocalWorker } from "./contractSetup";
import "../new-ui-shared.css";
import "../new-ui-create.css";

/*
 * Contract Invoice · Contract setup · the "Employer and worker" card's facts row (27 Oct package, INV-C2, OP-27-43; the
 * reference page's vSetup): Worker Code · Worker Type · Nationality · Contract Category (Local) or Partner agency with
 * its code (Overseas, the current partner the pricing engine read on the server). Read-only: the worker profile is
 * never changed from Invoice.
 */
const ContractSetupFacts = ({ worker, categoryName, partner }) => {
    const { t } = useTranslation();
    if (!worker) return null;
    const local = isLocalWorker(worker);
    const code = worker.reference_id || worker.worker_reference_id || "";
    const nationality = worker.nationality_info?.name || worker.nationality_name || "";
    return (
        <div className="party-detail setup-facts">
            <div className="kv"><div className="k">{ t("key_worker_code") }</div><div className="v mono">{ code || "—" }</div></div>
            <div className="kv"><div className="k">{ t("key_worker_type") }</div><div className="v">{ local ? t("key_local") : t("key_overseas") }</div></div>
            <div className="kv"><div className="k">{ t("key_nationality") }</div><div className="v">{ nationality || "—" }</div></div>
            { local
                ? <div className="kv"><div className="k">{ t("key_contract_category") }</div><div className="v">{ worker.contract_category_info?.name || categoryName || "—" }</div></div>
                : <div className="kv"><div className="k">{ t("key_partner_agency") }</div><div className="v">{ partner ? <>{ partner.name } <span className="code">{ partner.code }</span></> : "—" }</div></div> }
        </div>
    );
};

ContractSetupFacts.propTypes = {
    worker: PropTypes.object,
    categoryName: PropTypes.string,
    partner: PropTypes.shape({ id: PropTypes.number, code: PropTypes.string, name: PropTypes.string }),
};

export default React.memo(ContractSetupFacts);
