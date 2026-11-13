import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import { getInsuranceRecordAPI } from "../../../../../services/insurance";
import { translation } from "../../../insurance/dashboard/insuranceDashboardConfig";

/* After terminal cover the Contract's Insurance step offers one behaviour: a NEW Insurance record continuing from its record,
   through the guarded successor route (companions.js "New policy after {ref}"; C1, UI verification W19). Offered only when the
   record itself offers New policy; a record the user cannot read offers nothing. */
const NewPolicyAfter = ({ insuranceRef, onStart }) => {
    const [canStart, setCanStart] = useState(false);
    useEffect(() => {
        let alive = true;
        setCanStart(false);
        getInsuranceRecordAPI(insuranceRef)
            .then((res) => { if (alive) setCanStart(!!res.data?.data?.actions?.find((a) => a.key === "newPolicy")?.enabled); })
            .catch(() => {});
        return () => { alive = false; };
    }, [insuranceRef]);
    if (!canStart) return null;
    return (
        <div className="mcdt-insafter">
            <Btn variant="secondary" type="button" onClick={onStart}>
                <Icon name="plus" size={12} /> {translation("key_ins_new_policy_after", { ref: insuranceRef })}
            </Btn>
        </div>
    );
};

NewPolicyAfter.propTypes = {
    insuranceRef: PropTypes.string.isRequired,
    onStart: PropTypes.func.isRequired,
};

export default NewPolicyAfter;
