import React from "react";
import PropTypes from "prop-types";
import { PIPE_VIEWS, AVAIL_VIEWS } from "./workerDashboardConfig";
import translation from "../../../../utils/translation";


const DashboardViewToggle = ({ bucket, pipeView, availView, onSelect }) => {
    const views = bucket === 'pipeline' ? PIPE_VIEWS : bucket === 'available' ? AVAIL_VIEWS : null;
    if (!views) return null;
    const active = bucket === 'pipeline' ? pipeView : availView;
    return (
        <div className="variantbar">
            <span className="vlbl">{ translation('key_view') }</span>
            <div className="viewseg" role="tablist">
                { views.map((v) => (
                    <button
                        key={ v.key }
                        type="button"
                        role="tab"
                        aria-selected={ active === v.key }
                        className={ active === v.key ? 'on' : '' }
                        onClick={ () => onSelect(v.key) }
                    >
                        { v.label }
                    </button>
                )) }
            </div>
        </div>
    );
};

DashboardViewToggle.propTypes = {
    bucket: PropTypes.string.isRequired,
    pipeView: PropTypes.string.isRequired,
    availView: PropTypes.string.isRequired,
    onSelect: PropTypes.func.isRequired,
};

export default React.memo(DashboardViewToggle);
