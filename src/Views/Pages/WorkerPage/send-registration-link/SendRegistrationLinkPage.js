import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import Select from "react-select";
import Btn from "../../../../components/ui/Btn";
import ConfirmModal from "../../../../components/ui/ConfirmModal";
import Icon from "../../../../components/Icon/Icon";
import { Field, SelectBox, TextInput } from "../../../../components/ui/FormControls";
import translation from "../../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../../utils/utils";
import routes from "../../routes/routesConfig";
import listStyles from "../../Invoice/InvoiceList.module.css";
import shared from "../../SettingsPage/newui/settings-newui.module.css";
import { SEND_REG_LINK_COPY, SEND_REG_LINK_FAILURE, SEND_REG_LINK_PHASE } from "../workerModuleConstants";
import useSendRegistrationLink from "./useSendRegistrationLink";
import styles from "./send-registration-link.module.css";

const matchesCodeOrName = (option, input) => {
    const query = String(input || "").trim().toLowerCase();
    if (!query) return true;
    const { code = "", name = "" } = option.data || {};
    return code.toLowerCase().includes(query) || name.toLowerCase().includes(query);
};

const Notice = ({ title, text, children }) => (
    <div className={styles.notice} role="status">
        <strong className={styles.noticeTitle}>{title}</strong>
        <span>{text}</span>
        {children}
    </div>
);
Notice.propTypes = { title: PropTypes.node, text: PropTypes.node, children: PropTypes.node };

const SendRegistrationLinkPage = () => {
    const f = useSendRegistrationLink();
    const title = headingCase(translation("key_send_registration_link"));
    const selectedAgency = useMemo(() => f.agencies.find((agency) => agency.value === f.values.agency_id) || null, [f.agencies, f.values.agency_id]);
    const branchLabel = f.branches.find((branch) => branch.value === f.values.branch_id)?.label || "";
    const partnerBranchLocked = f.isPartner && Boolean(f.values.branch_id);
    const isConflict = f.failure?.kind === SEND_REG_LINK_FAILURE.CONFLICT;
    const isPending = f.failure?.kind === SEND_REG_LINK_FAILURE.CONFLICT_PENDING;
    const [revoking, setRevoking] = useState(false);

    const renderBody = () => {
        switch (f.phase) {
            case SEND_REG_LINK_PHASE.BLOCKED_PERMISSION:
                return <Notice title={SEND_REG_LINK_COPY.unavailableTitle} text={SEND_REG_LINK_COPY.unavailablePermission} />;
            case SEND_REG_LINK_PHASE.BLOCKED_SCOPE:
                return <Notice title={SEND_REG_LINK_COPY.unavailableTitle} text={SEND_REG_LINK_COPY.unavailableScope} />;
            case SEND_REG_LINK_PHASE.CHOOSE_BRANCH:
                return (
                    <>
                        <p className={styles.help}>{SEND_REG_LINK_COPY.chooseBranchHelp}</p>
                        <div className={styles.tiles} role="radiogroup" aria-label={translation("key_branch")}>
                            {f.branches.map((branch) => (
                                <button
                                    key={branch.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={f.chosenBranch === branch.value}
                                    className={`${styles.tile}${f.chosenBranch === branch.value ? ` ${styles.tileOn}` : ""}`}
                                    onClick={() => f.setChosenBranch(branch.value)}
                                >
                                    {branch.label}
                                </button>
                            ))}
                        </div>
                    </>
                );
            case SEND_REG_LINK_PHASE.SENT:
                return (
                    <div className={styles.result}>
                        <strong className={styles.noticeTitle}>{SEND_REG_LINK_COPY.sentTitle}</strong>
                        <p className={styles.resultLine}>{f.result?.resent ? SEND_REG_LINK_COPY.resentText : SEND_REG_LINK_COPY.sentText} <b>{f.result?.email}</b></p>
                        <dl className={styles.facts}>
                            <div><dt>{translation("key_status")}</dt><dd>{SEND_REG_LINK_COPY.pendingInvitation}</dd></div>
                            <div><dt>{translation("key_worker_code")}</dt><dd className={styles.mono}>{translation("key_not_assigned")}</dd></div>
                        </dl>
                        <p className={styles.help}>{SEND_REG_LINK_COPY.sentHelp}</p>
                    </div>
                );
            case SEND_REG_LINK_PHASE.FAILED:
                return (
                    <div className={`${styles.result} ${styles.resultBad}`} role="alert">
                        <strong className={styles.noticeTitle}>{SEND_REG_LINK_COPY.failedTitle}</strong>
                        <p className={styles.resultLine}>{isPending ? SEND_REG_LINK_COPY.pendingText : isConflict ? SEND_REG_LINK_COPY.conflictText : (f.failure?.message || SEND_REG_LINK_COPY.failedText)}</p>
                    </div>
                );
            default:
                return (
                    <form id="send-registration-link-form" className={styles.form} onSubmit={f.onSubmit} noValidate>
                        {f.formError && <div className={styles.banner} role="alert">{f.formError}</div>}

                        <Field label={translation("key_partner_agency")} htmlFor="srl-agency" required error={f.errors.agency_id}>
                            {f.isPartner ? (
                                <TextInput id="srl-agency" value={f.partnerAgencyLabel} readOnly disabled />
                            ) : f.noEligibleAgency ? (
                                <>
                                    <TextInput id="srl-agency" value={SEND_REG_LINK_COPY.noEligibleAgency} readOnly disabled />
                                    <div className={styles.fieldError}>{SEND_REG_LINK_COPY.noEligibleAgencyHelp}</div>
                                </>
                            ) : (
                                <Select
                                    inputId="srl-agency"
                                    className={`${styles.agencySelect}${f.errors.agency_id ? ` ${styles.agencySelectInvalid}` : ""}`}
                                    classNamePrefix="srl-select"
                                    unstyled
                                    options={f.agencies}
                                    value={selectedAgency}
                                    onChange={(option) => f.setField("agency_id", option ? option.value : "")}
                                    filterOption={matchesCodeOrName}
                                    isLoading={f.agenciesLoading}
                                    isClearable
                                    isSearchable
                                    placeholder={SEND_REG_LINK_COPY.agencyPlaceholder}
                                    noOptionsMessage={() => translation("key_no_data_found")}
                                />
                            )}
                        </Field>

                        <Field label={translation("key_branch")} htmlFor="srl-branch" required error={f.errors.branch_id}>
                            {partnerBranchLocked ? (
                                <TextInput id="srl-branch" value={branchLabel} readOnly disabled />
                            ) : (
                                <SelectBox
                                    id="srl-branch"
                                    value={f.values.branch_id}
                                    onChange={(event) => f.setField("branch_id", event.target.value)}
                                    disabled={!f.values.agency_id || f.branchesLoading || f.noEligibleBranch}
                                    invalid={Boolean(f.errors.branch_id)}
                                >
                                    <option value="">
                                        {!f.values.agency_id ? SEND_REG_LINK_COPY.branchWaitsForAgency
                                            : f.branchesLoading ? translation("key_loading")
                                                : f.noEligibleBranch ? SEND_REG_LINK_COPY.noEligibleBranch
                                                    : translation("key_select_branch")}
                                    </option>
                                    {f.branches.map((branch) => <option key={branch.value} value={branch.value}>{branch.label}</option>)}
                                </SelectBox>
                            )}
                        </Field>

                        <Field label={translation("key_email")} htmlFor="srl-email" required error={f.errors.email} hint={SEND_REG_LINK_COPY.emailHint}>
                            <TextInput
                                id="srl-email"
                                type="email"
                                autoComplete="off"
                                spellCheck={false}
                                value={f.values.email}
                                onChange={(event) => f.setField("email", event.target.value)}
                                invalid={Boolean(f.errors.email)}
                                placeholder={SEND_REG_LINK_COPY.emailPlaceholder}
                            />
                        </Field>
                    </form>
                );
        }
    };

    const renderBar = () => {
        switch (f.phase) {
            case SEND_REG_LINK_PHASE.BLOCKED_PERMISSION:
            case SEND_REG_LINK_PHASE.BLOCKED_SCOPE:
                return <Btn variant="secondary" type="button" onClick={f.exit}>{SEND_REG_LINK_COPY.backToWorkers}</Btn>;
            case SEND_REG_LINK_PHASE.CHOOSE_BRANCH:
                return (
                    <>
                        <Btn variant="secondary" type="button" onClick={f.exit}>{translation("key_cancel")}</Btn>
                        <Btn variant="primary" type="button" onClick={f.continueWithBranch} disabled={!f.chosenBranch}>{translation("key_continue")}</Btn>
                    </>
                );
            case SEND_REG_LINK_PHASE.SENT:
                return (
                    <>
                        <Btn variant="secondary" type="button" onClick={f.sendAnother}>{SEND_REG_LINK_COPY.sendAnother}</Btn>
                        <Btn variant="primary" type="button" onClick={f.exit}>{translation("key_done")}</Btn>
                    </>
                );
            case SEND_REG_LINK_PHASE.FAILED:
                return (
                    <>
                        <Btn variant="secondary" type="button" disabled={f.acting} onClick={f.backToForm}>{translation("key_close")}</Btn>
                        {isPending && <Btn variant="secondary" type="button" disabled={f.acting} onClick={() => setRevoking(true)}>{SEND_REG_LINK_COPY.revoke}</Btn>}
                        {isPending && <Btn variant="primary" type="button" disabled={f.acting} onClick={f.resendPending}>{SEND_REG_LINK_COPY.resend}</Btn>}
                        {!isConflict && !isPending && <Btn variant="primary" type="button" onClick={f.retry}>{SEND_REG_LINK_COPY.retrySending}</Btn>}
                    </>
                );
            default:
                return (
                    <>
                        <Btn variant="secondary" type="button" onClick={f.exit} disabled={f.isSending}>{translation("key_cancel")}</Btn>
                        <Btn variant="primary" type="submit" form="send-registration-link-form" disabled={f.sendDisabled} aria-busy={f.isSending || undefined}>
                            {f.isSending ? `${translation("key_sending")}…` : translation("key_send_link")}
                        </Btn>
                    </>
                );
        }
    };

    return (
        <div className={`${listStyles.pageWrap} ${styles.page}`}>
            <nav className={shared.breadcrumb} aria-label={translation("key_workers")}>
                <Link to={absoluteRoute(routes.workers)}>{headingCase(translation("key_workers"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{title}</span>
            </nav>

            <section className={shared.card} data-mc-send-registration-link="1">
                <div className={shared.cardHead}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{title}</h1>
                    <p className={styles.help}>{SEND_REG_LINK_COPY.help}</p>
                </div>
                {renderBody()}
                <div className={styles.bar}>{renderBar()}</div>
            </section>
            {revoking && (
                <ConfirmModal title={SEND_REG_LINK_COPY.revokeConfirmTitle} body={SEND_REG_LINK_COPY.revokeConfirmText} danger busy={f.acting}
                    confirmLabel={SEND_REG_LINK_COPY.revoke} cancelLabel={translation("key_cancel")}
                    onConfirm={async () => { await f.revokePending(); setRevoking(false); }} onClose={() => setRevoking(false)} />
            )}
        </div>
    );
};

export default SendRegistrationLinkPage;
