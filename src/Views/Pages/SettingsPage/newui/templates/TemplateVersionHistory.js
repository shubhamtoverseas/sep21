import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import translation from "../../../../../utils/translation";
import { getTemplateVersions } from "../../../../../services/templates";
import { gcHtmlToText } from "../../../Conversaction/newui/gcHelpers";
import styles from "./Template.module.css";

const VERSION_DATE_FORMAT = "DD MMM YYYY HH:mm";

/*
 * Version history of a template (10 Nov 2026 package F-30 / TM06; settings-api S9): every save is an immutable version,
 * newest first — who saved it, when, its exact text and attachment. Read-only: a past version is never edited or restored
 * here, and a send keeps the version it used. Version 1 of a template saved before version history began is marked so.
 */
const TemplateVersionHistory = ({ templateId }) => {
    const [versions, setVersions] = useState(null);
    useEffect(() => {
        if (!templateId) return undefined;
        let alive = true;
        getTemplateVersions({ template_content_id: templateId })
            .then((res) => { if (alive) setVersions(Array.isArray(res?.data?.data?.data) ? res.data.data.data : []); })
            .catch(() => { if (alive) setVersions([]); });
        return () => { alive = false; };
    }, [templateId]);

    if (!templateId || !versions?.length) return null;
    return (
        <details className={styles.versionPanel} data-testid="template-version-history">
            <summary>{translation("key_st_version_history")} ({versions.length})</summary>
            <ol className={styles.versionList}>
                {versions.map((v) => (
                    <li key={v.id} data-version={v.version}>
                        <details>
                            <summary>
                                <span className={styles.versionNo}>{translation("key_st_version")} {v.version}</span>
                                <span className={styles.versionMeta}>
                                    {v.saved_at ? dayjs(v.saved_at).format(VERSION_DATE_FORMAT) : "—"}
                                    {v.saved_by_name ? ` · ${ translation("key_st_saved_by") } ${ v.saved_by_name }` : ""}
                                    {v.source === "backfill" ? ` · ${ translation("key_st_version_backfill") }` : ""}
                                </span>
                            </summary>
                            <div className={styles.versionBody}>{gcHtmlToText(v.template_content) || "—"}</div>
                            {v.file_path && (
                                <a className={styles.versionFile} href={v.file_path} target="_blank" rel="noopener noreferrer">
                                    {String(v.file_path).split("/").pop()}
                                </a>
                            )}
                        </details>
                    </li>
                ))}
            </ol>
        </details>
    );
};

TemplateVersionHistory.propTypes = {
    templateId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default TemplateVersionHistory;
