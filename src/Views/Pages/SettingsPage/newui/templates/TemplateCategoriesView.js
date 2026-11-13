import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import DataTable from "../../../../../components/ui/DataTable";
import Modal from "../../../../../components/ui/Modal";
import Btn from "../../../../../components/ui/Btn";
import { SelectBox } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { getTemplateConfigurationList } from "../../../../../services/templates";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "./Template.module.css";
import TemplateCategoryPanel from "./TemplateCategoryPanel";
import { TEMPLATE_MODE, channelLabel, familyLabel, fieldOptionLabel, languageLabel, modeLabel, recipientLabel, statusLabel } from "./templateConfiguration";

/* Settings → Send Template Manager → Categories (10 Nov 2026 package, F-16): every category's configuration, read-only
   (owner ruling Q1) — how it is sent, to whom with which fields, the languages it must carry against what the library holds,
   and the screens that send it today. A row opens the full configuration. */

const LANGUAGE_CODE = { en: "EN", zhh: "TC", zh_CN: "SC", id: "ID" };
const MODE_TONE = { [TEMPLATE_MODE.MANUAL]: "neutral", [TEMPLATE_MODE.AUTOMATIC]: "purple", [TEMPLATE_MODE.INTERNAL]: "dark" };
const MODE_SHORT_KEY = { [TEMPLATE_MODE.MANUAL]: "key_manual", [TEMPLATE_MODE.AUTOMATIC]: "key_st_mode_automatic_short", [TEMPLATE_MODE.INTERNAL]: "key_st_mode_internal_short" };
const Dash = () => <span className={listStyles.mutedDash}>—</span>;

const LanguagesCell = ({ row }) => {
    const required = row.configuration?.required_languages || [];
    const missing = new Set(row.library?.missing_required_languages || []);
    if (!required.length) return <Dash />;
    return (
        <span className={shared.softCell}>
            {required.map((code) => (
                <span key={code} className={styles.configLanguage} data-missing={missing.has(code) || undefined} title={missing.has(code) ? `${ languageLabel(code) } · ${ translation("key_st_no_template_yet") }` : languageLabel(code)}>
                    {missing.has(code) ? <span className={styles.configMissing}>{LANGUAGE_CODE[code] || code}</span> : (LANGUAGE_CODE[code] || code)}
                </span>
            ))}
        </span>
    );
};
LanguagesCell.propTypes = { row: PropTypes.object.isRequired };

const LibraryCell = ({ row }) => {
    const counts = row.library?.template_counts || {};
    const parts = Object.keys(LANGUAGE_CODE).filter((code) => counts[code]).map((code) => `${ LANGUAGE_CODE[code] } ${ counts[code] }`);
    return parts.length ? <span className={shared.softCell}>{parts.join(" · ")}</span> : <span className={styles.configMissing}>0</span>;
};
LibraryCell.propTypes = { row: PropTypes.object.isRequired };

const columns = () => [
    {
        key: "category", label: translation("key_category"), minWidth: 220, sticky: true,
        render: (row) => (
            <span>
                <span className={shared.nameText}>{row.category.name_en}</span>
                {row.category.status === 0 && <span className={`${ listStyles.statusTag } ${ styles.inactiveTag }`} data-tone="neutral">{translation("key_st_inactive_category")}</span>}
            </span>
        ),
    },
    { key: "module", label: translation("key_module"), width: 110, render: (row) => <span className={shared.codeCell}>{row.category.module_key}</span> },
    {
        key: "mode", label: translation("key_st_sending"), width: 140,
        render: (row) => <span className={listStyles.statusTag} data-tone={MODE_TONE[row.configuration?.mode] || "neutral"} title={modeLabel(row.configuration?.mode)}>{translation(MODE_SHORT_KEY[row.configuration?.mode] || "key_manual")}</span>,
    },
    { key: "channels", label: translation("key_st_channels"), width: 150, render: (row) => (row.configuration?.channels?.length ? <span className={shared.softCell}>{row.configuration.channels.map(channelLabel).join(" · ")}</span> : <span className={shared.softCell}>{translation("key_st_channel_held")}</span>) },
    { key: "recipients", label: translation("key_st_recipients"), minWidth: 180, render: (row) => (row.recipients?.length ? <span className={shared.softCell}>{row.recipients.map((r) => recipientLabel(r.key)).join(" · ")}</span> : <Dash />) },
    { key: "languages", label: translation("key_st_required_languages"), width: 150, render: (row) => <LanguagesCell row={row} /> },
    { key: "library", label: translation("key_st_library"), width: 150, render: (row) => <LibraryCell row={row} /> },
    { key: "sites", label: translation("key_st_send_sites"), width: 150, render: (row) => (row.sites?.length ? <span className={shared.softCell}>{row.sites.map((s) => s.code).join(" · ")}</span> : <Dash />) },
    { key: "status", label: translation("key_status"), minWidth: 190, render: (row) => <span className={shared.softCell}>{statusLabel(row.configuration?.binding_status)}</span> },
];

/* Each recipient and the fields a template written for it may use, by family (TM01: no union across recipients). */
const RecipientFieldList = ({ row, fieldsById }) => (
    <ul className={styles.recipientFields} data-testid="recipient-field-list">
        {(row.recipients || []).map((recipient) => {
            const fields = recipient.field_ids.map((id) => fieldsById.get(id)).filter(Boolean);
            const families = [...new Set(fields.map((f) => f.family))];
            return (
                <li key={recipient.key} data-recipient={recipient.key}>
                    <div className={styles.recipientFieldsHead}>{recipientLabel(recipient.key)} · {fields.length}</div>
                    {families.map((family) => (
                        <div key={family}>
                            <span className={styles.recipientFieldsFamily}>{familyLabel(family)}: </span>
                            {fields.filter((f) => f.family === family).map(fieldOptionLabel).join(", ")}
                        </div>
                    ))}
                </li>
            );
        })}
    </ul>
);
RecipientFieldList.propTypes = { row: PropTypes.object.isRequired, fieldsById: PropTypes.instanceOf(Map).isRequired };

const TemplateCategoriesView = ({ moduleList }) => {
    const [module, setModule] = useState("");
    const [data, setData] = useState({ categories: [], fields: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selected, setSelected] = useState(null);
    const seq = useRef(0);

    const load = useCallback((moduleKey) => {
        const current = ++seq.current;
        setIsLoading(true);
        setError(null);
        getTemplateConfigurationList(moduleKey ? { module: moduleKey } : {})
            .then((res) => {
                if (current !== seq.current) return;
                const payload = res?.data?.data?.data || {};
                setData({ categories: Array.isArray(payload.categories) ? payload.categories : [], fields: Array.isArray(payload.fields) ? payload.fields : [] });
            })
            .catch((err) => { if (current === seq.current) setError(err?.response?.data?.message || true); })
            .finally(() => { if (current === seq.current) setIsLoading(false); });
    }, []);

    useEffect(() => { load(module); }, [load, module]);

    const fieldsById = useMemo(() => new Map(data.fields.map((f) => [Number(f.id), f])), [data.fields]);
    const tableColumns = useMemo(() => columns(), []);
    const close = useCallback(() => setSelected(null), []);

    return (
        <>
            <div className={shared.filtersRow}>
                <SelectBox id="tpl-categories-module" value={module} onChange={(event) => setModule(event.target.value)} aria-label={translation("key_module")}>
                    <option value="">{translation("key_st_all_modules")}</option>
                    {moduleList.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </SelectBox>
            </div>
            <DataTable
                columns={tableColumns}
                rows={data.categories}
                rowKey={(row) => row.category.id}
                isLoading={isLoading}
                error={error}
                unitLabel={translation("key_st_categories").toLowerCase()}
                onRowClick={setSelected}
                onRetry={() => load(module)}
            />
            {selected && (
                <Modal
                    title={selected.category.name_en}
                    subtitle={`${ selected.category.module_key } · ${ selected.category.slug }`}
                    width={760}
                    onClose={close}
                    closeLabel={translation("key_close")}
                    footer={<Btn variant="secondary" onClick={close}>{translation("key_close")}</Btn>}
                >
                    <TemplateCategoryPanel configuration={selected} />
                    {selected.recipients?.length > 0 && <RecipientFieldList row={selected} fieldsById={fieldsById} />}
                </Modal>
            )}
        </>
    );
};

TemplateCategoriesView.propTypes = {
    moduleList: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, name: PropTypes.string })).isRequired,
};

export default TemplateCategoriesView;
