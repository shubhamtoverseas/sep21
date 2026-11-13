import React, { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { useSelector, shallowEqual } from "react-redux";
import { useTranslation } from "react-i18next";
import styles from "./Topbar.module.css";
import NotificationDropdown from "./notification-dropdown/NotificationDropdown";
import ShellIcon from "./ShellIcon";
import Icon from "../Icon/Icon";
import translation from "../../utils/translation";

const LANGUAGES = [
    { code: "en", label: "English", short: "EN" },
    { code: "zh_HK", label: "中文", short: "中文" },
];

const Topbar = () => {
    const { i18n } = useTranslation();

    const { notificationUnreadCount } = useSelector(
        (state) => ({
            notificationUnreadCount: state.common?.notificationUnreadCount || 0,
        }),
        shallowEqual
    );

    const activeLang = useMemo(() => {
        const lng = (i18n.language || "en").replace("-", "_");
        return (
            LANGUAGES.find((l) => lng === l.code || lng.slice(0, 2) === l.code.slice(0, 2)) ||
            LANGUAGES[0]
        );
    }, [i18n.language]);

    const [showLangMenu, setShowLangMenu] = useState(false);
    const langRef = useRef(null);

    useEffect(() => {
        if (!showLangMenu) return undefined;
        const handler = (e) => {
            if (langRef.current && !langRef.current.contains(e.target)) setShowLangMenu(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showLangMenu]);

    const handleLangSelect = useCallback(
        (code) => {
            setShowLangMenu(false);
            const norm = (l) => (l || "").replace("-", "_");
            if (norm(i18n.language) === norm(code)) return;
            i18n.changeLanguage(code).finally(() => window.location.reload());
        },
        [i18n]
    );

    return (
        <header className={ styles.topbar }>
            <button type="button" className={ styles.search } aria-label="Search">
                <ShellIcon name="search" size={ 15 } />
                <span>{ translation('key_search_jobs_workers_employers') }…</span>
                <kbd>⌘K</kbd>
            </button>

            <div className={ styles.spacer } />

            <div className={ styles.dropdownWrap } ref={ langRef }>
                <button
                    type="button"
                    className={ styles.lang }
                    onClick={ () => setShowLangMenu((v) => !v) }
                    aria-label="Select language"
                    aria-haspopup="true"
                    aria-expanded={ showLangMenu }
                >
                    <ShellIcon name="globe" size={ 15 } />
                    { activeLang.short }
                    <ShellIcon name="chev_down" size={ 11 } />
                </button>
                { showLangMenu && (
                    <div className={ styles.dropdownMenu }>
                        <div className={ styles.dropdownHeader }>{ translation('key_language') }</div>
                        { LANGUAGES.map((lng) => (
                            <button
                                key={ lng.code }
                                type="button"
                                className={ `${ styles.dropdownItem } ${ activeLang.code === lng.code ? styles.active : "" }` }
                                onClick={ () => handleLangSelect(lng.code) }
                            >
                                { activeLang.code === lng.code && <Icon name="check" size={ 14 } /> }
                                { lng.label }
                            </button>
                        )) }
                    </div>
                ) }
            </div>

            <NotificationDropdown
                notificationUnreadCount={ notificationUnreadCount }
                customTrigger={
                    <button type="button" className={ styles.iconBtn } aria-label={ translation('key_notifications') }>
                        <ShellIcon name="bell" size={ 15 } />
                        { notificationUnreadCount > 0 && (
                            <span className={ styles.badge }>
                                { notificationUnreadCount > 99 ? "99+" : notificationUnreadCount }
                            </span>
                        ) }
                    </button>
                }
            />
        </header>
    );
};

export default React.memo(Topbar);
