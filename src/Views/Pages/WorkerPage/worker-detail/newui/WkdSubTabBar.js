import React from 'react';
import PropTypes from 'prop-types';

/* roving tablist (proto detSubBarHTML keyboard repair): one tab stop; Left / Right / Home / End move and activate */
const ROVING_KEYS = { ArrowRight: 1, ArrowLeft: -1, Home: 'first', End: 'last' };

const WkdSubTabBar = ({ tabs, onSelect, activeKey, emptyMessage }) => {
    const handleKeyDown = (event) => {
        const move = ROVING_KEYS[event.key];
        if (move === undefined || !onSelect) return;
        const enabled = tabs.filter((tab) => !(tab.disabled || tab.disabledClass === 'disabled'));
        if (enabled.length < 2) return;
        const index = enabled.findIndex((tab) => tab.eventKey === activeKey);
        const nextIndex = move === 'first' ? 0
            : move === 'last' ? enabled.length - 1
                : (index + move + enabled.length) % enabled.length;
        const next = enabled[nextIndex];
        if (!next) return;
        event.preventDefault();
        onSelect(next.eventKey);
        const list = event.currentTarget;
        requestAnimationFrame(() => {
            const button = list.querySelector(`[data-tab-key="${ next.eventKey }"]`);
            if (button) button.focus();
        });
    };

    /* a tab granted but no section viewable (PERM §1.5 hides sections, §9.4 hides the tab): say so instead of an empty bar + blank card */
    if (tabs.length === 0 && emptyMessage) {
        return <div className="text-danger text-center py-4" role="status" data-mc-subtabs-empty="1">{ emptyMessage }</div>;
    }

    return (
    <div className="wkd-subtabs">
        <div className="g2-section-tabs" role="tablist" onKeyDown={ handleKeyDown }>
            { tabs.map((tab) => {
                const isDisabled = tab.disabled || tab.disabledClass === 'disabled';
                const showDot = Boolean(tab.status);
                return (
                    <button
                        key={ tab.eventKey }
                        type="button"
                        role="tab"
                        data-tab-key={ tab.eventKey }
                        tabIndex={ activeKey === tab.eventKey ? 0 : -1 }
                        aria-selected={ activeKey === tab.eventKey }
                        disabled={ isDisabled }
                        aria-disabled={ isDisabled || undefined }
                        title={ tab.disabledReason || undefined }
                        className={ `g2-section-tab${ activeKey === tab.eventKey ? ' is-active' : '' }` }
                        onClick={ () => onSelect && onSelect(tab.eventKey) }
                    >
                        { showDot && (
                            <span className="g2-section-dot" data-status={ isDisabled ? 'disabled' : tab.status } />
                        ) }
                        { tab.title }
                        { tab.meta && <span className="g2-substage-meta is-proposal">{ tab.meta }</span> }
                    </button>
                );
            }) }
        </div>
        <div className="wkd-subtab-content">
            { tabs.map((tab) => (
                <div key={ tab.eventKey } className={ activeKey === tab.eventKey ? '' : 'd-none' }>
                    { tab.content }
                </div>
            )) }
        </div>
    </div>
    );
};

WkdSubTabBar.propTypes = {
    tabs: PropTypes.arrayOf(
        PropTypes.shape({
            eventKey: PropTypes.string.isRequired,
            title: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
            content: PropTypes.node,
            status: PropTypes.string,
            meta: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
            disabled: PropTypes.bool,
            disabledReason: PropTypes.string,
        })
    ).isRequired,
    onSelect: PropTypes.func,
    activeKey: PropTypes.string,
    emptyMessage: PropTypes.node,
};

export default React.memo(WkdSubTabBar);
