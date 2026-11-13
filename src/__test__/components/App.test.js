/* eslint-env jest */
import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";

// Minimal reducers to avoid pulling in axios/network dependencies
const mockReducers = {
  auth: (state = { isLoggedIn: false, interviewToBeCompleted: [] }) => state,
  interview: (state = { interviewToBeCompleted: [], status: "idle" }) => state,
};

function makeStore(preloadedState = {}) {
  return configureStore({
    reducer: mockReducers,
    preloadedState,
  });
}

// Lazy-loaded sub-components need i18n — mock it to avoid network requests.
// TranslationProvider reads `i18n` from useTranslation (language, getResourceBundle, reloadResources, on / off).
jest.mock("react-i18next", () => {
  const i18n = {
    language: "en",
    getResourceBundle: () => ({}),
    reloadResources: () => Promise.resolve(),
    changeLanguage: () => Promise.resolve(),
    on: jest.fn(),
    off: jest.fn(),
  };
  return {
    useTranslation: () => ({ t: (key) => key, i18n, ready: true }),
    initReactI18next: { type: "3rdParty", init: () => {} },
  };
});

// Socket.io connects to a real server in App — prevent that in tests.
// App.js and src/socket/socket.js call the DEFAULT export (`io(url, opts)`), so the mock must provide it.
jest.mock("socket.io-client", () => {
  const socket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
    id: "test-socket-id",
    connected: false,
  };
  const io = jest.fn(() => socket);
  return { __esModule: true, default: io, io, connect: io };
});

// Mock services to prevent axios / network calls
jest.mock("../../services/apiPath", () => ({
  REACT_APP_SCHEDULER_URL: "http://localhost",
}));

describe("App entry point", () => {
  it("renders without crashing when the user is not logged in", () => {
    const store = makeStore({
      auth: { isLoggedIn: false },
      interview: { interviewToBeCompleted: [], status: "idle" },
    });

    // App lazy-loads pages so we only assert the component tree mounts
    expect(() =>
      render(
        <Provider store={store}>
          <MemoryRouter initialEntries={["/"]}>
            {React.createElement(
              require("../../Views/Pages/App").default
            )}
          </MemoryRouter>
        </Provider>
      )
    ).not.toThrow();
  });
});
