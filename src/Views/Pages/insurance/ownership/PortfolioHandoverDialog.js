import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import SearchSelect from "../../../../components/ui/SearchSelect";
import StaffAccountCue from "../../../../components/ui/StaffAccountCue";
import { Field } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { fetchInsuranceOwnerPortfolio } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { translation } from "../dashboard/insuranceDashboardConfig";
import { refusalOf } from "../shared/insuranceFormsConfig";
import styles from "../shared/InsuranceForms.module.css";

/* D15 · Complete portfolio handover (ownership.js openPortfolio, R9): pick the current CS Owner; the set is the
   records of that owner the actor may access, and Continue opens Change CS Owner in portfolio mode. Each owner shows the
   shared inactive-staff cue when the account is known to be inactive (UI Correction C3; Q-21 three-state status, so an
   unknown status shows none) and their record counts. */
const PortfolioHandoverDialog = ({ onClose, onContinue }) => {
    const dispatch = useDispatch();
    const [owners, setOwners] = useState(null);
    const [ownerId, setOwnerId] = useState("");
    const [set, setSet] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        dispatch(fetchInsuranceOwnerPortfolio()).then((res) => {
            if (res.error) { ShowToast("error", refusalOf(res).message); setOwners([]); return; }
            setOwners(res.payload?.data?.owners || []);
        });
    }, [dispatch]);

    /* the set of the owner still picked: a late answer for an earlier pick is dropped */
    useEffect(() => {
        setSet(null);
        if (!ownerId) return undefined;
        let live = true;
        dispatch(fetchInsuranceOwnerPortfolio(Number(ownerId))).then((res) => {
            if (!live) return;
            if (res.error) { ShowToast("error", refusalOf(res).message); return; }
            setSet(res.payload?.data || null);
        });
        return () => { live = false; };
    }, [dispatch, ownerId]);

    const owner = (owners || []).find((o) => String(o.id) === ownerId);
    const options = useMemo(() => (owners || []).map((o) => ({
        value: String(o.id),
        label: o.name,
        adornment: <StaffAccountCue active={o.active} embedded />,
        sub: translation("key_ins_portfolio_owner_counts", { n: o.total, s: o.standalone }),
    })), [owners]);
    const next = useCallback(() => {
        if (!ownerId) { setError(translation("key_ins_select_current_owner")); return; }
        if (!set) return;
        onContinue({ ownerId: Number(ownerId), records: set.records });
    }, [onContinue, ownerId, set]);

    return (
        <Modal
            title={translation("key_ins_complete_portfolio_handover")}
            subtitle={translation("key_ins_portfolio_sub")}
            width={860}
            onClose={onClose}
            footer={(
                <>
                    <span className={styles.spacer} />
                    <Btn variant="secondary" onClick={onClose}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" onClick={next} disabled={!!ownerId && !set}>{translation("key_ins_continue")}</Btn>
                </>
            )}
        >
            <div className={styles.form}>
                {!owners ? <CustomSpinner /> : (
                    <Field label={translation("key_ins_current_cs_owner")} required htmlFor="ins-portfolio-owner" error={error}>
                        <SearchSelect
                            inputId="ins-portfolio-owner"
                            value={ownerId}
                            options={options}
                            invalid={!!error}
                            placeholder={translation("key_ins_select_current_cs_owner")}
                            onChange={(v) => { setOwnerId(v ? String(v) : ""); setError(null); }}
                        />
                    </Field>
                )}
                {ownerId && !set && <CustomSpinner />}
                {owner && set && (
                    <div className={styles.notice}>
                        {translation("key_ins_portfolio_info", { n: set.accessible, name: owner.name, s: set.accessibleStandalone, c: set.accessibleLinked })}
                    </div>
                )}
            </div>
        </Modal>
    );
};

PortfolioHandoverDialog.propTypes = {
    onClose: PropTypes.func.isRequired,
    onContinue: PropTypes.func.isRequired,
};

export default PortfolioHandoverDialog;
