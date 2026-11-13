import React from "react";
import PropTypes from "prop-types";
import { JO_DASH_STATUS_CARDS, JO_STATUS } from "../../jobOfferConstants";
import { joStatusFilterLabel } from "./jobOfferDashboardConfig";
import styles from "./JobOfferDashboard.module.css";

/* U-0253: a status the actor's Global Filter (JO Status) does not tick loses its card as well as its filter chip; its rows stay listed */
const JobOfferStatusCards = ({ activeStatusId, counts, allowedStatusIds = [], isAdmin = false, onToggle }) => (
    <div className={ styles.cards }>
        { JO_DASH_STATUS_CARDS.filter((card) => isAdmin || allowedStatusIds.length === 0 || allowedStatusIds.includes(card.id)).map((card) => {
            const label = joStatusFilterLabel(JO_STATUS[card.id]);
            const on = String(activeStatusId) === String(card.id);
            const count = counts?.[card.id];
            return (
                <button key={ card.id } type="button" className={ `${ styles.card }${ on ? ` ${ styles.cardOn }` : '' }` } aria-pressed={ on } onClick={ () => onToggle(card.id) }>
                    <span className={ styles.cardN }>{ count != null ? Number(count).toLocaleString('en-US') : '—' }</span>
                    <span className={ styles.cardL }>{ label }</span>
                    <span className={ styles.cardS } title={ card.subtitle }>{ card.subtitle }</span>
                </button>
            );
        }) }
    </div>
);

JobOfferStatusCards.propTypes = {
    activeStatusId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    counts: PropTypes.object,
    allowedStatusIds: PropTypes.array,
    isAdmin: PropTypes.bool,
    onToggle: PropTypes.func.isRequired,
};

export default React.memo(JobOfferStatusCards);
