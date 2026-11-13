import React from "react";
import PropTypes from "prop-types";
import { BUCKETS } from "./workerDashboardConfig";
import translation from "../../../../utils/translation";

/* prototype `mc-no-bucket-delta` (worker_AUDIT D7): the cards carry a count only — no ↑/↓ delta */
const BucketCards = ({ activeBucket, counts, visible, onSelect }) => (
    <div className={ `cards${ visible ? ' cards-compact' : '' }` } role="group" aria-label={ translation('key_dashboard') }>
        { BUCKETS.filter((b) => !visible || visible.includes(b.key)).map((b) => {
            const on = activeBucket === b.key;
            const count = counts?.[b.key];
            return (
                <button
                    key={ b.key }
                    type="button"
                    className={ `card${ on ? ' on' : '' }` }
                    aria-pressed={ on }
                    onClick={ () => onSelect(b.key) }
                >
                    <span className="n">{ count != null ? Number(count).toLocaleString('en-US') : '—' }</span>
                    <span className="l">{ b.label }</span>
                    <span className="s" title={ b.subtitle }>{ b.subtitle }</span>
                </button>
            );
        }) }
    </div>
);

BucketCards.propTypes = {
    activeBucket: PropTypes.string.isRequired,
    counts: PropTypes.object,
    visible: PropTypes.array,
    onSelect: PropTypes.func.isRequired,
};

export default React.memo(BucketCards);
