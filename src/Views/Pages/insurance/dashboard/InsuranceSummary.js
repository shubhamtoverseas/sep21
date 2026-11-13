import React from "react";
import PropTypes from "prop-types";
import styles from "./InsuranceDashboard.module.css";
import { COVERAGE_LABELS, REQUEST_TYPES, coverageLabel, translation } from "./insuranceDashboardConfig";

/* Status cards count coverage, work chips count workload; they do not add up (INDEX §2.8).
   Restricted viewers see "n shown" — counts of displayed rows only. */

const CARD_DESC_KEYS = {
    active: "key_ins_card_active_desc",
    future: "key_ins_card_future_desc",
    none: "key_ins_card_none_desc",
};

const shown = (n, restricted) => (restricted ? `${n} ${translation("key_ins_shown")}` : String(n));

const InsuranceSummary = ({ cards, work, restricted, coverage, request, review, onCoverage, onRequest, onReview }) => {
    const requestsOn = request.length > 0;
    const attentionOn = review === "open";
    const requestsLabel = translation("key_ins_work_requests");
    const attentionLabel = translation("key_ins_work_attention");
    const suffix = restricted ? ` ${translation("key_ins_shown")}` : "";
    return (
        <>
            <div className={styles.cards} role="group" aria-label={translation("key_ins_col_coverage_status")}>
                {COVERAGE_LABELS.map((label) => {
                    const on = coverage.length === 1 && coverage[0] === label;
                    return (
                        <button
                            key={label}
                            type="button"
                            className={`${styles.card} ${on ? styles.cardOn : ""}`}
                            aria-pressed={on}
                            onClick={() => onCoverage(on ? [] : [label])}
                        >
                            <span className={styles.cardN}>{shown(cards?.[label] ?? 0, restricted)}</span>
                            <span className={styles.cardL}>{coverageLabel(label)}</span>
                            <span className={styles.cardD}>{translation(CARD_DESC_KEYS[label])}</span>
                        </button>
                    );
                })}
            </div>
            <div className={styles.chips} role="group" aria-label={translation("key_ins_work")}>
                <button
                    type="button"
                    className={`${styles.chip} ${requestsOn ? styles.chipOn : ""}`}
                    aria-pressed={requestsOn}
                    aria-label={`${requestsLabel}: ${work?.requests ?? 0}${suffix}`}
                    onClick={() => onRequest(requestsOn ? [] : [...REQUEST_TYPES])}
                >
                    <span className={`${styles.dot} ${styles.dotRequests}`} aria-hidden="true" />
                    {`${work?.requests ?? 0} · ${requestsLabel}${suffix}`}
                </button>
                <button
                    type="button"
                    className={`${styles.chip} ${attentionOn ? styles.chipOn : ""}`}
                    aria-pressed={attentionOn}
                    aria-label={`${attentionLabel}: ${work?.attention ?? 0}${suffix}`}
                    onClick={() => onReview(attentionOn ? "" : "open")}
                >
                    <span className={`${styles.dot} ${styles.dotAttention}`} aria-hidden="true" />
                    {`${work?.attention ?? 0} · ${attentionLabel}${suffix}`}
                </button>
            </div>
        </>
    );
};

InsuranceSummary.propTypes = {
    cards: PropTypes.shape({ active: PropTypes.number, future: PropTypes.number, none: PropTypes.number }),
    work: PropTypes.shape({ requests: PropTypes.number, attention: PropTypes.number }),
    restricted: PropTypes.bool,
    coverage: PropTypes.arrayOf(PropTypes.string).isRequired,
    request: PropTypes.arrayOf(PropTypes.string).isRequired,
    review: PropTypes.string,
    onCoverage: PropTypes.func.isRequired,
    onRequest: PropTypes.func.isRequired,
    onReview: PropTypes.func.isRequired,
};

export default React.memo(InsuranceSummary);
