import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { fetchInsuranceRecordViewById, resolveInsuranceRef } from "../../../../redux/Slices/insurance/InsuranceSlice";
import { seedInsuranceRemarks } from "./insuranceRecordRemarks";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import routes from "../../routes/routesConfig";
import listStyles from "../../Invoice/InvoiceList.module.css";
import styles from "./InsuranceRecord.module.css";
import { translation } from "../dashboard/insuranceDashboardConfig";

/* OP-N2 (kept in I-5, plan 1.4): Insurance notifications link to
   /insurances/<numeric id>; resolve the reference with the same neutral refusal and redirect. The record's view (INS-2 by
   id) is read here, so the record page opens on it; when that read fails for any reason, the link resolves as before (the
   reference, then the record page's own read and answer). */
const InsuranceLegacyLinkResolver = () => {
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const { insurance_id: insuranceId } = useParams();
    const { search } = useLocation();   /* ?followup=<task id>&from=… (Calendar arrival, I-16) travels on */
    const [target, setTarget] = useState(null);
    const [refused, setRefused] = useState(false);

    useEffect(() => {
        const open = (data) => setTarget(`${routes.insuranceRecord.replace(":ref", data.ref)}${search}`);
        dispatch(fetchInsuranceRecordViewById(insuranceId)).unwrap()
            .then((view) => {
                seedInsuranceRemarks(queryClient, dispatch, view.record, view.remarks);
                open(view.record);
            })
            .catch(() => dispatch(resolveInsuranceRef(insuranceId)).unwrap()
                .then(open)
                .catch(() => setRefused(true)));
    }, [dispatch, insuranceId, queryClient, search]);

    if (target) return <Navigate to={target} replace />;
    if (!refused) return <div className={`${listStyles.pageWrap} ${styles.page}`}><CustomSpinner /></div>;
    return (
        <div className={`${listStyles.pageWrap} ${styles.page}`}>
            <nav className={styles.crumbs}><Link to={routes.insurance}>{translation("key_insurance")}</Link></nav>
            <div className={styles.head}><h1 className={styles.title}>{translation("key_insurance")}</h1></div>
            <div className={styles.notice} role="status">{translation("key_ins_record_not_available")}</div>
        </div>
    );
};

export default InsuranceLegacyLinkResolver;
