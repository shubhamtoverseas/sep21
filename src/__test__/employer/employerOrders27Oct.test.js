/* eslint-env jest */
import React from "react";
import fs from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";
import WkdSubTabBar from "../../Views/Pages/WorkerPage/worker-detail/newui/WkdSubTabBar";

const SRC = path.resolve(__dirname, "../../");
const walk = (dir, out = []) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (entry.name.endsWith(".js")) out.push(full);
    });
    return out;
};

describe("Employer / Job Offer i18n: no literal text composed around a translation (work order 27 Oct)", () => {
    test("no `${translation(...)}<literal>` label compositions remain in Views/Pages/Employer or Views/Pages/JobOfferPage", () => {
        const files = [...walk(path.join(SRC, "Views/Pages/Employer")), ...walk(path.join(SRC, "Views/Pages/JobOfferPage"))];
        const offenders = [];
        files.forEach((file) => {
            const src = fs.readFileSync(file, "utf8");
            /* a template literal that wraps a translation() call and adds visible characters beside it, assigned to a label / title prop */
            const re = /(label|title|header|placeholder)\s*[:=]\s*\{?`[^`]*\$\{\s*translation\([^)]*\)\s*\}[^`]*[A-Za-z?()][^`]*`/g;
            let m;
            while ((m = re.exec(src)) !== null) offenders.push(`${path.relative(SRC, file)}: ${m[0].slice(0, 80)}`);
        });
        expect(offenders).toEqual([]);
    });
});

describe("Sub-tab bar empty state (work order 27 Oct, Employer Details with no viewable section)", () => {
    test("renders the given message instead of an empty tab bar when no tab is permitted", () => {
        const { container } = render(<WkdSubTabBar tabs={ [] } emptyMessage="You are not authorized to access this page." />);
        expect(screen.getByRole("status")).toHaveTextContent("You are not authorized to access this page.");
        expect(container.querySelector(".g2-section-tabs")).toBeNull();
    });
    test("renders the tabs as before when at least one is permitted", () => {
        const { container } = render(<WkdSubTabBar tabs={ [{ eventKey: "a", title: "Employer Details", content: <p>card</p> }] } activeKey="a" emptyMessage="denied" />);
        expect(container.querySelector(".g2-section-tabs")).not.toBeNull();
        expect(screen.queryByText("denied")).toBeNull();
    });
});
