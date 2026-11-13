import React from "react";
import PropTypes from "prop-types";
import translation from "../../utils/translation";
import "./ErrorBoundary.css";

const arraysDiffer = (a = [], b = []) =>
    a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    componentDidMount() {
        if (!this.props.captureGlobal || typeof window === "undefined") return;
        window.addEventListener("error", this.handleWindowError);
        window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
    }

    componentWillUnmount() {
        if (!this.props.captureGlobal || typeof window === "undefined") return;
        window.removeEventListener("error", this.handleWindowError);
        window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // Surface for diagnostics. Swap console for a remote logger if available.
        // eslint-disable-next-line no-console
        console.error("[ErrorBoundary]", error, info?.componentStack);
        if (typeof this.props.onError === "function") {
            this.props.onError(error, info);
        }
    }

    componentDidUpdate(prevProps) {
        if (this.state.hasError && arraysDiffer(prevProps.resetKeys, this.props.resetKeys)) {
            this.reset();
        }
    }

    handleWindowError = (event) => {
        if (this.state.hasError) return;
        this.setState({ hasError: true, error: event?.error || new Error(event?.message || "Unexpected runtime error") });
    };

    handleUnhandledRejection = (event) => {
        if (this.state.hasError) return;
        const reason = event?.reason;
        const normalizedError = reason instanceof Error ? reason : new Error(typeof reason === "string" ? reason : "Unhandled promise rejection");
        this.setState({ hasError: true, error: normalizedError });
    };

    reset = () => {
        this.setState({ hasError: false, error: null });
        if (typeof this.props.onReset === "function") this.props.onReset();
    };

    render() {
        if (!this.state.hasError) return this.props.children;

        if (typeof this.props.fallback === "function") {
            return this.props.fallback({ error: this.state.error, reset: this.reset });
        }
        if (this.props.fallback) return this.props.fallback;

        return <DefaultFallback error={this.state.error} reset={this.reset} compact={this.props.compact} />;
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node,
    fallback: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
    resetKeys: PropTypes.array,
    onError: PropTypes.func,
    onReset: PropTypes.func,
    compact: PropTypes.bool,
    captureGlobal: PropTypes.bool,
};

ErrorBoundary.defaultProps = {
    resetKeys: [],
    compact: false,
    captureGlobal: false,
};

/* Fallback — styles live in ErrorBoundary.css; layout uses bootstrap
   utilities. Navigation via window so it works even without router context. */
const DefaultFallback = ({ error, reset, compact }) => {
    const t = (k, fb) => {
        const v = translation(k);
        return v && v !== k ? v : fb;
    };
    return (
        <div className={"eb-wrap d-flex align-items-center justify-content-center text-center" + (compact ? " eb-compact" : "")}>
            <div className="eb-inner">
                <div className="eb-icon rounded-circle d-flex align-items-center justify-content-center">!</div>
                <h2 className="eb-title">{t("key_something_went_wrong", "Something went wrong")}</h2>
                <p className="eb-desc">
                    {t("key_error_boundary_desc", "An unexpected error occurred while displaying this page. You can try again, or reload the application.")}
                </p>
                <div className="eb-actions d-flex justify-content-center flex-wrap">
                    <button type="button" className="eb-btn eb-btn-primary" onClick={reset}>
                        {t("key_try_again", "Try again")}
                    </button>
                    <button type="button" className="eb-btn eb-btn-secondary" onClick={() => window.location.reload()}>
                        {t("key_reload_page", "Reload page")}
                    </button>
                    {!compact && (
                        <button type="button" className="eb-btn eb-btn-secondary" onClick={() => { window.location.href = "/dashboard"; }}>
                            {t("key_go_to_dashboard", "Go to dashboard")}
                        </button>
                    )}
                </div>
                {error?.message && <div className="eb-error">{String(error.message)}</div>}
            </div>
        </div>
    );
};

DefaultFallback.propTypes = {
    error: PropTypes.object,
    reset: PropTypes.func.isRequired,
    compact: PropTypes.bool,
};

export default ErrorBoundary;
