import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearCurrentEmployer, fetchDuplicateEmployerCount, fetchEmployerDetail } from "../../../../../redux/Slices/employer/EmployerSlice";
import { getPermissionValue, isAdminUser } from "../../../../../services/commonService";
import { getEmployerGrants } from "../employerGrants";
import { CHAT_OPEN_DELAY_MS, CHAT_USER_TYPES, EMPLOYER_LOAD_STATE, EMPLOYER_CROSS_MODULE_TAB_ACCESS } from "../employerNewUiConstants";

const buildEmployerChatInfo = (employer, extra = {}) => ({
    employer_name: `${ employer?.name } ${ employer?.surname }`,
    employer_user_id: employer?.employer_user_id,
    user_type: CHAT_USER_TYPES.EMPLOYER,
    employer_id: employer?.employer_id,
    conversation_sid: "",
    ...extra,
});

const useEmployerDetails = (employerId) => {
    const dispatch = useDispatch();
    const { currentEmployer, duplicateEmployerCount } = useSelector((state) => state.employer);
    const { permissionList } = useSelector((state) => state.users);
    const [loadError, setLoadError] = useState(null);   /* null | EMPLOYER_LOAD_STATE.* */
    const [isChatOpened, setIsChatOpened] = useState(false);
    const [chatUserType, setChatUserType] = useState(CHAT_USER_TYPES.EMPLOYER);
    const [chatInfo, setChatInfo] = useState(null);
    const timers = useRef([]);

    const schedule = useCallback((fn, delay) => {
        timers.current.push(setTimeout(fn, delay));
    }, []);
    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const isAdmin = useMemo(() => isAdminUser(), []);
    const has = useCallback((key) => isAdmin || getPermissionValue(permissionList?.data, 'employer', key) === 'y', [isAdmin, permissionList?.data]);
    /* the Contract / Invoice / Insurance tabs are governed by their own module (PERM §17 step 10; conflict sheet U-0055) */
    const hasModule = useCallback(({ module, keys, details = [] }) => isAdmin || (
        keys.some((key) => getPermissionValue(permissionList?.data, module, key) === 'y')
        && (details.length === 0 || details.some((d) => getPermissionValue(permissionList?.data, d.module, d.key) === 'y'))
    ), [isAdmin, permissionList?.data]);
    const permissions = useMemo(() => ({
        remarks: has('employer_remarks'),
        chatHistory: has('employer_chat_history'),
        activity: has('employer_activity'),
        chat: has('employer_chat'),
        contractTab: hasModule(EMPLOYER_CROSS_MODULE_TAB_ACCESS.contract),
        invoiceTab: hasModule(EMPLOYER_CROSS_MODULE_TAB_ACCESS.invoice),
        insuranceTab: hasModule(EMPLOYER_CROSS_MODULE_TAB_ACCESS.insurance),
        ...getEmployerGrants(permissionList),
    }), [has, hasModule, permissionList]);

    const load = useCallback(() => {
        setLoadError(null);
        dispatch(fetchEmployerDetail({ employer_id: employerId })).then((res) => {
            /* 403 → neutral denial (names nothing); 404 or an empty refusal → unknown record; anything else → retry */
            if (res?.error) {
                const httpStatus = res?.payload?.httpStatus;
                if (httpStatus === 403) setLoadError(EMPLOYER_LOAD_STATE.DENIED);
                else if (httpStatus === 404) setLoadError(EMPLOYER_LOAD_STATE.INVALID);
                else setLoadError(EMPLOYER_LOAD_STATE.ERROR);
            } else if (res?.payload && res.payload.status === false && !res.payload.data) {
                setLoadError(EMPLOYER_LOAD_STATE.INVALID);
            }
        });
    }, [dispatch, employerId]);

    useEffect(() => {
        dispatch(clearCurrentEmployer());
        load();
    }, [dispatch, load]);

    useEffect(() => {
        if (!currentEmployer?.user_id) return;
        if (chatUserType === CHAT_USER_TYPES.EMPLOYER) setChatInfo(buildEmployerChatInfo(currentEmployer));
        dispatch(fetchDuplicateEmployerCount({ user_id: currentEmployer.user_id }));
    }, [dispatch, currentEmployer, chatUserType]);

    const openEmployerChat = useCallback(() => {
        setChatUserType(CHAT_USER_TYPES.EMPLOYER);
        setIsChatOpened(false);
        setChatInfo(buildEmployerChatInfo(currentEmployer, {
            whatsapp_number: `${ currentEmployer?.whatsapp_country_code || '' }${ currentEmployer?.whatsapp_number || '' }`,
        }));
        schedule(() => setIsChatOpened(true), CHAT_OPEN_DELAY_MS);
    }, [currentEmployer, schedule]);

    /* a pending delayed open (the legacy remount trick in openEmployerChat) must die with the close, or rapid
       Context ⇄ Chat toggles revive the chat after the rail left chat mode (user, 9 Nov) */
    const closeChat = useCallback(() => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        setIsChatOpened(false);
    }, []);

    return {
        employer: currentEmployer,
        duplicateCount: duplicateEmployerCount || 0,
        loadError,
        reload: load,
        permissions,
        isAdmin,
        chat: { isOpen: isChatOpened, info: chatInfo, userType: chatUserType, open: openEmployerChat, close: closeChat },
    };
};

export default useEmployerDetails;
