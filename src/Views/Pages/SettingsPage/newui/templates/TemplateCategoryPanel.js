import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../../utils/translation";
import styles from "./Template.module.css";
import { channelLabel, languageLabel, modeLabel, recipientLabel, statusLabel } from "./templateConfiguration";

/* A category's Send Template configuration, read-only (owner ruling Q1): how it is sent, on which channels, to whom, which
   languages it must carry (and which the library still lacks), its package status and the screens that send it. */
const TemplateCategoryPanel = ({ configuration }) => {
    if (!configuration) return null;
    const config = configuration.configuration || {};
    const missing = new Set(configuration.library?.missing_required_languages || []);
    const notes = Array.isArray(config.notes) ? config.notes : [];
    const sites = Array.isArray(configuration.sites) ? configuration.sites : [];
    const recipients = Array.isArray(configuration.recipients) ? configuration.recipients : [];
    return (
        <section className={styles.configPanel} aria-label={translation("key_st_category_configuration")} data-testid="template-category-panel">
            <dl className={styles.configGrid}>
                <div>
                    <dt>{translation("key_st_sending")}</dt>
                    <dd data-field="mode">{modeLabel(config.mode)}</dd>
                </div>
                <div>
                    <dt>{translation("key_st_channels")}</dt>
                    <dd data-field="channels">{config.channels?.length ? config.channels.map(channelLabel).join(" · ") : translation("key_st_channel_held")}</dd>
                </div>
                <div>
                    <dt>{translation("key_st_recipients")}</dt>
                    <dd data-field="recipients">{recipients.length ? recipients.map((r) => recipientLabel(r.key)).join(" · ") : "—"}</dd>
                </div>
                <div>
                    <dt>{translation("key_st_required_languages")}</dt>
                    <dd data-field="languages">
                        {config.required_languages?.length ? config.required_languages.map((code) => (
                            <span key={code} className={styles.configLanguage} data-missing={missing.has(code) || undefined}>
                                {languageLabel(code)}{missing.has(code) && <span className={styles.configMissing}> · {translation("key_st_no_template_yet")}</span>}
                            </span>
                        )) : "—"}
                    </dd>
                </div>
                <div>
                    <dt>{translation("key_status")}</dt>
                    <dd data-field="status">{statusLabel(config.binding_status)}</dd>
                </div>
                <div>
                    <dt>{translation("key_st_send_sites")}</dt>
                    <dd data-field="sites">{sites.length ? sites.map((s) => <span key={s.code} className={styles.configSite} title={s.label_en}>{s.code}</span>) : translation("key_st_no_send_site")}</dd>
                </div>
            </dl>
            {notes.length > 0 && (
                <details className={styles.configNotes}>
                    <summary>{translation("key_st_package_notes")}</summary>
                    <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul>
                </details>
            )}
        </section>
    );
};

TemplateCategoryPanel.propTypes = {
    configuration: PropTypes.shape({
        configuration: PropTypes.object,
        recipients: PropTypes.array,
        sites: PropTypes.array,
        library: PropTypes.object,
    }),
};

export default TemplateCategoryPanel;
