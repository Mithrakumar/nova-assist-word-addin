import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";

/* global document, Office, module, require */

Office.onReady((info) => {
    if (info.host === Office.HostType.Word) {
        const rootElement = document.getElementById("container");
        if (rootElement) {
            const root = createRoot(rootElement);
            root.render(<App />);
        }
    }
});

if ((module as any).hot) {
    (module as any).hot.accept("./components/App", () => {
        const NextApp = require("./components/App").default;
        const rootElement = document.getElementById("container");
        if (rootElement) {
            const root = createRoot(rootElement);
            root.render(<NextApp />);
        }
    });
}
