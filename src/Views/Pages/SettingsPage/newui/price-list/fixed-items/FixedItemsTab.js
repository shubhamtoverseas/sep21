import React, { useState } from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../../components/ui/Btn";
import Modal from "../../../../../../components/ui/Modal";
import Icon from "../../../../../../components/Icon/Icon";
import Badge from "../../../../../../components/ui/Badge";
import { Field, FormGrid, SelectBox, TextInput } from "../../../../../../components/ui/FormControls";
import translation from "../../../../../../utils/translation";
import { PRICE_LIST_PAGE } from "../../settingsNewUiConstants";
import useFixedItems from "./useFixedItems";
import {
    ITEM_USES, clearedItems, currentCatalogue, fixedReviewRows, isSkillUse, itemCheck, nextNewId, typeError,
} from "./fixedItemsConfig";
import { formatMoney, formatNumber } from "../shared/priceEntries";
import { DiscardDialog, FootBar, Missing, PageHead, PageLoading, ReviewDialog, clearedEffect, keepEffect } from "../shared/PriceEntryParts";
import { useFrameLink } from "../shared/priceListFrame";
/* after the shared parts, as the other Price List tabs import Btn before these styles (one CSS order in the shared chunk) */
import styles from "../PriceList.module.css";

/*
 * Price List · Fixed items (27 Oct package, PL-S5; layout from the package's Fixed items page, PL-UI3). A card per item type
 * with its items (Description · Base amount); Add Item Type, Add Item and Edit open the package's dialogs, whose changes
 * go to the draft; Review changes, then Save changes. Nothing is deleted: the system types (Insurance Policy …) can only be
 * renamed; they stay active (QA-27-022). Automatic additions are set in Items by service.
 */

/* the package marks its Skills type by its key (pl_retained.js); no other type carries it */
const SKILL_TYPE_KEY = "skill_fee";

const DialogFoot = ({ onClose, onApply }) => (
    <>
        <span className={styles.plSpacer} />
        <Btn variant="secondary" type="button" onClick={onClose}>{translation("key_cancel")}</Btn>
        <Btn variant="primary" type="button" onClick={onApply}>{translation("key_apply")}</Btn>
    </>
);

DialogFoot.propTypes = { onClose: PropTypes.func.isRequired, onApply: PropTypes.func.isRequired };

/* Add Item Type / Edit item type: Item type, Status (a system type's Status stays Active, QA-27-022) */
const TypeDialog = ({ value, onApply, onClose }) => {
    const system = Boolean(value.is_system);
    const [name, setName] = useState(value.name);
    const [active, setActive] = useState(value.active);
    const [error, setError] = useState("");
    const apply = () => setError(onApply({ ...value, name, active }) || "");
    return (
        <Modal title={translation(value.isNew ? "key_pl_add_item_type" : "key_pl_edit_item_type")} width={560} onClose={onClose} footer={<DialogFoot onClose={onClose} onApply={apply} />}>
            <FormGrid columns={2}>
                <Field label={translation("key_pl_item_type")} htmlFor="pl-fx-name">
                    <TextInput id="pl-fx-name" value={name} invalid={Boolean(error)} autoComplete="off" onChange={(event) => setName(event.target.value)} />
                </Field>
                <Field label={translation("key_status")} htmlFor="pl-fx-status">
                    <SelectBox id="pl-fx-status" value={active ? "active" : "inactive"} disabled={system} aria-describedby={system ? "pl-fx-status-note" : undefined} onChange={(event) => setActive(event.target.value === "active")}>
                        <option value="active">{translation("key_active")}</option>
                        <option value="inactive">{translation("key_inactive")}</option>
                    </SelectBox>
                </Field>
            </FormGrid>
            {system && <p id="pl-fx-status-note" className={styles.plHelp}>{translation("key_pl_system_type_stays_active")}</p>}
            {error && <p className={`${styles.plFieldErr} ${styles.plFieldErrBlock}`} role="alert">{error}</p>}
        </Modal>
    );
};

TypeDialog.propTypes = { value: PropTypes.object.isRequired, onApply: PropTypes.func.isRequired, onClose: PropTypes.func.isRequired };

/* Add Item / Edit item: Description, Base amount (HK$) — blank is Missing — and Item use */
const ItemDialog = ({ value, onApply, onClose }) => {
    const [description, setDescription] = useState(value.description);
    const [amount, setAmount] = useState(value.amount == null ? "" : formatNumber(value.amount));
    const [itemUse, setItemUse] = useState(value.item_use);
    const [error, setError] = useState("");
    const apply = () => setError(onApply({ ...value, description, amount, item_use: itemUse }) || "");
    return (
        <Modal title={translation(value.isNew ? "key_add_item" : "key_pl_edit_item")} width={560} onClose={onClose} footer={<DialogFoot onClose={onClose} onApply={apply} />}>
            <FormGrid columns={2}>
                <Field label={translation("key_description")} htmlFor="pl-fx-description">
                    <TextInput id="pl-fx-description" value={description} autoComplete="off" onChange={(event) => setDescription(event.target.value)} />
                </Field>
                <Field label={translation("key_pl_base_amount_hkd")} htmlFor="pl-fx-amount">
                    {/* blank is Missing (not entered), 0 is HK$0 */}
                    <TextInput
                        id="pl-fx-amount"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder={translation("key_pl_missing")}
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                    />
                </Field>
                <Field label={translation("key_pl_item_use")} htmlFor="pl-fx-use">
                    <SelectBox id="pl-fx-use" value={itemUse} onChange={(event) => setItemUse(event.target.value)}>
                        {ITEM_USES.map((u) => <option key={u.id} value={u.id}>{translation(u.labelKey)}</option>)}
                    </SelectBox>
                </Field>
            </FormGrid>
            {error && <p className={`${styles.plFieldErr} ${styles.plFieldErrBlock}`} role="alert">{error}</p>}
        </Modal>
    );
};

ItemDialog.propTypes = { value: PropTypes.object.isRequired, onApply: PropTypes.func.isRequired, onClose: PropTypes.func.isRequired };

/* "Catalogue descriptions and amounts. Automatic additions are set in Items by service." with the page as a link */
const FixedHelp = ({ onOpenItemsByService }) => {
    const [before, after = ""] = translation("key_pl_fixed_help").split("%s");
    return (
        <p className={styles.plHelp}>
            {before}
            {onOpenItemsByService
                ? <button type="button" className={styles.plLink} onClick={onOpenItemsByService}>{translation("key_pl_items_by_service")}</button>
                : translation("key_pl_items_by_service")}
            {after}
        </p>
    );
};

FixedHelp.propTypes = { onOpenItemsByService: PropTypes.func };

const FixedItemsTab = () => {
    const pl = useFixedItems();
    const { data } = pl;
    const [dialog, setDialog] = useState(null);
    const openItemsByService = useFrameLink(PRICE_LIST_PAGE.ITEMS_BY_SERVICE);

    /* change the draft's catalogue, starting from the saved one */
    const withCatalogue = (fn) => pl.updateDraft((draft) => fn({
        types: draft.types || pl.saved.types.map((t) => ({ ...t })),
        items: draft.items || pl.saved.items.map((i) => ({ ...i })),
    }));
    const begin = (next) => setDialog(next);
    const applyType = (value) => {
        const error = typeError(value, pl.draft, pl.saved);
        if (error) return error;
        withCatalogue((cat) => {
            const row = { id: value.id, name: value.name.trim(), active: value.active };
            const at = cat.types.findIndex((t) => t.id === value.id);
            return { ...cat, types: at < 0 ? [...cat.types, row] : cat.types.map((t, i) => (i === at ? { ...t, ...row } : t)) };
        });
        setDialog(null);
        return "";
    };
    const applyItem = (value) => {
        const check = itemCheck(value, pl.draft, pl.saved);
        if (check.error) return check.error;
        withCatalogue((cat) => {
            const row = { id: value.id, type_id: value.type_id, description: value.description.trim(), amount: check.amount, item_use: value.item_use };
            const at = cat.items.findIndex((i) => i.id === value.id);
            return { ...cat, items: at < 0 ? [...cat.items, row] : cat.items.map((i, n) => (n === at ? row : i)) };
        });
        setDialog(null);
        return "";
    };

    const catalogue = currentCatalogue(pl.draft, pl.saved);
    const addType = () => begin({ kind: "type", value: { id: nextNewId("new-type", catalogue.types), name: "", active: true, isNew: true } });
    const scope = translation("key_pl_fixed_items_link");
    const head = (
        <PageHead title={scope}>
            {data && pl.canEdit && (
                <Btn variant="secondary" type="button" onClick={addType} disabled={pl.isSaving || Boolean(pl.blocked)}>
                    <Icon name="plus" size={14} /> {translation("key_pl_add_item_type")}
                </Btn>
            )}
        </PageHead>
    );
    if (!data) return <PageLoading pl={pl} toolbar={head} />;

    const editing = pl.isEditMode;
    const shown = editing ? catalogue : pl.saved;

    return (
        <div>
            {head}
            <FixedHelp onOpenItemsByService={openItemsByService} />
            {shown.types.map((type) => {
                const items = shown.items.filter((i) => i.type_id === type.id);
                const savedType = pl.saved.types.find((t) => t.id === type.id);
                const isSkillType = savedType?.type_key === SKILL_TYPE_KEY;
                return (
                    <section key={type.id} className={[styles.plSection, styles.plFiCard, type.active ? "" : styles.plCardOff].filter(Boolean).join(" ")} aria-label={type.name}>
                        <div className={styles.plSecHead}>
                            <div className={styles.plTypeName}>
                                <h3 className={styles.plSecTitle}>{type.name}</h3>
                                {editing && (
                                    <button type="button" className={styles.plLink} onClick={() => begin({ kind: "type", value: { ...type } })}>{translation("key_edit")}</button>
                                )}
                                {!type.active && <Badge variant="neutral">{translation("key_inactive")}</Badge>}
                            </div>
                            {editing && (
                                <Btn
                                    variant="secondary"
                                    type="button"
                                    disabled={pl.isSaving}
                                    onClick={() => begin({ kind: "item", value: { id: nextNewId("new-item", catalogue.items), type_id: type.id, description: "", amount: null, item_use: isSkillType ? "other_skill" : "general", isNew: true } })}
                                >
                                    <Icon name="plus" size={14} /> {translation("key_add_item")}
                                </Btn>
                            )}
                        </div>
                        {isSkillType && <p className={styles.plSecSub}>{translation("key_pl_skill_fee_sub")}</p>}
                        <div className={styles.plListWrap}>
                            <table className={`${styles.plList} ${styles.plListTall} ${styles.plStack}`} aria-label={type.name}>
                                <colgroup>
                                    <col />
                                    <col className={styles.plColFiAmount} />
                                    {editing && <col className={styles.plColFiAct} />}
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th scope="col">{translation("key_description")}</th>
                                        <th scope="col" className={styles.plNum}>{translation("key_pl_base_amount")}</th>
                                        {editing && <th scope="col"><span className={styles.plVisuallyHidden}>{translation("key_edit")}</span></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 ? (
                                        <tr><td colSpan={editing ? 3 : 2} className={styles.plMuted}>{translation("key_pl_no_items_yet")}</td></tr>
                                    ) : items.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                {item.description}
                                                {isSkillUse(item.item_use) && !isSkillType && <small className={styles.plAmtSrc}>{translation("key_pl_skill_overseas_only")}</small>}
                                            </td>
                                            {/* not entered is Missing; 0 is HK$0 */}
                                            <td className={styles.plNum}>
                                                {item.amount == null ? <Missing /> : <span className={styles.plVal}>{formatMoney(item.amount)}</span>}
                                            </td>
                                            {editing && (
                                                <td>
                                                    <button type="button" className={styles.plLink} onClick={() => begin({ kind: "item", value: { ...item } })}>{translation("key_edit")}</button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                );
            })}

            <FootBar pl={pl} scope={scope} />
            <ReviewDialog
                pl={pl}
                scope={scope}
                groups={pl.changes.length ? [{ title: "", rows: fixedReviewRows(pl.changes) }] : []}
                effects={pl.reviewOpen ? [...clearedEffect(clearedItems(pl.draft, pl.saved)), keepEffect()] : []}
            />
            <DiscardDialog pl={pl} scope={scope} />
            {dialog?.kind === "type" && <TypeDialog value={dialog.value} onApply={applyType} onClose={() => setDialog(null)} />}
            {dialog?.kind === "item" && <ItemDialog value={dialog.value} onApply={applyItem} onClose={() => setDialog(null)} />}
        </div>
    );
};

export default FixedItemsTab;
