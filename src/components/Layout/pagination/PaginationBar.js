import React from 'react';
import PropTypes from 'prop-types';
import styles from './pagination.module.css';
import translation from "../../../utils/translation";

const PaginationBar = ({
  entity,
  handlePrevClick,
  handleNextClick,
  handlePerPageChange,
  hidePerPage = false,
  status,
  // legacy props kept for backward-compat — no longer rendered
  handleRefresh,    // eslint-disable-line no-unused-vars
  last_update,      // eslint-disable-line no-unused-vars
  showDensePadding, // eslint-disable-line no-unused-vars
}) => {
  const currentPage = parseInt(entity?.current_page) || 1;
  const lastPage    = parseInt(entity?.last_page)    || 1;
  const perPage     = entity?.per_page;
  const isLoading   = status === 'loading';

  const onPrev = (e) => { e.preventDefault(); if (!isLoading) handlePrevClick(); };
  const onNext = (e) => { e.preventDefault(); if (!isLoading) handleNextClick(); };

  return (
    <div className={styles.paginationWrap}>
      <div className={styles.pagination}>

        {/* Rows per page — hidden when the caller enforces a fixed cap */}
        { !hidePerPage && <div className={styles.perpage}>
          <span>{ translation('key_rows_per_page') }</span>
          <select
            className={styles.perpageSelect}
            value={perPage}
            onChange={(e) => handlePerPageChange(parseInt(e.target.value))}
            disabled={isLoading}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div> }

        {/* Prev · "Page N / M" · Next (prototype .pager: 26px bordered chevron buttons around plain text) */}
        <div className={styles.pages}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={onPrev}
            disabled={isLoading || currentPage <= 1}
            aria-label="Previous page"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
          </button>
          <span className={styles.pageText}>{ translation('key_page') } {currentPage} / {lastPage}</span>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={onNext}
            disabled={isLoading || currentPage >= lastPage}
            aria-label="Next page"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </div>

      </div>
    </div>
  );
};

PaginationBar.propTypes = {
  entity: PropTypes.shape({
    total:        PropTypes.number,
    current_page: PropTypes.any.isRequired,
    last_page:    PropTypes.number.isRequired,
    per_page:     PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    prev_page_url: PropTypes.string,
    next_page_url: PropTypes.string,
  }).isRequired,
  handlePrevClick:    PropTypes.func.isRequired,
  handleNextClick:    PropTypes.func.isRequired,
  handlePerPageChange: PropTypes.func.isRequired,
  hidePerPage:        PropTypes.bool,
  handleRefresh:      PropTypes.func,
  last_update:        PropTypes.string,
  showDensePadding:   PropTypes.bool,
  status:             PropTypes.string,
};

export default React.memo(PaginationBar);
