import React, { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import Btn from "../../../../../../components/ui/Btn";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import { absoluteRoute, headingCase, toTitleCase } from "../../../../../../utils/utils";
import routes from "../../../../routes/routesConfig";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import styles from "./ImportShiftRoster.module.css";
import useImportShiftRoster from "./useImportShiftRoster";
import { BYTES_PER_MB, XLSX_EXTENSION } from "../../settingsNewUiConstants";

const ImportResultModal = lazy(() => import("./ImportResultModal"));

const ImportShiftRosterPage = () => {
    const page = useImportShiftRoster();
    const title = headingCase(translation("key_import_shift_roster"));

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.shiftCodes)}>{toTitleCase(translation("key_shift_codes"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{title}</span>
            </nav>

            <div className={shared.card}>
                <div className={`${shared.cardHead} ${styles.cardHead}`}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{title}</h1>
                    <Btn variant="secondary" type="button" onClick={page.downloadTemplate}>
                        <Icon name="download" size={14} /> {translation("key_export_template")}
                    </Btn>
                </div>

                <div className={styles.body}>
                    {page.uploadedFile ? (
                        <div className={styles.fileCard}>
                            <span className={styles.fileIcon}><Icon name="filetext" size={18} /></span>
                            <div className={styles.fileText}>
                                <span className={styles.fileName} title={page.uploadedFile.filename}>{page.uploadedFile.filename}</span>
                                <span className={styles.fileMeta}>{(page.uploadedFile.size / BYTES_PER_MB).toFixed(2)} MB</span>
                            </div>
                            <div className={styles.fileActions}>
                                <button type="button" className={shared.rowIconBtn} onClick={page.downloadUploaded} title={translation("key_download")} aria-label={translation("key_download")}>
                                    <Icon name="download" size={14} />
                                </button>
                                <button type="button" className={shared.rowIconBtn} onClick={page.clearFile} title={translation("key_remove")} aria-label={translation("key_remove")}>
                                    <Icon name="trash" size={14} />
                                </button>
                                <Btn variant="ghost" type="button" onClick={page.uploadAgain}>
                                    <Icon name="upload" size={13} /> {translation("key_upload")}
                                </Btn>
                            </div>
                        </div>
                    ) : (
                        <label
                            className={`${styles.dropZone} ${page.fileError ? styles.dropZoneInvalid : ""}`}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={page.onDrop}
                        >
                            <input ref={page.inputRef} type="file" accept={XLSX_EXTENSION} className={styles.dropInput} onChange={page.onInputChange} />
                            <span className={styles.dropIcon}><Icon name="upload" size={20} /></span>
                            <span className={styles.dropText}>{translation("key_drag_and_drop_to_upload_max_5m")}</span>
                            <span className={styles.dropHint}>{XLSX_EXTENSION}</span>
                        </label>
                    )}
                    {page.fileError && <div className={styles.fileError} role="alert">{page.fileError}</div>}

                    <p className={styles.help}>
                        {translation("key_kindly_download_the_template_to_your_upper_right_complete_it_and_then_upload_it_above_thank_you")}
                    </p>
                </div>

                <div className={shared.formFoot}>
                    <Btn variant="secondary" type="button" onClick={page.onCancel} disabled={page.isImporting}>
                        {translation("key_cancel")}
                    </Btn>
                    <span className={shared.formFootSpacer} />
                    <Btn variant="primary" type="button" onClick={page.run} disabled={!page.uploadedFile || page.isImporting}>
                        {page.isImporting ? translation("key_saving") : translation("key_run")}
                    </Btn>
                </div>
            </div>

            <Suspense fallback={null}>
                {page.isResultOpen && (
                    <ImportResultModal headers={page.feedbackHeaders} onClose={page.closeResult} onDownloadFeedback={page.downloadFeedback} />
                )}
            </Suspense>
        </div>
    );
};

export default ImportShiftRosterPage;
