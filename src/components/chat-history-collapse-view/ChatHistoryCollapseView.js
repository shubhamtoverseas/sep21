import React, { useEffect, useState, useRef, lazy, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from 'prop-types';
import Select from "react-select";
// import { useQuery } from '@tanstack/react-query';
import globalSearchIcon from '../../assets/img/svg/global-search-icon.svg';
import Chip from '../chips/Chip';
import mobileBlueIcon from '../../assets/img/svg/phone-blue.svg';
const CustomSpinner = lazy(() => import('../ReusableComponents/CustomSpinner'));
import {
  fetchConversactionsHistory,
  fetchChatHistoryList,
  fetchChatHistoryWithKeyList,
  clearMessageList,
  saveTranslationLanguage,
  getLanguageTranslate
} from "../../redux/Slices/chat/ChatSlice";
const CustomFormGroup = lazy(() => import('../custom-form-group/CustomFormGroup'));
const AgentDropdownOptions = lazy(() => import('../agent-dropdown-options/AgentDropdownOptions'));
const FilePreviewModal = lazy(() => import("../../components/popups/FilePreviewModal"));
const DateRangePickerComponent = lazy(() => import('../date-range-picker/DateRangePicker'));
const TranslationDropdown = React.lazy(() => import('../../Views/Pages/Conversaction/TranslationDropdown'));
import ChatHistoryItem from './ChatHistoryItem';
import translation from "../../utils/translation";
import dayjs from "dayjs";
import { customStylesOfMultiSelect } from "../../utils/customStylesOfMultiSelect";

const ALL_AGENTS_ID = "all";

const ChatHistoryCollapseView = React.memo(function ChatHistoryCollapseView({ user_id, marginBottomClass = "mb-3", defaultExpanded = false }) {
  const dispatch = useDispatch();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isConversationListResetting, setIsConversationListResetting] = useState(false);
  const [messageList, setMessageList] = useState([]);
  const [groupId, SetGroupId] = useState(null);
  const [platformIds, setPlatformIds] = useState([]); // Multi-select support
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [searchText, SetSearchText] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const [filters, setFilters] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: null
  });
  const [paginateData, setPaginateData] = useState("");
  const { conversactionsListHistory, allChatHistoryList } = useSelector((state) => state.chat);
  const chatLanguageInfo = useSelector((state) => state.chat.chatLanguageInfo);
  const searchTimeout = useRef();

  useEffect(() => {
    const handleBeforeUnload = () => {
      dispatch(clearMessageList());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [dispatch]);

  const getSnippet = (str) => {
    if (str) {
      return str.replace(/<[^>]*>/g, ''); // Remove HTML tags
    } else {
      return str;
    }
  };

  /**
   * Function to set conversaction
   */
  // Memoize conversation list to avoid unnecessary recalculation
  const memoizedConversactionList = useMemo(() => {
    if (conversactionsListHistory) {
      const grouped = {};
      let groupsAll = [];
      let userIdsAll = [];
      grouped["all"] = {
        id: "all",
        groups: "",
        name: "All Users",
        role: "All Roles",
        role_name: "All Role Names",
        user_id: "",
        last_message: "",
        avatar: mobileBlueIcon,
        timestamp: "",
        platform: "app"
      };
      conversactionsListHistory.forEach((item) => {
        if (!grouped[item.user_id]) {
          groupsAll.push(item.id);
          userIdsAll.push(item.user_id);
          grouped[item.user_id] = {
            id: item.user_id,
            groups: [item.id],
            name: item.name,
            role: item.guard_name,
            role_name: item.role_name,
            user_id: item.user_id,
            last_message: getSnippet(item.last_message),
            avatar: mobileBlueIcon,
            timestamp: item?.last_message_ceated_at && dayjs(item?.last_message_ceated_at).format('DD/MM/YYYY hh:mm A'),
            platform: item.platform
          };
        } else {
          groupsAll.push(item.id);
          userIdsAll.push(item.user_id);
          grouped[item.user_id].groups.push(item.id);
        }
      });
      grouped["all"].groups = [...groupsAll];
      grouped["all"].user_id = userIdsAll.join(',');
      return Object.values(grouped).map((conv) => ({
        ...conv,
        group_id: conv.groups.join(','),
      }));
    }
    return [];
  }, [conversactionsListHistory]);

  const conversactionList = useMemo(
    () => (isConversationListResetting ? [] : memoizedConversactionList),
    [isConversationListResetting, memoizedConversactionList]
  );

  /**
   * Function to set message
   */
  useEffect(() => {
    if (allChatHistoryList) {
      setMessageList([]);
      pushHistoricalChat();
    }
  }, [allChatHistoryList]);

  /**
   * Function to toggle the collapse view
   */
  // Memoize toggleCollapse to avoid unnecessary re-creation
  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (next === false) { // Only fetch when expanding
        setIsLoading(true);
        setIsConversationListResetting(true);
        dispatch(fetchConversactionsHistory({ "limit": 10, "page": 1, "user_id": user_id }))
          .then((res) => {
            setIsLoading(false);
            if (!res?.error) setIsConversationListResetting(false);
          });
        // Set display name for React.memo
        ChatHistoryCollapseView.displayName = "ChatHistoryCollapseView";
      }
      return next;
    });
  }, [dispatch, user_id]);

  // Hosted expanded (e.g. inside the worker context drawer): open and fetch on mount
  React.useEffect(() => {
    if (defaultExpanded) {
      setIsCollapsed(false);
      setIsLoading(true);
      setIsConversationListResetting(true);
      dispatch(fetchConversactionsHistory({ "limit": 10, "page": 1, "user_id": user_id }))
        .then((res) => {
          setIsLoading(false);
          if (!res?.error) setIsConversationListResetting(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateRangeChange = (range) => {
    if (!range.startDate || !range.endDate) {
      setDateRange({
        startDate: new Date(),
        endDate: null
      });
      const parameters = {
        group_id: groupId,
        limit: 10,
        user_id: user_id,
      };
      if (platformIds.length > 0)
        parameters.platform = platformIds.join(',');
      if (searchText)
        parameters.search = searchText;

      const clearedFilters = { ...filters, ...parameters };
      delete clearedFilters.startDate;
      delete clearedFilters.endDate;

      setFilters(clearedFilters);

      setMessageList([]);
      setIsLoading(true);
      dispatch(fetchChatHistoryList({ ...clearedFilters, ExclusiveStartKey: "" }))
        .then((res) => {
          if (!res.error) {
            setIsLoading(false);
          } else {
            setIsLoading(false);
          }
        });

    } else {
      setDateRange({
        startDate: range.startDate,
        endDate: range.endDate
      });
      const parameters = {
        group_id: groupId,
        limit: 10,
        user_id: user_id,
        startDate: dayjs(range.startDate).format('YYYY-MM-DD') + "T00:00:08.543Z",
        endDate: dayjs(range.endDate).format('YYYY-MM-DD') + "T23:59:59.543Z",
      };
      if (platformIds.length > 0)
        parameters.platform = platformIds.join(',');
      if (searchText)
        parameters.search = searchText;

      setFilters({ ...filters, ...parameters });

      setMessageList([]);
      setIsLoading(true);
      dispatch(fetchChatHistoryList({ ...filters, ...parameters, ExclusiveStartKey: "" }))
        .then((res) => {
          if (!res.error) {
            setIsLoading(false);
          } else {
            setIsLoading(false);
          }
        });
    }
  };

  /**
   *  Function to handle the change in the duties select
   * @param {*} value 
   * @param {*} action 
   */
  const handleDutiesSelectChange = (value) => {
    let selection = Array.isArray(value) ? value : (value ? [value] : []);
    if (selection.some((v) => v.id === ALL_AGENTS_ID)) {
      selection = selection.filter((v) => v.id === ALL_AGENTS_ID);
    }
    setSelectedAgents(selection);

    // If value is an array (multi-select), extract user_ids and group_ids
    let userIds = selection.map(v => v.user_id).filter(Boolean);
    let groupIds = selection.map(v => v.groups).filter(Boolean);
    const parameters = {
      group_id: groupIds.join(','),
      limit: 10,
      user_id: user_id,
      to_user_id: userIds.join(',')
    };
    SetGroupId(groupIds.join(','))
    if (platformIds.length > 0)
      parameters.platform = platformIds.join(',');
    if (searchText)
      parameters.search = searchText;

    setFilters({ ...filters, ...parameters });
    setMessageList([]);
    if (groupIds.length > 0) {
      setIsLoading(true);
      dispatch(fetchChatHistoryList({ ...filters, ...parameters, ExclusiveStartKey: "" }))
        .then((res) => {
          if (!res.error) {
            setIsLoading(false);
          } else {
            setIsLoading(false);
          }
        });
    }

  };

  
  const handleDutiesSelectChangeStable = useCallback(handleDutiesSelectChange, [filters, platformIds, searchText, user_id, dispatch]);

  const agentOptions = useMemo(() => (
    conversactionList && conversactionList.map((item) => ({
      value: item.id,
      label: item.name,
      ...item
    }))
  ), [conversactionList]);

  const isAllAgentsSelected = useMemo(
    () => selectedAgents.some((v) => v.id === ALL_AGENTS_ID),
    [selectedAgents]
  );

  // Toggle platform selection for multi-select
  const handleRefreshChatHistory = (platform) => {
    let updatedPlatforms = [...platformIds];
    if (updatedPlatforms.includes(platform)) {
      updatedPlatforms = updatedPlatforms.filter((p) => p !== platform);
    } else {
      updatedPlatforms.push(platform);
    }
    setPlatformIds(updatedPlatforms);
    setFilters({ ...filters, platform: updatedPlatforms.join(',') });
    setMessageList([]);
    setIsLoading(true);
    dispatch(fetchChatHistoryList({ ...filters, "limit": 10, "platform": updatedPlatforms.join(','), ExclusiveStartKey: "" }))
      .then(() => {
        setIsLoading(false);
      });
  }

  /**
   *  Function to append messages to the message list
   * @param {*} msg 
   */
  // function appendMsg(msg) {
  //   setMessageList((previousMessage) => [...previousMessage, msg]);
  // }

  /**
   *  Function to format the date to 12 hour time
   * @param {*} dateString 
   * @returns 
   */
  function formatTo12HourTime(dateString) {
    const date = new Date(dateString);
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const kolkataTime = new Date(date.getTime() + ISTOffset);
    let hours = kolkataTime.getUTCHours();
    const minutes = kolkataTime.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // The hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const dateStr = dayjs(dateString).format('DD/MM/YYYY');
    const formattedTime = dateStr + " " + hours + ':' + minutesStr + ' ' + ampm;
    return formattedTime;
  }

  /** first function call to set previous history */
  /*function pushHistoricalChat() {
    setPaginateData(allChatHistoryList?.LastEvaluatedKey ?? "");
    let tempChatHistory = allChatHistoryList?.data ?? [];
    tempChatHistory?.map((msg) => {
      let msgDirection = '';
      if (msg?.sender_id !== user_id) {
        msgDirection = 'recieve';
      } else {
        msgDirection = 'send';
      }
      let body = msg?.content;
      if (chatLanguageInfo?.chat_translate_view === "translated") {
        if (chatLanguageInfo?.chat_translate_language === "id") {
          body = msg?.content_id || msg?.content;
        } else if (chatLanguageInfo?.chat_translate_language === "en") {
          body = msg?.content_en || msg?.content;
        } else if (chatLanguageInfo?.chat_translate_language === "zh_cn") {
          body = msg?.content_zh_cn || msg?.content;
        } else if (chatLanguageInfo?.chat_translate_language === "zh_tw") {
          body = msg?.content_zh_tw || msg?.content;
        }
      }
      let displayMsgs = {
        sender: msg?.full_name,
        time: formatTo12HourTime(msg?.created_at),
        message: body,
        platform: msg?.platform,
        type: msg?.guard_name,
        isSender: (msg?.user_id == user_id) ? true : false,
        profile_image: msg?.profile_image,
        vector: msgDirection,
        media_type: msg?.media_type,
        media_link: msg?.media_link,
        id: msg?.id,
      }
      appendMsg(displayMsgs);
    });
  }*/

  // Update pushHistoricalChat to sort before setMessageList
  function pushHistoricalChat() {
    setPaginateData(allChatHistoryList?.LastEvaluatedKey ?? "");
    let tempChatHistory = allChatHistoryList?.data ?? [];
    let displayMsgs = tempChatHistory.map((msg) => {
      let msgDirection = '';
      if (msg?.sender_id !== user_id) {
        msgDirection = 'recieve';
      } else {
        msgDirection = 'send';
      }
      let body = msg?.content;
      if (chatLanguageInfo?.chat_translate_view === "translated") {
        if (chatLanguageInfo?.chat_translate_language === "id") {
          body = msg?.content_id || msg?.content;
        } else if (chatLanguageInfo?.chat_translate_language === "en") {
          body = msg?.content_en || msg?.content;
        } else if (chatLanguageInfo?.chat_translate_language === "zh_cn") {
          body = msg?.content_zh_cn || msg?.content;
        } else if (chatLanguageInfo?.chat_translate_language === "zh_tw") {
          body = msg?.content_zh_tw || msg?.content;
        }
      }
      return {
        sender: msg?.full_name,
        time: formatTo12HourTime(msg?.created_at),
        epoch: new Date(msg?.created_at).getTime() || 0,
        message: body,
        platform: msg?.platform,
        type: msg?.guard_name || "",
        isSender: (msg?.user_id == user_id) ? true : false,
        profile_image: msg?.profile_image,
        vector: msgDirection,
        media_type: msg?.media_type,
        media_link: msg?.media_link || "",
        id: msg?.id,
      }
    });
    setMessageList(sortMessagesByTimeDesc(displayMsgs));
  }

  const handleChatSearch = (e) => {
    SetSearchText(e.target.value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      const parameters = {
        limit: 10,
        user_id: user_id,
        search: e.target.value
      };
      if (platformIds.length > 0)
        parameters.platform = platformIds.join(',');
      if (dateRange.startDate && dateRange.endDate) {
        parameters.startDate = dayjs(dateRange.startDate).format('YYYY-MM-DD') + "T00:00:08.543Z";
        parameters.endDate = dayjs(dateRange.endDate).format('YYYY-MM-DD') + "T23:59:59.543Z";
      }
      setFilters({ ...filters, ...parameters });
      setMessageList([]);
      setIsLoading(true);
      dispatch(fetchChatHistoryList({ ...filters, ...parameters, ExclusiveStartKey: "" }))
        .then((res) => {
          if (!res.error) {
            setIsLoading(false);
          } else {
            setIsLoading(false);
          }
        });
    }, 300);
  }

  /**
   * Function to push historical chat by page
   */
  const fetchPreviousPage = useCallback(async () => {
    if (paginateData.length > 0) {
      const parameters = {
        limit: 10,
        ExclusiveStartKey: paginateData,
        user_id: user_id
      };
      if (platformIds.length > 0)
        parameters.platform = platformIds.join(',');

      setFilters({ ...filters, ...parameters });
      dispatch(fetchChatHistoryWithKeyList({ ...filters, ...parameters, page: 1 }))
        .unwrap()
        .then((messageData) => {
          if (messageData) {
            setPaginateData(messageData?.LastEvaluatedKey)
            if (messageData?.data) {
              pushHistoricalChatByPage(messageData?.data);
            }
          }
        })
    }
  }, [paginateData, platformIds, filters, user_id]);

  /**
   *  Function to push historical chat by page
   * @param {*} oldMessages 
   */

  /*function pushHistoricalChatByPage(oldMessages) {
    let tempChatHistory = [...oldMessages];
    let allMessages = tempChatHistory.map((msg) => {
      let msgDirection = '';
      if (msg?.sender_id !== user_id) {
        msgDirection = 'send';
      } else {
        msgDirection = 'recieve';
      }
      let body = msg?.content;
      if (chatLanguageInfo?.chat_translate_view === "translated") {
        if (chatLanguageInfo?.chat_translate_language === "id") {
          body = msg?.content_id || msg?.content;
        } else if (chatLanguageInfo?.chat_translate_language === "en") {
          body = msg?.content_en || msg?.content;
        } else if (chatLanguageInfo?.chat_translate_language === "zh_cn") {
          body = msg?.content_zh_cn || msg?.content;
        } else if (chatLanguageInfo?.chat_translate_language === "zh_tw") {
          body = msg?.content_zh_tw || msg?.content;
        }
      }
      return {
        sender: msg?.full_name,
        time: formatTo12HourTime(msg?.created_at),
        message: body,
        platform: msg?.platform,
        type: msg?.guard_name,
        isSender: (msg?.user_id == user_id) ? true : false,
        profile_image: msg?.profile_image,
        vector: msgDirection,
        media_type: msg?.media_type,
        media_link: msg?.media_link,
        id: msg?.id,
      }
    });
    setMessageList([...allMessages, ...messageList]);
  }*/

  const handlePreviewFile = useCallback((fileUrl) => {
    setPreviewFileUrl(fileUrl);
    setShowPreviewModal(true);
  }, []);

  useEffect(() => () => clearTimeout(searchTimeout.current), []);

  const handleSaveTranslationLanguagesChat = (payload) => {
    dispatch(saveTranslationLanguage(payload)).then((res) => {
      if (res?.payload?.success) {
        dispatch(getLanguageTranslate());
        setMessageList([]);
        setIsLoading(true);
        dispatch(fetchChatHistoryList({ ...filters, "limit": 10 }))
          .then(() => {
            setIsLoading(false);
          });
      }
    });
  }

  const sortMessagesByTimeDesc = useCallback((messages) => {
    return [...messages].sort((a, b) => b.epoch - a.epoch);
  }, []);

  // Update pushHistoricalChatByPage to sort before setMessageList
  function pushHistoricalChatByPage(oldMessages) {
    let tempChatHistory = [...oldMessages];
    let allMessages = tempChatHistory.map((msg) => {
      let msgDirection = '';
      if (msg?.sender_id !== user_id) {
        msgDirection = 'send';
      } else {
        msgDirection = 'recieve';
      }
      let body = msg?.content;
      if (chatLanguageInfo?.chat_translate_view === "translated") {
        if (chatLanguageInfo?.chat_translate_language === "id") {
          body = msg?.content_id || msg?.content;
        } else if (chatLanguageInfo?.chat_translate_language === "en") {
          body = msg?.content_en || msg?.content;
        } else if (chatLanguageInfo?.chat_translate_language === "zh_cn") {
          body = msg?.content_zh_cn || msg?.content;
        } else if (chatLanguageInfo?.chat_translate_language === "zh_tw") {
          body = msg?.content_zh_tw || msg?.content;
        }
      }
      return {
        sender: msg?.full_name,
        time: formatTo12HourTime(msg?.created_at),
        epoch: new Date(msg?.created_at).getTime() || 0,
        message: body,
        platform: msg?.platform,
        type: msg?.guard_name || "",
        isSender: (msg?.user_id == user_id) ? true : false,
        profile_image: msg?.profile_image,
        vector: msgDirection,
        media_type: msg?.media_type,
        media_link: msg?.media_link || "",
        id: msg?.id,
      }
    });
    setMessageList(sortMessagesByTimeDesc([...allMessages, ...messageList]));
  }

  return (
    <div className={ `collapse-view ${ marginBottomClass }` }>
      <div className="card">
        <div className="card-header border-0 fz20 fw-500 black d-flex justify-content-between align-items-center" onClick={ toggleCollapse }>
          <span>{ translation('key_chat_history') }</span>
          <div className="d-flex align-items-center">
            <span style={ { cursor: 'pointer', marginLeft: 8 } }>
              { isCollapsed ? <i className="ri-arrow-down-s-line"></i> : <i className="ri-arrow-up-s-line"></i> }
            </span>
          </div>
        </div>
        <div className={ `card-body pb-0 border-0 ${ isCollapsed ? 'collapse' : '' }` }>

          <div className="row align-items-center">
            <div className="col-10 mb24">
              <label className="form-label">{ translation('key_agent_name') }</label>
              <Select
                options={ agentOptions }
                name="chat_conversaction"
                className="select-container"
                classNamePrefix="select-input"
                value={ selectedAgents }
                onChange={ handleDutiesSelectChangeStable }
                isOptionDisabled={ (option) => isAllAgentsSelected && option.id !== ALL_AGENTS_ID }
                components={ { Option: AgentDropdownOptions } }
                isMulti
                placeholder={ translation('key_please_select') }
                noOptionsMessage={ () => translation('key_no_options') }
                styles={customStylesOfMultiSelect()}
              />
            </div>
            <div className="col-2 mb24">
              <label className="form-label"></label>
              { !isCollapsed && <TranslationDropdown handleSaveTranslationLanguage={ handleSaveTranslationLanguagesChat } chatLanguageInfo={ chatLanguageInfo } icon={ true } /> }
            </div>
          </div>
          <div className='custom-row small d-xl-flex mb24'>
            <CustomFormGroup classNames={ 'col px4 mb16 pl-auto' }>
              <label className='form-label'>{ translation('key_date_filter') }</label>
              <DateRangePickerComponent
                onChange={ handleDateRangeChange }
                startDate={ dateRange.startDate }
                endDate={ dateRange.endDate }
              />
            </CustomFormGroup>
            <CustomFormGroup classNames={ 'col-xl col-lg-12 px4 mb16 pl-auto' }>
              <label className='form-label'>{ translation('key_channel') }</label>
              <div className='d-flex align-items-center ht44'>
                <Chip size={ 'rounded-chip' } color={ 'light' } classes={ 'fw-400 mr8' } chipName={ translation('key_whatsapp') } onClick={ () => { handleRefreshChatHistory('whatsapp') } } isActive={ platformIds.includes('whatsapp') } />
                {/* <Chip size={'rounded-chip'} color={'light'} classes={'fw-400 mr8'} chipName='Wechat' /> */ }
                <Chip size={ 'rounded-chip' } color={ 'light' } classes={ 'fw-400 mr8' } chipName={ translation('key_app') } onClick={ () => { handleRefreshChatHistory('app') } } isActive={ platformIds.includes('app') } />
                <Chip size={ 'rounded-chip' } color={ 'light' } classes={ 'fw-400 mr8' } chipName="Line" onClick={ () => { handleRefreshChatHistory('line') } } isActive={ platformIds.includes('line') } />
              </div>
            </CustomFormGroup>
          </div>
          <div className='row mb12'>
            <div className='col-7'>
              <div className="input-group customInputGroup inputgroupBoth white-search bg-white p-0">
                <div className="input-group-prepend bg-transparent"></div>
                <span className="input-group-text pr-0 bg-transparent border-0">
                  <img src={ globalSearchIcon } />
                </span>
                <input
                  type="text"
                  className="form-control border-0 pl10"
                  placeholder={ translation('key_search') }
                  onChange={ handleChatSearch }
                />
              </div>
            </div>
          </div>
          { isLoading && <CustomSpinner /> }
          { (messageList && messageList.length > 0) ? <ChatHistoryItem
            chats={ messageList }
            fetchPreviousPage={ fetchPreviousPage }
            onClickPreviewFile={ handlePreviewFile }
          />: <div className="chat-history-box bg-white d-flex align-items-center justify-content-center mb-3" style={{height: '170px'}}>
                <p className="m-0 grey97 fz14">{translation('key_please_select_agent_name_to_view_chat_history')}</p>
            </div> }
        </div>

      </div>
      { showPreviewModal && <FilePreviewModal onClose={ () => setShowPreviewModal(false) } filePath={ previewFileUrl } /> }
    </div >
  );
});

ChatHistoryCollapseView.propTypes = {
  user_id: PropTypes.any,
  marginBottomClass: PropTypes.string,
  defaultExpanded: PropTypes.bool,
};

export default ChatHistoryCollapseView;
