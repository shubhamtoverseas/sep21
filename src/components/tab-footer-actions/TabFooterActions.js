import React, { useCallback } from "react";
import PropTypes from "prop-types";
import CustomDropDownProfileStatus from "../CustomDropdowns/CustomDropDownProfileStatus";
import translation from "../../utils/translation";

const TabFooterActions = ({
  handleTemplateMessageClick,
  handleChangeStatus,
  dropdownList,
  isVisibleSendTemplate = true,
  isVisibleChangeStatus = true,
  variant = 'footer'
}) => {

  const handleDropdownClick = useCallback((id, name, flag) => {
    if (handleChangeStatus) {
      handleChangeStatus(id, name, flag);
    }
  }, [handleChangeStatus]);

  const handleButtonClick = () => {
    if (handleTemplateMessageClick) {
      handleTemplateMessageClick();
    }
  };

  return (
    <div className={ variant === 'inline' ? 'wkd-inline-actions' : 'table-wrapper-footer d-flex justify-content-end bgf7 p24-32 mt-3' }>
      <div className="d-flex">

        { isVisibleSendTemplate && <button className="btn btn-outline mr-2" type="button" onClick={ handleButtonClick }>
          { translation('key_send_template') }
        </button> }

        { isVisibleChangeStatus && <div className="customSelect mr-2 change-status">
          <div className="abc bg-blue w-auto h-100">
            <CustomDropDownProfileStatus
              label={ translation('key_change_status') }
              default={ translation('key_change_status') }
              handleClick={ handleDropdownClick }
              list={ dropdownList }
              isWhiteCaret={ true }
              openDropdownPosition={ "top" }
            />
          </div>
        </div> }

      </div>
    </div>
  );
};

TabFooterActions.propTypes = {
  handleTemplateMessageClick: PropTypes.func,
  handleChangeStatus: PropTypes.func,
  isVisibleSendTemplate: PropTypes.bool,
  isVisibleChangeStatus: PropTypes.bool,
  variant: PropTypes.oneOf(['footer', 'inline']),
  dropdownList: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      id: PropTypes.string,
      enable: PropTypes.any
    })
  ),
};

export default React.memo(TabFooterActions);
