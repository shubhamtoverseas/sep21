/* eslint-env jest */
import fs from "fs";
import path from "path";

/* Priyanka 11 Nov: a backend refusal of the assign write ({status:false, message: ACCESS_NOT_FOUND}) is a toast
   only — the failure branch no longer refetches the section, so the picked agency / staff stay for a retry. */
test("Assign Partner submit: the refusal branch toasts without refreshing the section", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../Views/Pages/WorkerPage/worker-detail/details-tab-worker/assign-pt/AssignPT.js"), "utf8");
    const start = src.indexOf("saveAssignPTWorker(payload)");
    const submit = src.slice(start, src.indexOf("}, [dispatch, agencyInfo", start));
    const elseBranch = submit.slice(submit.indexOf("} else {"));
    expect(submit.slice(0, submit.indexOf("} else {"))).toContain("onRefreshStatus('assign-pt')");
    expect(elseBranch).toContain('ShowToast("error"');
    expect(elseBranch).not.toContain("onRefreshStatus");
});
