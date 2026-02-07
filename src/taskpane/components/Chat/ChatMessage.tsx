import * as React from "react";
import { Body1, makeStyles, tokens, Avatar, Button } from "@fluentui/react-components";
import { ArrowImport16Regular } from "@fluentui/react-icons";
import { Message } from "../../types";
import { NOVA_ASSIST_LOGO_BASE64 } from "./logo";

const useStyles = makeStyles({
    root: {
        display: "flex",
        width: "100%",
        marginTop: "8px",
        marginBottom: "8px",
    },
    userRoot: {
        justifyContent: "flex-end",
    },
    botRoot: {
        justifyContent: "flex-start",
    },
    container: {
        display: "flex",
        maxWidth: "80%",
        gap: "8px",
        alignItems: "flex-end", // Align avatar to bottom of message
        flexDirection: "row", // default
    },
    bubble: {
        padding: "12px 16px",
        borderRadius: "18px",
        position: "relative",
        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
    },
    userBubble: {
        backgroundColor: tokens.colorBrandBackground,
        color: tokens.colorNeutralForegroundOnBrand,
        borderBottomRightRadius: "4px", // Subtle "tail" effect
    },
    botBubble: {
        backgroundColor: tokens.colorNeutralBackground2,
        color: tokens.colorNeutralForeground1,
        borderBottomLeftRadius: "4px",
    },
    actionRow: {
        marginTop: "4px",
        display: "flex",
        gap: "4px",
    }
});

interface ChatMessageProps {
    message: Message;
    onInsert?: (text: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onInsert }) => {
    const styles = useStyles();
    const isUser = message.sender === "user";

    // Debug comment to force rebuild
    return (
        <div className={`${styles.root} ${isUser ? styles.userRoot : styles.botRoot}`}>
            <div className={styles.container} style={{ flexDirection: isUser ? "row-reverse" : "row" }}>
                {!isUser && (
                    <div style={{ width: "32px", height: "32px", flexShrink: 0 }}>
                        <img
                            src={NOVA_ASSIST_LOGO_BASE64}
                            alt="NovaAssist"
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                    </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
                    <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.botBubble}`}>
                        <Body1 style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {message.text.split(/(<doc>[\s\S]*?<\/doc>)/g).map((part, index) => {
                                const match = part.match(/<doc>([\s\S]*?)<\/doc>/);
                                if (match) {
                                    return (
                                        <div key={index} style={{
                                            borderLeft: `4px solid ${tokens.colorCompoundBrandBackground}`,
                                            backgroundColor: tokens.colorNeutralBackground1,
                                            color: tokens.colorNeutralForeground1,
                                            padding: "8px 12px",
                                            marginTop: "8px",
                                            marginBottom: "8px",
                                            borderRadius: "4px",
                                            fontStyle: "italic"
                                        }}>
                                            {match[1].trim()}
                                            {message.sourceDoc && (
                                                <div style={{
                                                    marginTop: "8px",
                                                    fontSize: "0.8em",
                                                    color: tokens.colorNeutralForeground3,
                                                    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
                                                    paddingTop: "4px"
                                                }}>
                                                    Source: {message.sourceDoc}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                return <span key={index}>{part}</span>;
                            })}
                        </Body1>
                    </div>
                    {/* Only show 'Insert' action for bot messages if onInsert is provided */}
                    {!isUser && onInsert && (
                        <div className={styles.actionRow}>
                            <Button
                                size="small"
                                icon={<ArrowImport16Regular />}
                                appearance="subtle"
                                onClick={() => onInsert(message.text)}
                                title="Insert into document"
                            >
                                Insert
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
