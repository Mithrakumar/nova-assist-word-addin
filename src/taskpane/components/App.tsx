import * as React from "react";
import { FluentProvider, webLightTheme, Text } from "@fluentui/react-components";
import { Chat } from "./Chat/Chat";

import { LIVANOVA_LOGO_BASE64, NOVA_ASSIST_LOGO_BASE64 } from "./Chat/logo";

const App: React.FC = () => {
    return (
        <FluentProvider theme={webLightTheme}>
            <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "15px", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: "10px" }}>
                    <img src={`data:image/png;base64,${NOVA_ASSIST_LOGO_BASE64}`} alt="Logo" style={{ width: "24px", height: "24px" }} />
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
