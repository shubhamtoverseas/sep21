import { fetchInsuranceRemarks } from "../../../../redux/Slices/remarks/RemarkSlice";
import { translation } from "../dashboard/insuranceDashboardConfig";

/* The Remarks drawer (InsuranceRemarks) reads the remarks store, behind a react-query entry per record that
   stays fresh for the app's staleTime. The record view (INS-2) carries the same list the panel's own read returns. It is
   put where that read would put it, but only when the panel would read it now (no fresh entry for this record); with a
   fresh entry nothing changes, exactly as before. A view without its list (null) leaves the panel to read it. */
export const insuranceRemarksKey = (recordId) => ["remarks", "insurance", recordId];

export const seedInsuranceRemarks = (queryClient, dispatch, record, remarks) => {
    if (!record?.id || remarks == null) return false;
    const key = insuranceRemarksKey(record.id);
    const query = queryClient.getQueryCache().find(key);
    const staleTime = queryClient.getDefaultOptions().queries?.staleTime ?? 0;
    if (query && !query.isStaleByTime(staleTime)) return false;
    const payload = { status: true, data: remarks };
    dispatch(fetchInsuranceRemarks.fulfilled(payload, "insurance-record-view", { insurance_id: record.id }));
    queryClient.setQueryData(key, payload);
    return true;
};

/* The live remarks (not deleted), newest first; the Context card counts them and previews the latest (remarks.js
   contextButton: "No current remarks · history available" once every remark is deleted) */
export const liveRemarks = (remarks) => (remarks || []).filter((r) => !r.deleted).sort((a, b) => b.id - a.id);
export const remarksPreview = (remarks) => {
    const latest = liveRemarks(remarks)[0];
    if (latest) return latest.remarks;
    return (remarks || []).length ? translation("key_ins_remarks_history_only") : translation("key_no_remarks_yet");
};
