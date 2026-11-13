import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../utils/translation";
import { EM_DASH } from "./contractDashboardUtils";
import { CD_STATUS_DESC_KEYS, CD_STATUS_KEYS, CD_STATUS_LABEL_KEYS } from "../contractConstants";

/**
 * The four lifecycle cards (prototype cardsHTML): exactly one selected; a card the account may not see keeps its
 * place with `—`, the neutral disabled treatment and nothing to press. Before the first answer the count is a
 * placeholder bar, never the no-access dash.
 */
const StatusCards = ({ cards, status, onPick }) => {
    const byKey = new Map((cards || []).map((card) => [card.key, card]));
    return (
        <div className="cards mc-status-cards" role="group" aria-label={ translation("key_contract_status") }>
            { CD_STATUS_KEYS.map((key) => {
                const card = byKey.get(key);
                const noAccess = Boolean(card?.disabled);
                const on = !noAccess && key === status;
                const display = card ? (noAccess ? EM_DASH : (card.display ?? card.count ?? EM_DASH)) : null;
                return (
                    <button
                        key={ key }
                        type="button"
                        className={ `card${ on ? " on" : "" }${ noAccess ? " noaccess" : "" }` }
                        aria-pressed={ noAccess ? undefined : on }
                        aria-disabled={ noAccess ? "true" : undefined }
                        tabIndex={ noAccess ? -1 : undefined }
                        onClick={ noAccess ? undefined : () => onPick(key) }
                    >
                        <span className="n">{ display === null ? <span className="skel" aria-hidden="true" /> : display }</span>
                        <span className="l">{ translation(CD_STATUS_LABEL_KEYS[key]) }</span>
                        <span className="s">{ translation(CD_STATUS_DESC_KEYS[key]) }</span>
                    </button>
                );
            }) }
        </div>
    );
};

StatusCards.propTypes = {
    cards: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, display: PropTypes.string, count: PropTypes.number, disabled: PropTypes.bool })),
    status: PropTypes.string.isRequired,
    onPick: PropTypes.func.isRequired,
};

export default React.memo(StatusCards);
