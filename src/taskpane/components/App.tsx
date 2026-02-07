import * as React from "react";
import { FluentProvider, webLightTheme, Text } from "@fluentui/react-components";
import { Chat } from "./Chat/Chat";
import { enableTrackChanges } from "../office-interactions";

import { LIVANOVA_LOGO_BASE64, NOVA_ASSIST_LOGO_BASE64 } from "./Chat/logo";

const App: React.FC = () => {
    // Auto-enable Track Changes on launch
    React.useEffect(() => {
        const init = async () => {
            try {
                await enableTrackChanges();
                console.log("Auto-enabled Track Changes on launch");
            } catch (e) {
                console.warn("Failed to auto-enable Track Changes:", e);
            }
        };
        init();
    }, []);

    return (
        <FluentProvider theme={webLightTheme}>
            <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "15px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: "10px" }}>
                    <img src={NOVA_ASSIST_LOGO_BASE64} alt="Logo" style={{ width: "24px", height: "24px" }} />
                    <Text size={500} weight="bold">NovaAssist</Text>
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                    <Chat />
                </div>
            </div>
        </FluentProvider>
    );
};

export default App;
