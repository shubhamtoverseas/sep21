import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { setInvoiceContractItemsList } from "../../../../redux/Slices/invoices/InvoicesSlice";
import { priceContractInvoiceAPI } from "../../../../services/invoices";
import { interpolate } from "../../../../i18n/interpolate";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { appliedCreditsProblem, creditOverCap, CreditControls, CreditRows, sumAppliedCredits, useCreditRequestKey } from "../AppliedCreditsRows";
import ContractContextStrip from "./ContractContextStrip";
import InvoiceItemsTable from "./InvoiceItemsTable";
import { DraftCustomRow, DraftItemRow } from "./ItemsDraftRows";
import useContractPricing from "./useContractPricing";
import { EXCHANGE, SETTLEMENT_KINDS, STANDALONE, hk } from "./contractSetup";
import { choicesOf, customEntry, itemsInput, withCustom, withItem, withRestored, withSkill, withoutLine } from "./invoiceItems";
import "../new-ui-shared.css";
import "../new-ui-review.css";
import "../new-ui-create.css";
const DiscountPromoPanel = lazy(() => import("./ItemsPanels").then((m) => ({ default: m.DiscountPromoPanel })));
const AdjustSupplementPanel = lazy(() => import("./ItemsPanels").then((m) => ({ default: m.AdjustSupplementPanel })));

/*
 * Contract Invoice · Invoice items (27 Oct package, INV-C3; requirements "Items and review"; the reference page's vItems,
 * the Combined doc's stageItems). The lines configuration populates, from the pricing engine, in one full-width
 * five-column table; staff act on them through focused panels (Discount / Promo, Adjust supplement), the cross, and Add
 * Item / Add Custom Item, which add an empty row at the bottom of the charged lines where staff choose the item or type it
 * (ITEMS-ROW-1, the 21 Sept inline rows; ItemsDraftRows). The screen never prices: every action sends the setup's input
 * with the staff's item choices to POST /invoices/price and shows the answer; an empty row is never sent, and while one
 * is left the invoice cannot continue. A blocked invoice keeps its partial table with the engine's problems and no total,
 * and cannot continue.
 * Apply Credit lives here, beside Add Item and Add Custom Item (package requirements :544; Invoice Review shows it
 * read-only, :546): the two saved-credit dropdowns sit in the action row after the two buttons (the 21 Sept items
 * screen's footer; product chose inline over the package's focused panel, 3 Nov 2026, OP-27-140), greyed with their
 * "No …" text when the employer has none, disabled while the invoice is blocked. A chosen credit is a row after the
 * invoice total ("Credit · <type>", "From <source>", the amount, Keep / Write off, the cross), for no more than the engine's
 * total less the credits before it (:436); the engine prices it after every line and gives Amount due now. A credit the
 * invoice no longer takes in full (a later discount or removal) blocks Continue, naming it and what it can take now, until
 * staff lower or remove it — never re-capped silently. The credits are kept with the draft for Invoice Review.
 *
 * Standalone mode (INV-G3, /invoices/general/form): the same table, opening EMPTY (the engine adds no automatic line on
 * route "standalone") with its empty state; Add Item offers every active Fixed item (OP-27-66), Add Custom Item, Discount /
 * Promo with the promotions the engine returns; no Adjust supplement (no supplement line exists); every line removable.
 *
 * Exchange mode (INV-X3, /invoices/exchange/add-contract-invoice-exchange; register #71 – #73): the same table for the
 * replacement's lines, priced as the replacement's own service, then the engine's Exchange Credit (A1's reference) and
 * balancing line, read-only; the footer is the A2 total HK$0 with the settlement figures beneath. Add Item, Add Custom
 * Item, Discount / Promo (promotions as on a Contract Invoice, OP-27-107) and Adjust supplement as here; no saved credit
 * (:434, :595; OP-27-108). A refusal of A1 or of the replacement worker sends staff back to setup.
 * A Standalone invoice billed to a worker applies no saved credit either (OP-27-69).
 */
const round2 = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;

/** a problem that is a setup choice still to make (the reference page's itemsWhy): staff go back to Contract setup for it;
    an exchange also goes back for A1's or the replacement worker's refusals */
const SETUP_SCOPES = ["driver", "category"];
const EXCHANGE_SETUP_SCOPES = [...SETUP_SCOPES, "exchange", "worker"];

const ContractInvoiceItems = ({ mode }) => {
    const standalone = mode === STANDALONE;
    const exchangeMode = mode === EXCHANGE;
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    const contractFormInfo = location.state?.contractFormInfo;
    const setupInput = location.state?.setupInput;
    const invoiceCurrentJobInfo = useSelector((state) => state.employer.invoiceCurrentJobInfo);
    /* the draft's items: the item choices and the applied credits, both chosen here (each kept when the other changes) */
    const draft = useSelector((state) => state.invoices.invoiceContractItemsList);
    const stored = useMemo(() => (Array.isArray(draft) ? {} : (draft || {})), [draft]);
    const choices = useMemo(() => choicesOf(draft?.choices), [draft]);
    /* the choices as they are when an empty row's commit lands (another row may have committed meanwhile) */
    const choicesRef = useRef(choices);
    choicesRef.current = choices;
    const setChoices = useCallback((next) => dispatch(setInvoiceContractItemsList({ ...(Array.isArray(draft) ? {} : draft), choices: next })), [dispatch, draft]);
    const input = useMemo(() => itemsInput(setupInput, choices), [setupInput, choices]);
    const pricing = useContractPricing(input);
    const result = pricing.result;

    /* Apply Credit: whose saved credit can be applied — the Contract Invoice's employer, or a Standalone employer party; an
       Exchange (OP-27-108) and a worker party (OP-27-69) have none */
    const employerId = exchangeMode || (standalone && contractFormInfo?.party_type !== "employer") ? null : contractFormInfo?.currentInvoiceEmployerDetail?.employer_id;
    const appliedCredits = useMemo(() => (employerId ? stored.appliedCredits || [] : []), [employerId, stored]);
    const creditRequestKey = useCreditRequestKey(stored.creditRequestKey);
    const saveCredits = useCallback((next) => dispatch(setInvoiceContractItemsList({ ...stored, creditRequestKey, appliedCredits: next })), [dispatch, stored, creditRequestKey]);
    const applyCredit = useCallback((credit) => saveCredits([...appliedCredits, credit]), [saveCredits, appliedCredits]);
    const removeCredit = useCallback((credit) => saveCredits(appliedCredits.filter((c) => !(c.credit_type === credit.credit_type && String(c.id) === String(credit.id)))), [saveCredits, appliedCredits]);
    const changeCredit = useCallback((credit, patch) => saveCredits(appliedCredits.map((c) => (c.credit_type === credit.credit_type && String(c.id) === String(credit.id) ? { ...c, ...patch } : c))), [saveCredits, appliedCredits]);
    /* the engine's invoice total (after every deduction, before credit) caps the credits; the screen never prices. The cap
       is checked against the answer for the current choices only (while the next one is read the last answer is stale) */
    const lastTotal = result?.ok ? (result.summary?.invoiceTotal ?? result.total?.net ?? null) : null;
    const invoiceTotal = pricing.current ? lastTotal : null;
    const creditProblem = appliedCreditsProblem(appliedCredits);
    const overCap = invoiceTotal == null ? null : creditOverCap(appliedCredits, invoiceTotal);
    /* the engine's Amount due now with the credits: asked only while they fit (a credit above what the invoice owes is
       refused by the server, QA-27 ruling 4) */
    const creditInput = useMemo(() => (input && employerId && appliedCredits.length && invoiceTotal != null && !creditProblem && !overCap ? {
        ...input, employer_id: Number(employerId), credits: appliedCredits.map((c) => ({ id: Number(c.id), amount: round2(c.amount) })),
    } : null), [input, employerId, appliedCredits, invoiceTotal, creditProblem, overCap]);
    const creditPricing = useContractPricing(creditInput);
    const amountDue = creditPricing.status === "ready" && creditPricing.result?.ok ? creditPricing.result.summary?.amountDue ?? null : null;
    const creditWhy = !appliedCredits.length || invoiceTotal == null ? ""
        : overCap ? interpolate(t("key_inv_credit_over_cap"), overCap.credit._reference, hk(overCap.max))
            : creditProblem ? t(creditProblem)
                : creditPricing.status === "error" ? (creditPricing.error || t("key_inv_pricing_not_read")) : "";
    const creditPending = appliedCredits.length > 0 && !creditWhy && creditPricing.status !== "ready";
    /* a staff action the engine or the Price List did not allow (the reference page's NOTE), until the next action */
    const [note, setNote] = useState(null);
    const [panel, setPanel] = useState(null);
    /* the empty Add Item / Add Custom Item rows, in the order added: screen state only, gone when staff leave the stage */
    const [drafts, setDrafts] = useState([]);
    const draftsRef = useRef(drafts);
    draftsRef.current = drafts;
    const draftSeq = useRef(0);
    const [focusDraft, setFocusDraft] = useState(null);

    /* this stage needs setup's input: without it (a direct link), start at setup (Standalone: its first party, Employer;
       an Exchange starts from its original invoice, so from the list) */
    useEffect(() => {
        if (!setupInput) navigate(standalone ? "/invoices/general/add-contract-invoice/employer" : exchangeMode ? "/invoices" : "/invoices/add-contract-invoice", { replace: true });
    }, [setupInput, navigate, standalone, exchangeMode]);

    /** the engine's answer for other choices (a panel's preview, Add Item's and the cross's checks at click) */
    const ask = useCallback((next, opts = {}) => priceContractInvoiceAPI({ ...itemsInput(setupInput, next), ...(opts.adding ? { adding: true } : {}), ...(opts.entry ? { deduction_entry: true } : {}) })
        .then((res) => {
            const body = res?.data;
            if (!body || body.status === false || !body.data) throw new Error("not read");
            return body.data;
        }), [setupInput]);

    const openPanel = useCallback((kind, line = null) => { setNote(null); setPanel({ kind, line }); }, []);
    const closePanel = useCallback(() => setPanel(null), []);
    const commit = useCallback((next) => { choicesRef.current = next; setChoices(next); setPanel(null); }, [setChoices]);

    /* The cross: removability is read from the Price List again when it is clicked; an item now automatic and required,
       or set up twice, stays, and if the prices can't be read nothing changes (requirements "Removing an item"). */
    const remove = useCallback(async (line) => {
        setNote(null);
        const next = withoutLine(choices, line);
        if (line.kind !== "item") { setChoices(next); return; }
        try {
            const answer = await ask(next);
            if (answer.refused.some((x) => x.item === line.item && x.reason === "required")) {
                setNote({ title: interpolate(t("key_inv_not_removed"), line.label), lines: [t("key_inv_now_required")] });
            } else if ((answer.clash || []).includes(line.item)) {
                setNote({ title: interpolate(t("key_inv_not_removed"), line.label), lines: [t("key_inv_set_up_twice")] });
            } else {
                setChoices(next);
            }
        } catch {
            setNote({ title: t("key_inv_nothing_removed"), lines: [t("key_inv_removal_not_checked")] });
        }
    }, [ask, choices, setChoices, t]);

    /* Add Item (an Add Item row's Description): a skill needs its price; a removed item comes back; any other item is checked
       against the Price List as it is now (an item with no amount, or not set up for this service and code, is not added).
       Returns the refusal copy. */
    const add = useCallback(async (option) => {
        if (option.skill) {
            if (option.amount == null) return "key_inv_skill_no_price";
            commit(withSkill(choicesRef.current, option.skill));
            return null;
        }
        if (option.restore) { commit(withRestored(choicesRef.current, option.item)); return null; }
        try {
            const answer = await ask(withItem(choicesRef.current, option.item), { adding: true });
            const refused = answer.refused.find((x) => x.item === option.item);
            if (refused) return refused.reason === "missing" ? "key_inv_add_no_amount" : refused.reason === "skill-scope" ? "key_inv_add_skill_scope" : "key_inv_add_not_set_up";
            commit(withItem(choicesRef.current, option.item));
            return null;
        } catch {
            return "key_inv_add_not_read";
        }
    }, [ask, commit]);

    /* The empty rows (ITEMS-ROW-1): + Add Item / + Add Custom Item append one at the bottom of the charged lines and move the
       focus into it; each commits on its own. */
    const addDraft = useCallback((kind) => {
        setNote(null);
        draftSeq.current += 1;
        const key = `d${ draftSeq.current }`;
        setDrafts((cur) => [...cur, { key, kind, type: "", picked: "", description: "", amount: "", busy: false, tried: false }]);
        setFocusDraft(`inv-draft-${ key }-${ kind === "custom" ? "description" : "type" }`);
    }, []);
    useEffect(() => {
        if (!focusDraft) return;
        document.getElementById(focusDraft)?.focus();
        setFocusDraft(null);
    }, [focusDraft]);
    const editDraft = useCallback((key, patch) => setDrafts((cur) => cur.map((d) => (d.key === key ? { ...d, ...patch } : d))), []);
    const dropDraft = useCallback((key) => {
        draftsRef.current = draftsRef.current.filter((d) => d.key !== key);
        setDrafts((cur) => cur.filter((d) => d.key !== key));
    }, []);
    const chooseType = useCallback((key, type) => editDraft(key, { type, picked: "" }), [editDraft]);
    /* an Add Item row commits when its Description is chosen: the engine checks the item then (R-I4); a refusal is the
       warning note and the row goes back to incomplete */
    const pickItem = useCallback(async (row, option) => {
        setNote(null);
        editDraft(row.key, { picked: option.id, busy: true });
        const refused = await add(option);
        if (!refused) { dropDraft(row.key); return; }
        editDraft(row.key, { picked: "", busy: false });
        setNote({ title: `${ option.itemType } · ${ option.label }`, lines: [t(refused)] });
    }, [add, editDraft, dropDraft, t]);
    /* an Add Custom Item row commits on blur of its amount or Enter, once both fields pass the server's check (R-I4); a blur
       that leaves the amount blank keeps the row incomplete without a message */
    const commitCustom = useCallback((row, { blur = false } = {}) => {
        if (!draftsRef.current.some((d) => d.key === row.key)) return;
        const entry = customEntry(row);
        if (!entry) {
            if (!blur || String(row.amount).trim() !== "") editDraft(row.key, { tried: true });
            return;
        }
        setNote(null);
        dropDraft(row.key);
        commit(withCustom(choicesRef.current, entry));
    }, [commit, dropDraft, editDraft]);

    const lines = result?.lines || [];
    /* the item count is the charged lines (an A2's settlement lines are not items) */
    const itemCount = lines.filter((l) => !SETTLEMENT_KINDS.includes(l.kind)).length;
    // @migration-unspecified(invoice): the package does not say whether a Standalone Invoice with no line can continue.
    // Retained the old Standalone screen's rule: at least one item ("Please add item first"); its total > 0 rule is not
    // kept (a HK$0 invoice takes the zero-payable path, OP-27-54). Confirm with product before release (OP-27-88).
    const empty = standalone && lines.length === 0;
    const problems = result && !result.ok ? result.problems : [];
    const backToSetup = problems.some((p) => (exchangeMode ? EXCHANGE_SETUP_SCOPES : SETUP_SCOPES).includes(p.scope));
    const why = drafts.length ? t("key_inv_finish_or_remove_empty_row")
        : !result || pricing.status !== "ready" ? "" : result.ok ? (empty ? t("key_please_add_item_first") : creditWhy)
            : problems[0]?.scope === "driver" ? t("key_inv_choose_process_as_driver")
                : problems[0]?.scope === "category" ? t("key_inv_choose_contract_category") : t("key_inv_resolve_items_first");
    const canContinue = !drafts.length && pricing.status === "ready" && result?.ok && !empty && !creditWhy && !creditPending;
    const toReview = useCallback(() => {
        if (!canContinue) return;
        if (standalone) navigate("/invoices/general/invoice-review", { state: { contractFormInfo, setupInput } });
        else if (exchangeMode) navigate("/invoices/exchange/exchange-invoice-review", { state: { contractFormInfo, setupInput } });
        else navigate("/invoices/add-contract-invoice/invoice-review", { state: { contractFormInfo, setupInput, invoiceCurrentJobInfo } });
    }, [canContinue, standalone, exchangeMode, navigate, contractFormInfo, setupInput, invoiceCurrentJobInfo]);
    const goBack = useCallback(() => window.history.back(), []);
    const draftRows = drafts.length ? drafts.map((d) => (d.kind === "custom"
        ? <DraftCustomRow key={ d.key } draft={ d } onEdit={ editDraft } onCommit={ commitCustom } onDrop={ dropDraft } />
        : <DraftItemRow key={ d.key } draft={ d } result={ result } onType={ chooseType } onPick={ pickItem } onDrop={ dropDraft } />)) : null;

    return (
        <div className="invd add-contract-invoice items-stage">
            <div className="review-breadcrumb">
                <span className="step done">{ t(standalone ? "key_invoice_setup" : "key_contract_setup") }</span>
                <span className="sep">›</span>
                <span className="step here">{ t("key_pricing_items") }</span>
                <span className="sep">›</span>
                <span className="step">{ t(exchangeMode ? "key_inv_exchange_settlement_review" : "key_invoice_review") }</span>
                { !exchangeMode && <>
                    <span className="sep">›</span>
                    <span className="step">{ t("key_payment_confirmation") }</span>
                </> }
            </div>
            <div className="review-head">
                <div className="left">
                    <button type="button" className="btn-icon outlined" onClick={ goBack } aria-label={ t("key_back") }><i className="ri-arrow-left-s-line" /></button>
                    <h1>{ t(standalone ? "key_add_general_invoice" : exchangeMode ? "key_exchange_contract_invoice" : "key_add_contract_invoice") }</h1>
                    <span className="badge info">{ `${ t("key_step") } 2 ${ t("key_of") } 3` }</span>
                    { exchangeMode && <span className="hdr-context" data-context>{ interpolate(t("key_inv_exchange_of"), contractFormInfo?.currentInvoiceExchange?.invoice_number || "") }</span> }
                </div>
            </div>

            <ContractContextStrip contractFormInfo={ contractFormInfo } predecessor={ result?.predecessor } standalone={ standalone } />
            <div className="callout info items-rule" role="note">
                <span className="ico"><i className="ri-information-line" /></span>
                <span><b>{ t("key_inv_rule_columns_title") }</b> { t("key_inv_rule_columns") }</span>
            </div>
            { !standalone && (
                <div className="callout warn items-rule" role="note">
                    <span className="ico"><i className="ri-information-line" /></span>
                    <span><b>{ t("key_inv_rule_conditional_title") }</b> { t("key_inv_rule_conditional") }</span>
                </div>
            ) }

            { note && (
                <div className="callout warn" role="status" data-note>
                    <span className="ico"><i className="ri-error-warning-line" /></span>
                    <span><b>{ note.title }</b>{ note.lines.map((l, i) => <span key={ i } className="svc-problem">{ l }</span>) }</span>
                </div>
            ) }
            { result?.notes?.length > 0 && (
                <div className="callout warn" role="status" data-engine-notes>
                    <span className="ico"><i className="ri-information-line" /></span>
                    <span>{ result.notes.map((n, i) => <span key={ i } className="svc-problem">{ n }</span>) }</span>
                </div>
            ) }
            { problems.length > 0 && (
                <div className="callout danger" role="alert">
                    <span className="ico"><i className="ri-error-warning-line" /></span>
                    <span>
                        <b>{ t("key_inv_cannot_create_yet") }</b>
                        { problems.map((p, i) => <span key={ i } className="svc-problem">{ p.text }</span>) }
                        { backToSetup && <span className="svc-problem"><button type="button" className="btn btn-secondary sm" onClick={ goBack }>{ t("key_inv_back_to_setup") }</button></span> }
                    </span>
                </div>
            ) }
            { pricing.status === "error" && (
                <div className="callout danger" role="alert">
                    <span className="ico"><i className="ri-error-warning-line" /></span>
                    <span>{ pricing.error || t("key_inv_pricing_not_read") }</span>
                    <button type="button" className="btn btn-secondary sm svc-retry" onClick={ pricing.retry }>{ t("key_retry") }</button>
                </div>
            ) }
            { creditWhy && (
                <div className="callout danger" role="alert" data-credit-block>
                    <span className="ico"><i className="ri-error-warning-line" /></span>
                    <span>{ creditWhy }</span>
                </div>
            ) }

            <section className="review-card items-card">
                <div className="sec-head">
                    <h3>{ t("key_invoice_items") }</h3>
                    <span className="helper">{ itemCount === 1 ? t("key_inv_items_one") : interpolate(t("key_inv_items_count"), itemCount) }</span>
                    { pricing.status === "loading" && <CustomSpinner /> }
                </div>
                <InvoiceItemsTable result={ result } mode="edit" onRemove={ remove } onPanel={ openPanel } emptyText={ standalone ? t("key_inv_no_items_yet") : undefined } draftRows={ draftRows }
                    creditRows={ appliedCredits.length ? <CreditRows appliedCredits={ appliedCredits } onRemove={ removeCredit } onChange={ changeCredit } /> : null }
                    amountDue={ amountDue } />
                <div className="add-actions">
                    <button type="button" className="btn btn-secondary md" disabled={ !result } onClick={ () => addDraft("item") }><i className="ri-add-line" />{ t("key_add_item") }</button>
                    <button type="button" className="btn btn-secondary md" disabled={ !result } onClick={ () => addDraft("custom") }><i className="ri-add-line" />{ t("key_add_custom_item") }</button>
                    { employerId && (
                        <CreditControls employerId={ employerId } appliedCredits={ appliedCredits } disabled={ !result?.ok }
                            capacity={ Math.max(0, round2((lastTotal ?? 0) - sumAppliedCredits(appliedCredits))) } onApply={ applyCredit } />
                    ) }
                </div>
            </section>

            <div className="review-foot">
                { why && <span className="why">{ why }</span> }
                <button type="button" className="btn btn-secondary md" onClick={ goBack }><i className="ri-arrow-left-s-line" />{ t("key_back") }</button>
                <button type="button" className="btn btn-primary md" disabled={ !canContinue } onClick={ toReview }>{ t("key_inv_continue_to_review") }<i className="ri-arrow-right-s-line" /></button>
            </div>

            { panel && (
                <Suspense fallback={ null }>
                    { panel.kind === "discount" && <DiscountPromoPanel line={ panel.line } result={ result } choices={ choices } ask={ ask } onApply={ commit } onClose={ closePanel } /> }
                    { panel.kind === "adjust" && !standalone && <AdjustSupplementPanel line={ panel.line } result={ result } choices={ choices } ask={ ask } onApply={ commit } onClose={ closePanel } /> }
                </Suspense>
            ) }
        </div>
    );
};

ContractInvoiceItems.propTypes = {
    /** "standalone": the Standalone Invoice items stage (INV-G3); "exchange": an Exchange's A2 items (INV-X3) */
    mode: PropTypes.oneOf([STANDALONE, EXCHANGE]),
};

export default ContractInvoiceItems;
