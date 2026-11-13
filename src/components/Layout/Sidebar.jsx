import React, { useMemo, useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import styles from "./Sidebar.module.css";
import configData from "../ReusableComponents/app-configs";
import { isAdminUser, getCurrentUser } from "../../services/commonService";
import { headingCase } from "../../utils/utils";
import ShellIcon from "./ShellIcon";
import Icon from "../Icon/Icon";
import generalRoutes from "../../Views/Pages/routes/routesConfig/index";
import { useHrmsPermissions } from "../../utils/permissions/hrmsPermissionsUtils";
import translation from "../../utils/translation";

const RAIL_GROUPS = [
    ["/dashboard", "/calendar", "/chat-view"],
    ["/job-offers", "/employers", "/workers"],
    /* Processing lives inside Contracts in the new UI (PM 2026-10-08): one rail entry, the clock glyph */
    ["/contracts", "/invoices", "/insurance"],
    ["/reports"],
];

const RAIL_ICONS = {
    "/dashboard": "grid",
    "/calendar": "calendar",
    "/chat-view": "message",
    "/job-offers": "briefcase",
    "/employers": "building",
    "/workers": "user",
    "/contracts": "clock",
    "/invoices": "receipt",
    "/insurance": "shield",
    "/reports": "chart",
};

const Sidebar = ({ onLogout = () => {} }) => {
    const { t } = useTranslation();
    const location = useLocation();
    const { permissionList } = useSelector((state) => state.users);
    const userPhoto = useSelector((state) => state.users.currentUserProfile);
    const [photoFailed, setPhotoFailed] = useState(false);
    useEffect(() => { setPhotoFailed(false); }, [userPhoto]);
    const chatUnread = useSelector((state) => state.chat?.unreadChatCount || 0);
    const isAdmin = useMemo(() => isAdminUser(), []);
    const currentUser = useMemo(() => getCurrentUser()?.data, []);

    const navItems = useMemo(
        () => configData.getNavConfig({ t, permissionList: permissionList?.data || [], isAdmin }),
        [t, permissionList, isAdmin]
    );

    const permittedByPath = useMemo(() => {
        const map = new Map();
        navItems.forEach((item) => map.set(item.path, item));
        return map;
    }, [navItems]);

    const railGroups = useMemo(
        () => RAIL_GROUPS
            .map((group) => group.filter((path) => permittedByPath.has(path)))
            .filter((group) => group.length > 0),
        [permittedByPath]
    );

    const hasSettings = permittedByPath.has("/settings");

    const isActive = useCallback((path) => {
        if (path === "/dashboard") return location.pathname === "/dashboard";
        return location.pathname.startsWith(path);
    }, [location.pathname]);

    const userInitials = useMemo(() => {
        const fn = currentUser?.staff?.first_name || "";
        const ln = currentUser?.staff?.last_name || "";
        return `${ fn[0] || "" }${ ln[0] || "" }`.toUpperCase() || "U";
    }, [currentUser]);

    const fullName = `${ currentUser?.staff?.first_name || "" } ${ currentUser?.staff?.last_name || "" }`.trim();
    const staffRole = currentUser?.staff?.staff_type
        ? currentUser.staff.staff_type.charAt(0).toUpperCase() + currentUser.staff.staff_type.slice(1)
        : "Admin";
    const staffType = currentUser?.staff?.staff_type;

    const settingsPermission = useHrmsPermissions(permissionList);
    const { canViewMyProfile, canAddLeave, canRaiseTimeRequest } = settingsPermission;
    /* the Calendar entry follows the rail decision (Calendar module Access), not the HRMS calendar toggles */
    const canOpenCalendar = permittedByPath.has(generalRoutes.calendar);

    const [showUserMenu, setShowUserMenu] = useState(false);
    const userRef = useRef(null);

    useEffect(() => {
        if (!showUserMenu) return undefined;
        const handler = (e) => {
            if (userRef.current && !userRef.current.contains(e.target)) setShowUserMenu(false);
        };
        const keyHandler = (e) => {
            if (e.key === "Escape") setShowUserMenu(false);
        };
        document.addEventListener("mousedown", handler);
        document.addEventListener("keydown", keyHandler);
        return () => {
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("keydown", keyHandler);
        };
    }, [showUserMenu]);

    useEffect(() => {
        setShowUserMenu(false);
    }, [location.pathname]);

    const handleLogoutClick = useCallback(() => {
        setShowUserMenu(false);
        onLogout();
    }, [onLogout]);

    return (
        <nav className={ styles.rail } aria-label={ translation('key_primary') }>
            <div className={ styles.brand }>M</div>

            { railGroups.map((group, groupIdx) => (
                <React.Fragment key={ group[0] }>
                    { groupIdx > 0 && <span className={ styles.sep } /> }
                    { group.map((path) => {
                        const item = permittedByPath.get(path);
                        const badge = path === "/chat-view" && chatUnread > 0
                            ? (chatUnread > 9 ? "9+" : chatUnread)
                            : null;
                        return (
                            <Link
                                key={ path }
                                to={ path }
                                className={ `${ styles.railBtn } ${ isActive(path) ? styles.active : "" }` }
                                data-l={ headingCase(item.label) }
                                aria-label={ headingCase(item.label) }
                            >
                                <ShellIcon name={ RAIL_ICONS[path] } />
                                { badge != null && <span className={ styles.badge }>{ badge }</span> }
                            </Link>
                        );
                    }) }
                </React.Fragment>
            )) }

            <span className={ styles.spacer } />

            { hasSettings && (
                <Link
                    to="/settings"
                    className={ `${ styles.railBtn } ${ isActive("/settings") ? styles.active : "" }` }
                    data-l={ headingCase(permittedByPath.get("/settings")?.label) || "Settings" }
                    aria-label={ headingCase(permittedByPath.get("/settings")?.label) || translation('key_settings') }
                >
                    <ShellIcon name="cog" />
                </Link>
            ) }

            <div className={ styles.userWrap } ref={ userRef }>
                <button
                    type="button"
                    className={ styles.railUser }
                    data-l={ fullName || "Account" }
                    aria-label={ fullName || translation('key_nav_account') }
                    aria-haspopup="true"
                    aria-expanded={ showUserMenu }
                    onClick={ () => setShowUserMenu((v) => !v) }
                >
                    { userPhoto && !photoFailed
                        ? <img src={ userPhoto } className={ styles.railUserPhoto } alt="" width={ 32 } height={ 32 } decoding="async" onError={ () => setPhotoFailed(true) } />
                        : userInitials }
                </button>
                { showUserMenu && (
                    <div className={ styles.userMenu } role="menu">
                        <div className={ styles.menuHeader }>{ fullName || translation('key_nav_account') }</div>
                        <div className={ styles.menuRole }>{ staffRole }</div>
                        <div className={ styles.menuDivider } />
                        { (canViewMyProfile || staffType === "partner") && (
                            <Link className={ styles.menuItem } to={ generalRoutes.myProfile } onClick={ () => setShowUserMenu(false) }>
                                <Icon name="user" size={ 14 } />
                                { translation("key_my_profile") }
                            </Link>
                        ) }
                        { canAddLeave && (
                            <Link className={ styles.menuItem } to={ generalRoutes.leaves } onClick={ () => setShowUserMenu(false) }>
                                <Icon name="filetext" size={ 14 } />
                                { translation("key_apply_leave") }
                            </Link>
                        ) }
                        { canOpenCalendar && (
                            <Link className={ styles.menuItem } to={ generalRoutes.calendar } onClick={ () => setShowUserMenu(false) }>
                                <Icon name="calendar" size={ 14 } />
                                { translation("key_calendar") }
                            </Link>
                        ) }
                        { canRaiseTimeRequest && (
                            <Link className={ styles.menuItem } to={ generalRoutes.timeRequests } onClick={ () => setShowUserMenu(false) }>
                                <Icon name="progress" size={ 14 } />
                                { translation("key_raise_time_request") }
                            </Link>
                        ) }
                        <Link className={ styles.menuItem } to={ generalRoutes.myReportees } onClick={ () => setShowUserMenu(false) }>
                            <Icon name="handshake" size={ 14 } />
                            { translation("key_my_reportees") }
                        </Link>
                        <div className={ styles.menuDivider } />
                        <button type="button" className={ `${ styles.menuItem } ${ styles.menuItemDanger }` } onClick={ handleLogoutClick }>
                            <Icon name="logout" size={ 14 } />
                            { translation("key_log_out") }
                        </button>
                    </div>
                ) }
            </div>
        </nav>
    );
};

Sidebar.propTypes = {
    onLogout: PropTypes.func,
};

export default React.memo(Sidebar);
