import translation from "../../../../../utils/translation";
import { getTemplateWhatsApp, sendTemplateMessagePartnerAssign } from "../../../../../services/templates";
import { fetchCategoryList, fetchTemplateNameByFilter, sendChatMessage } from "../../../../../redux/Slices/settings/templates/TemplateSlice";
import { fillipinoId, indonesiaId } from "../../../../../components/ReusableComponents/constants";
import { PARTNER_ASSIGNED_MESSAGE, PARTNER_INQUIRY, WKD_SEND_TEMPLATE_VERB } from "../../workerModuleConstants";

/*
 * Partner inquiry and the post-assignment worker message (10 Nov 2026 package REF-PERM "Partner inquiry and assignment
 * notifications", F-12, ST-04 / ST-06, TC01 / TC02 / TC07; S10 delta rows 1–4, rulings Q5, A and B, 12 Nov 2026).
 *
 * The inquiry is the approved WhatsApp template `assign_pt`, sent by chat to the proposed PT. It names the worker and asks
 * whether the partner accepts the assignment. It assigns nothing and changes no status; chat's message row (with its
 * WhatsApp delivery status) is the inquiry's record. The assignment stays the separate Assign action, which then sends
 * category 65 to the worker in-app.
 */

/* the journeys that have an inquiry (U-0204: Filipino / Indonesian; Thai / Bangladeshi assignment is direct) */
export const hasPartnerInquiry = (nationalityId) => [Number(fillipinoId), Number(indonesiaId)].includes(Number(nationalityId));

/* the journey's Assign Partner grant (Overseas Philippines / Indonesia) */
export const assignPartnerGrant = (accessInfo, nationalityId) => {
    if (Number(nationalityId) === Number(fillipinoId)) return accessInfo?.worker_philippines_worker_assign_partner || [];
    if (Number(nationalityId) === Number(indonesiaId)) return accessInfo?.worker_indonesia_worker_assign_partner || [];
    return [];
};

/* ST-04 / ST-06 "existing scoped send authority": the journey's Assign Partner — Send Template verb (admin always) */
export const canSendPartnerInquiry = (grant, isAdmin) => Boolean(isAdmin) || (Array.isArray(grant) && grant.includes(WKD_SEND_TEMPLATE_VERB));

/* the approved template's values, in its order: worker name, nationality, worker code — "Not Assigned" until the code is
   issued at assignment (ruling B) */
export const inquiryValues = ({ name, nationality, code } = {}) => [name || "", nationality || "", code || translation("key_not_assigned")];

/* the approved text with its numbered placeholders filled */
export const fillApprovedText = (text, values) => String(text || "").replace(/{{\s*(\d+)\s*}}/g, (match, n) => values[Number(n) - 1] ?? match);

/* a WhatsApp template's text as chat lists it: a TEXT header line, then the body */
export const approvedTemplateText = (template) => {
    const parts = Array.isArray(template?.components) ? template.components : [];
    const header = parts.find((c) => c.type === "HEADER" && c.format === "TEXT");
    const body = parts.find((c) => c.type === "BODY");
    return [header?.text, body?.text].filter(Boolean).join("\n");
};

/* the approved inquiry text ("" when chat lists no such template) */
export const loadPartnerInquiryText = async () => {
    const res = await getTemplateWhatsApp({ name: PARTNER_INQUIRY.template, language: PARTNER_INQUIRY.language });
    const list = res?.data?.data?.data;
    return Array.isArray(list) && list.length ? approvedTemplateText(list[0]) : "";
};

/* the chat payload: the proposed PT's account, the filled text as the record, the template's three values */
export const partnerInquiryPayload = ({ pt, worker, text }) => {
    const values = inquiryValues(worker);
    return {
        platform: "whatsapp",
        friend_id: pt?.user_id,
        friend_type: "user",
        entity_type: "template",
        template_content: fillApprovedText(text, values),
        worker_name: values[0],
        nationality: values[1],
        reference_id: values[2],
    };
};

/* sends the inquiry; chat answers 200 with success:false on a failed send (CH-11) — that is a failure */
export const sendPartnerInquiry = async (args) => {
    try {
        const res = await sendTemplateMessagePartnerAssign(partnerInquiryPayload(args));
        return res?.data?.success === false ? { failed: true, message: res.data.message || "" } : { failed: false };
    } catch (error) {
        return { failed: true, message: error?.response?.data?.message || "" };
    }
};

/* after an actual assignment: category 65 to the worker in-app, from the Onboarding 2 owner (ruling A) */
export const sendPartnerAssignedMessage = async (dispatch, { workerUserId, workerName, senderUserId }) => {
    if (!workerUserId) return null;
    const categories = await dispatch(fetchCategoryList({ module: PARTNER_ASSIGNED_MESSAGE.module }));
    const category = (categories?.payload?.data || []).find((c) => c.slug === PARTNER_ASSIGNED_MESSAGE.slug);
    if (!category) return null;
    const templates = await dispatch(fetchTemplateNameByFilter({
        category_id: category.id, module_key: PARTNER_ASSIGNED_MESSAGE.module,
        language_id: PARTNER_ASSIGNED_MESSAGE.languageId, recipient_variant: PARTNER_ASSIGNED_MESSAGE.recipient,
    }));
    const template = (templates?.payload?.data || [])[0];
    if (!template?.template_content) return null;
    /* {{ worker_full_name }} is the template's own token; chat resolves the allow-listed others */
    const content = template.template_content.replace(/{{\s*worker_full_name\s*}}/g, workerName || "");
    return dispatch(sendChatMessage({
        platform: "app", friend_id: workerUserId, entity_id: template.id, entity_type: "template", friend_type: "user",
        template_file_path: template.file_path_name, template_content: content, sender_id: senderUserId,
    }));
};
