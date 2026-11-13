import React from "react";
import PropTypes from "prop-types";
import { PIPE_CHIPS } from "./workerDashboardConfig";
import translation from "../../../../utils/translation";

const PipelineChips = ({ bucket, activeChip, counts, onSelect }) => {
    if (bucket !== 'pipeline') return null;
    return (
        <div className="pipechips" role="group" aria-label={ translation('key_filters') }>
            { PIPE_CHIPS.map((c) => {
                const n = counts?.[c.key];
                return (
                    <button
                        key={ c.key }
                        type="button"
                        className={ `chip${ activeChip === c.key ? ' on' : '' }` }
                        aria-pressed={ activeChip === c.key }
                        onClick={ () => onSelect(c.key) }
                    >
                        { c.label }
                        { n != null && <span className="n">{ n }</span> }
                    </button>
                );
            }) }
        </div>
    );
};

PipelineChips.propTypes = {
    bucket: PropTypes.string.isRequired,
    activeChip: PropTypes.string.isRequired,
    counts: PropTypes.object,
    onSelect: PropTypes.func.isRequired,
};

export default React.memo(PipelineChips);
