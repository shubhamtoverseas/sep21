import { useRef, useCallback, useEffect } from 'react';

const SCROLL_THRESHOLD = 150; // px from bottom to consider "at bottom"

/**
 * Smart auto-scroll hook for chat messages.
 * - Auto-scrolls only when user is near bottom
 * - Tracks new message count when scrolled up
 * - Uses requestAnimationFrame for smooth scrolling
 * - Preserves scroll position when prepending historical messages
 */
const useChatAutoScroll = () => {
    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);
    const isNearBottomRef = useRef(true);
    const scrollRAFRef = useRef(null);

    const checkIfNearBottom = useCallback(() => {
        const container = containerRef.current;
        if (!container) return true;
        const { scrollTop, scrollHeight, clientHeight } = container;
        return scrollHeight - scrollTop - clientHeight <= SCROLL_THRESHOLD;
    }, []);

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        if (scrollRAFRef.current) {
            cancelAnimationFrame(scrollRAFRef.current);
        }
        scrollRAFRef.current = requestAnimationFrame(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
            }
        });
    }, []);

    const scrollToBottomIfNeeded = useCallback(() => {
        if (isNearBottomRef.current) {
            scrollToBottom();
            return true;
        }
        return false;
    }, [scrollToBottom]);

    const handleContainerScroll = useCallback(() => {
        isNearBottomRef.current = checkIfNearBottom();
    }, [checkIfNearBottom]);

    /**
     * Preserve scroll position when content is prepended (pagination).
     * Call BEFORE prepending new messages to capture current scroll state,
     * then call the returned restore function AFTER the DOM updates.
     */
    const preserveScrollPosition = useCallback(() => {
        const container = containerRef.current;
        if (!container) return () => { };
        const prevScrollHeight = container.scrollHeight;
        const prevScrollTop = container.scrollTop;
        return () => {
            requestAnimationFrame(() => {
                if (containerRef.current) {
                    const newScrollHeight = containerRef.current.scrollHeight;
                    containerRef.current.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
                }
            });
        };
    }, []);

    // Attach scroll listener to container
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        container.addEventListener('scroll', handleContainerScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleContainerScroll);
            if (scrollRAFRef.current) {
                cancelAnimationFrame(scrollRAFRef.current);
            }
        };
    }, [handleContainerScroll]);

    return {
        messagesEndRef,
        containerRef,
        scrollToBottom,
        scrollToBottomIfNeeded,
        preserveScrollPosition,
        isNearBottom: () => isNearBottomRef.current,
    };
};

export default useChatAutoScroll;
