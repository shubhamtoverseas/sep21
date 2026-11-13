import { translation } from "../dashboard/insuranceDashboardConfig";

/* Change CS Owner targets: { ref, worker, owner {id, name}, branch {id, code, name}, contract } from the record
   page, a dashboard row or a portfolio (R9) */
export const targetFromRecord = (record) => ({
    ref: record.ref,
    worker: record.header?.workerName,
    owner: record.summary?.owner || null,
    branch: record.summary?.branch || null,
    contract: record.summary?.contract || null,
});
export const targetFromRow = (row) => ({ ref: row.ref, worker: row.worker?.name, owner: row.owner, branch: row.branch, contract: row.contract });

/* rules.ownerTransferPreview, the same rule M14 re-checks at commit (TARGET_API R9 / M14) */
export const ownerPreview = (target, recipient, canOpen) => {
    if (!canOpen) return { ok: false, why: translation("key_ins_record_cannot_open") };
    if (target.contract) return { ok: false, why: translation("key_ins_follows_governing_contract") };
    if (target.owner && target.owner.id === recipient.id) return { ok: false, why: translation("key_ins_already_owner") };
    const branchId = target.branch?.id;
    const code = target.branch?.code || "";
    if (!branchId || !recipient.ownershipBranchIds.includes(branchId)) return { ok: false, why: translation("key_ins_no_ownership_scope_for", { branch: code }) };
    if (recipient.accessBranchIds && !recipient.accessBranchIds.includes(branchId)) return { ok: false, why: translation("key_ins_no_access_to_branch", { branch: code }) };
    return { ok: true, why: translation("key_ins_branch_kept") };
};

/* "{name} · {title} · {branch names | no Branch scope}" (ownership.js recipientOptions) */
export const recipientLabel = (r) => [r.name, r.title, r.branches.map((b) => b.name).join(", ") || translation("key_ins_no_branch_scope")].filter(Boolean).join(" · ");
