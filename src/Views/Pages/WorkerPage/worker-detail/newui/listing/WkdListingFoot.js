import React from "react";
import PropTypes from "prop-types";
import PaginationBar from "../../../../../../components/Layout/pagination/PaginationBar";
import translation from "../../../../../../utils/translation";

const WkdListingFoot = ({ total, currentPage, lastPage, perPage, isLoading, unitKey, onPrev, onNext, onLimitChange }) => {
    const from = total ? (currentPage - 1) * perPage + 1 : 0;
    const to = total ? Math.min(currentPage * perPage, total) : 0;
    const countText = total
        ? `${ from }–${ to } ${ translation('key_of') } ${ total } ${ translation(unitKey) }`
        : `0 ${ translation(unitKey) }`;

    return (
        <div className="wkd-listing-foot">
            <span className="wkd-listing-foot-count">{ countText }</span>
            <PaginationBar
                entity={ { total, current_page: currentPage, last_page: lastPage || 1, per_page: perPage } }
                handlePrevClick={ onPrev }
                handleNextClick={ onNext }
                handlePerPageChange={ onLimitChange }
                status={ isLoading ? 'loading' : 'idle' }
            />
        </div>
    );
};

WkdListingFoot.propTypes = {
    total: PropTypes.number,
    currentPage: PropTypes.number,
    lastPage: PropTypes.number,
    perPage: PropTypes.number,
    isLoading: PropTypes.bool,
    unitKey: PropTypes.string.isRequired,
    onPrev: PropTypes.func.isRequired,
    onNext: PropTypes.func.isRequired,
    onLimitChange: PropTypes.func.isRequired,
};

export default React.memo(WkdListingFoot);
