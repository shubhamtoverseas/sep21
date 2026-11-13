import React, { lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmployerTableColumns } from "./EmployerTableColumns";
import { fetchEmployers, setFilters } from "../../../redux/Slices/employer/EmployerSlice";
import { dispatchWithHandling } from "../../../utils/dispatchHandler";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import CustomSpinner from "../../../components/ReusableComponents/CustomSpinner";
import { useTranslation } from "react-i18next";
import { ShowToast } from "../../../components/show-toast/ShowToast";
import routes from "../routes/routesConfig";

const CommonTable = lazy(() => import("../../../components/common-table/CommonTable"));
const PaginationBar = lazy(() => import("../../../components/Layout/pagination/PaginationBar"));

const EmployerTable = ({
  searchQuery,
  fieldsToShow,
  handleSelectedRows,
  entityType,
  isMultiCheck,
  selectionType,
  isVisibleCheckbox
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { employers, filters, totalPages, totalEmployers, lastUpdated, perPage, status } = useSelector((state) => state.employer);

  const currentPage = filters?.page || 1;
  const [pageLimit, setPageLimit] = useState(filters?.limit || 10);
  const [isHover, setIsHover] = useState(false);
  const [, setCheckedEmployers] = useState([]);
  const [tableHeaderFilter, setTableHeaderFilter] = useState({
    sort: '',
    order: ''
  });

  const tableColumns = useMemo(
    () => EmployerTableColumns({ fieldsToShow, t }),
    [fieldsToShow, t]
  );

  const paginationEntity = useMemo(() => ({
    total: totalEmployers,
    current_page: parseInt(currentPage),
    prev_page_url: parseInt(currentPage) > 1 ? `?page=${parseInt(currentPage) - 1}` : null,
    next_page_url: parseInt(currentPage) < totalPages ? `?page=${parseInt(currentPage) + 1}` : null,
    last_page: totalPages,
    per_page: perPage,
  }), [totalEmployers, currentPage, totalPages, perPage]);

  const entityClick = useCallback((row, e) => {
    if (entityType === 'invoice') {
      navigate(`./employer-details/${row.employer_id}`);
    } else if (entityType === 'employer') {
      if (e?.columnKey === 'key_latest_contract' && row?.latest_contract) {
        const latestContract = JSON.parse(row?.latest_contract);
        navigate(routes.contractDetails.replace(':contract_id', latestContract?.id));
        return;
      } 
      navigate(`./details/${row.employer_id}`);
    } else if (entityType === 'general-insurance') {
      navigate(`/invoices/general/select-employer/employer-details/${row.employer_id}`, {
        state: { actionType: "invoice", selectionType: selectionType }
      });
    }
  }, [entityType, navigate, selectionType]);

  const setCheckedItems = useCallback((ids) => {
    setCheckedEmployers(ids);
  }, []);

  const handlePrevClick = useCallback(() => {
    const newPage = parseInt(currentPage) - 1;
    if (newPage > 0) {
      const newFilters = { ...filters, page: newPage };
      dispatch(setFilters(newFilters));
      dispatchWithHandling(dispatch, fetchEmployers({
        page: newPage,
        search_text: searchQuery,
        limit: pageLimit,
        context: 'list',
        ...newFilters
      }));
    }
  }, [currentPage, filters, dispatch, searchQuery, pageLimit]);

  const handleNextClick = useCallback(() => {
    const newPage = parseInt(currentPage) + 1;
    if (newPage <= totalPages) {
      const newFilters = { ...filters, page: newPage };
      dispatch(setFilters(newFilters));
      dispatchWithHandling(dispatch, fetchEmployers({
        page: newPage,
        search_text: searchQuery,
        limit: pageLimit,
        context: 'list',
        ...newFilters
      }));
    }
  }, [currentPage, totalPages, filters, dispatch, searchQuery, pageLimit]);

  const handlePerPageChange = useCallback((newPerPage) => {
    setPageLimit(newPerPage);
    const newFilters = { ...filters, limit: newPerPage, page: 1 };
    dispatch(setFilters(newFilters));
    dispatchWithHandling(dispatch, fetchEmployers({
      limit: newPerPage,
      page: 1,
      search_text: searchQuery,
      context: 'list',
      ...newFilters
    }));
  }, [filters, dispatch, searchQuery]);

  const handleRefresh = useCallback(() => {
    setPageLimit(10);
    const newFilters = { ...filters, limit: 10, page: 1 };
    dispatch(setFilters(newFilters));
    dispatchWithHandling(dispatch, fetchEmployers({
      search_text: searchQuery,
      context: 'list',
      ...newFilters
    }));
  }, [filters, dispatch, searchQuery]);

  const sortTable = useCallback((sortKey) => {
    if (sortKey) {
      const newOrder = tableHeaderFilter.order === 'ASC' ? 'DESC' : 'ASC';
      setTableHeaderFilter({ sort: sortKey, order: newOrder });
      dispatchWithHandling(dispatch, fetchEmployers({
        sort_by: sortKey,
        sort_order: newOrder,
        page: parseInt(currentPage),
        context: 'list',
        search_text: searchQuery,
      }));
    }
  }, [tableHeaderFilter.order, dispatch, currentPage, searchQuery]);

  useEffect(() => {
    dispatch(fetchEmployers({
      page: parseInt(currentPage),
      search_text: searchQuery,
      limit: pageLimit,
      context: 'list',
    }))
      .unwrap()
      .catch((err) => {
        if (err?.data?.data?.message) {
          ShowToast('error', err?.data?.data?.message);
        }
      });
  }, [dispatch, currentPage, searchQuery, pageLimit]);

  return <>
    <div className="commonTable">
      {(status && status === 'loading') ? <CustomSpinner /> :
        <>
          <CommonTable
            columns={tableColumns}
            data={employers}
            sortTable={sortTable}
            setCheckedItems={setCheckedItems}
            onChangeFunc={(id) => console.log(id)}
            tableHeaderfilter={tableHeaderFilter}
            entityClick={entityClick}
            isHover={isHover}
            setIsHover={setIsHover}
            showCheckbox={isVisibleCheckbox === 'no' ? false : true}
            handleSelectedRows={handleSelectedRows}
            isMultiCheck={isMultiCheck}
            tableId='employer-table'
          />
          <PaginationBar
            entity={paginationEntity}
            handlePrevClick={handlePrevClick}
            handleNextClick={handleNextClick}
            handlePerPageChange={handlePerPageChange}
            handleRefresh={handleRefresh}
            last_update={lastUpdated}
          />
        </>
      }
    </div>
  </>
};

EmployerTable.propTypes = {
  searchQuery: PropTypes.string,
  fieldsToShow: PropTypes.array,
  handleSelectedRows: PropTypes.func,
  entityType: PropTypes.string,
  isMultiCheck: PropTypes.bool,
  selectionType: PropTypes.string,
  isVisibleCheckbox: PropTypes.string,
};

export default EmployerTable;