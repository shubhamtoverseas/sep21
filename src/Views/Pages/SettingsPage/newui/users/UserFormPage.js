import React, { lazy, Suspense, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { FormProvider } from "react-hook-form";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import ConfirmModal from "../../../../../components/ui/ConfirmModal";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import FullDisplayLoader from "../../../../../components/ReusableComponents/fullDisplayLoader";
import translation from "../../../../../utils/translation";
import { toTitleCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "./UserForm.module.css";
import useUserForm from "./useUserForm";
import { USER_FORM_TAB, USER_FORM_TABS } from "../settingsNewUiConstants";
import { PERM_COPY_KEYS, t } from "./permissions/permissionCatalogue";

const UserBasicInfoTab = lazy(() => import("./tabs/UserBasicInfoTab"));
const UserSalaryTab = lazy(() => import("./tabs/UserSalaryTab"));
const UserSecurityTab = lazy(() => import("./tabs/UserSecurityTab"));
const UserPermissionsTab = lazy(() => import("./tabs/UserPermissionsTab"));
const PermissionReviewDialog = lazy(() => import("./permissions/PermissionReviewDialog"));
const PermissionStaleDialog = lazy(() => import("./permissions/PermissionStaleDialog"));
const PermissionHistoryDialog = lazy(() => import("./permissions/PermissionHistoryDialog"));

/*
 * Add / Edit User wizard (4 steps), or — with `permissionsOnly` (U-0357, 21 Oct) — the Permissions page of the selected
 * user: Settings → People → Users → Permissions, account identity with read-only User Type, the editor, the save bar.
 */
const UserFormPage = ({ permissionsOnly = false }) => {
    const user = useUserForm({ permissionsOnly });
    const [discardOpen, setDiscardOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    /* save-bar notice (prototype state.message): set by Discard / Copy, cleared by the next permission change */
    const [statusMsg, setStatusMsg] = useState("");
    const title = permissionsOnly ? toTitleCase(translation("key_permissions")) : `${toTitleCase(translation(user.isEdit ? "key_edit" : "key_add"))} ${toTitleCase(translation("key_user"))}`;
    const onPermissionTab = user.activeKey === USER_FORM_TAB.PERMISSION;
    const who = { name: [user.methods.getValues("first_name"), user.methods.getValues("last_name")].filter(Boolean).join(" ") || user.currentUser?.name || "", type: translation(user.audience === "partner" ? "key_partner" : "key_internal") };

    const changeDraft = (grants) => { setStatusMsg(""); user.setPermDraft(grants); };
    const applyCopy = (grants) => { user.applyCopiedGrants(grants); setStatusMsg(t(PERM_COPY_KEYS.copyApplied)); };
    const discard = () => { user.discardPermissions(); setStatusMsg(t(PERM_COPY_KEYS.changesDiscarded)); setDiscardOpen(false); };
    /* prototype Cancel: with unsaved permission changes it offers to discard them; otherwise it leaves the wizard as before */
    const cancel = onPermissionTab && user.permissionsDirty ? () => setDiscardOpen(true) : user.onCancel;
    const statusText = statusMsg || t(user.permissionsDirty ? PERM_COPY_KEYS.unsaved : PERM_COPY_KEYS.noUnsaved);

    const renderTab = () => {
        switch (user.activeKey) {
            case USER_FORM_TAB.SALARY:
                return <UserSalaryTab loadOnce={user.loadOnce} />;
            case USER_FORM_TAB.SECURITY:
                return <UserSecurityTab mfaEnabled={user.mfaEnabled} onToggleMfa={user.toggleMfa} />;
            case USER_FORM_TAB.PERMISSION:
                return (
                    <UserPermissionsTab
                        id={user.id}
                        isEdit={user.isEdit}
                        showScope={!permissionsOnly}
                        showEditor={permissionsOnly}
                        currentUser={user.currentUser}
                        mappingIds={user.mappingIds}
                        loadOnce={user.loadOnce}
                        perm={user.perm}
                        audience={user.audience}
                        permDraft={user.permDraft}
                        permSaved={user.permSaved}
                        permAlert={user.permError}
                        onChangeDraft={changeDraft}
                        onApplyCopy={applyCopy}
                        loadUserGrants={user.loadUserGrants}
                        onHistory={user.canViewHistory ? () => setHistoryOpen(true) : undefined}
                        readOnlyModules={user.readOnlyModules}
                        readOnlyNote={t(PERM_COPY_KEYS.eligibilityReadOnly)}
                    />
                );
            default:
                return (
                    <UserBasicInfoTab
                        isEdit={user.isEdit}
                        currentUser={user.currentUser}
                        userStatus={user.userStatus}
                        onToggleStatus={user.toggleUserStatus}
                        loadOnce={user.loadOnce}
                    />
                );
        }
    };

    return (
        <div className={`${listStyles.pageWrap} ${styles.pageWithBar}`}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                {permissionsOnly && (
                    <>
                        <Link to={routes.settings}>{translation("key_settings")}</Link>
                        <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                        <Link to={routes.settings}>{translation("key_people")}</Link>
                        <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                    </>
                )}
                <Link to={`/${routes.users}`}>{translation("key_users")}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{title}</span>
            </nav>

            <FormProvider {...user.methods}>
                {/* Save is a plain button: the last tab reviews the permission changes before anything is written */}
                <form className={shared.card} onSubmit={(event) => { event.preventDefault(); if (user.isLastTab) user.requestSubmit(); }} noValidate>
                    <div className={shared.cardHead}>
                        <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{title}</h1>
                    </div>

                    {!permissionsOnly && <div className={styles.tabs} role="tablist">
                        {USER_FORM_TABS.map((tab, index) => {
                            const active = tab.key === user.activeKey;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                                    onClick={() => user.selectTab(tab.key)}
                                    disabled={user.isSaving}
                                >
                                    <span className={styles.tabStep}>{index + 1}</span>
                                    {translation(tab.labelKey)}
                                </button>
                            );
                        })}
                    </div>}

                    {user.isLoading ? (
                        <div className={shared.loadingState}>{translation("key_loading")}…</div>
                    ) : (
                        <Suspense fallback={<div className={shared.loadingState}>{translation("key_loading")}…</div>}>
                            {renderTab()}
                        </Suspense>
                    )}

                    <div className={`${styles.footer} ${onPermissionTab ? styles.footerJoined : ""}`}>
                        {onPermissionTab && (
                            <span className={`upm upm-status${user.permissionsDirty && !statusMsg ? " dirty" : ""}`} role="status">{statusText}</span>
                        )}
                        <div className={styles.footerActions}>
                            <Btn variant="secondary" type="button" onClick={cancel} disabled={user.isSaving}>
                                {translation("key_cancel")}
                            </Btn>
                            {!permissionsOnly && user.tabIndex > 0 && (
                                <Btn variant="secondary" type="button" onClick={user.goToPrev} disabled={user.isSaving}>
                                    <Icon name="chev_left" size={13} /> {translation("key_back")}
                                </Btn>
                            )}
                            {user.isLastTab ? (
                                <Btn key="save" variant="primary" type="button" onClick={user.requestSubmit} disabled={user.isSaving || user.isLoading} aria-busy={user.isSaving}>
                                    {user.isSaving ? <><CustomSpinner variant="inline" /> {translation("key_saving")}</> : (user.permissionsDirty ? t(PERM_COPY_KEYS.review) : translation("key_save"))}
                                </Btn>
                            ) : (
                                <Btn key="next" variant="primary" type="button" onClick={user.goToNext} disabled={user.isLoading}>
                                    {translation("key_next")} <Icon name="chev_right" size={13} />
                                </Btn>
                            )}
                        </div>
                    </div>
                </form>
            </FormProvider>

            {user.reviewOpen && (
                <Suspense fallback={null}>
                    <PermissionReviewDialog
                        title={t(PERM_COPY_KEYS.review)}
                        engine={user.perm.engine}
                        rows={user.perm.rows}
                        bindingOf={user.perm.bindingOf}
                        audience={user.audience}
                        diffs={user.permissionDiffs}
                        who={who}
                        onClose={user.closeReview}
                        busy={user.isSaving}
                        footer={(
                            <>
                                <span className="grow" />
                                <Btn variant="secondary" type="button" onClick={user.closeReview} disabled={user.isSaving}>{t(PERM_COPY_KEYS.keepEditing)}</Btn>
                                <Btn variant="primary" type="button" onClick={user.confirmReview} disabled={user.isSaving} aria-busy={user.isSaving}>
                                    {user.isSaving ? <><CustomSpinner variant="inline" /> {translation("key_saving")}</> : t(PERM_COPY_KEYS.saveChanges)}
                                </Btn>
                            </>
                        )}
                    />
                </Suspense>
            )}
            {/* the save is two sequential API calls: the whole page waits, not only the button */}
            {user.isSaving && <FullDisplayLoader />}
            {user.stale && (
                <Suspense fallback={null}>
                    <PermissionStaleDialog stale={user.stale} engine={user.perm.engine} rows={user.perm.rows} bindingOf={user.perm.bindingOf} audience={user.audience} template={user.permTemplate}
                        saved={user.permSaved} draft={user.permDraft} who={who} busy={user.isSaving} onReload={user.reloadAndReview} onDiscard={user.discardMine} onClose={user.closeStale} />
                </Suspense>
            )}
            {historyOpen && (
                <Suspense fallback={null}>
                    <PermissionHistoryDialog staffId={user.id} rows={user.perm.rows} bindingOf={user.perm.bindingOf} audience={user.audience} template={user.permTemplate} who={who} onClose={() => setHistoryOpen(false)} />
                </Suspense>
            )}
            {discardOpen && (
                <ConfirmModal
                    title={t(PERM_COPY_KEYS.discardTitle)}
                    body={t(PERM_COPY_KEYS.discardBody)}
                    confirmLabel={t(PERM_COPY_KEYS.discard)}
                    cancelLabel={t(PERM_COPY_KEYS.keepEditing)}
                    danger
                    onConfirm={discard}
                    onClose={() => setDiscardOpen(false)}
                />
            )}
        </div>
    );
};

UserFormPage.propTypes = {
    /* U-0357: render the Permissions page of the selected user instead of the 4-step wizard */
    permissionsOnly: PropTypes.bool,
};

export default UserFormPage;
