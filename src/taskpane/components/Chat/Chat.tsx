import * as React from "react";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { makeStyles, tokens, Button, Spinner } from "@fluentui/react-components";
import { Message } from "../../types";
import { openaiService } from "../../../services/openai";
import { graphService } from "../../../services/graph";
import { regulatoryService } from "../../../services/regulatory";
import { insertRedline, getDocumentText, getSelectedText, insertText, insertAsTrackedChange, addComment, insertImage, applySurgicalRedlines, enableTrackChanges } from "../../office-interactions";
import { NOVA_ASSIST_LOGO_BASE64 } from "./logo";
import { Edit24Regular, Search24Regular, Image24Regular, ShieldCheckmark24Regular, Organization24Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 58px)",
        gap: "10px",
    },
    list: {
        flex: 1,
        overflowY: "auto",
        padding: "10px 20px",
        display: "flex",
        flexDirection: "column",
    },
    quickActions: {
        display: "flex",
        gap: "8px",
        padding: "0 15px",
        overflowX: "auto",
        whiteSpace: "nowrap",
        paddingBottom: "5px",
        "::-webkit-scrollbar": { display: "none" }
    }
});

export const Chat: React.FC = () => {
    const styles = useStyles();
    const [messages, setMessages] = React.useState<Message[]>([
        { id: "1", sender: "bot", text: "Hello! I'm NovaAssist. How can I help you draft or review today?", timestamp: new Date() }
    ]);
    const [isLoading, setIsLoading] = React.useState(false);

    const lastJustification = React.useRef<string>("");
    const lastSourceDoc = React.useRef<string>("");
    const lastSourceContent = React.useRef<string>("");

    const handleQuickAction = (action: string) => {
        handleSend(action);
    };

    const handleSend = async (text: string) => {
        const newMessage: Message = {
            id: Date.now().toString(),
            sender: "user",
            text: text,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, newMessage]);
        setIsLoading(true);

        try {
            let botText = "";

            // --- INTENT HANDLING ---

            // 1. COMPLIANCE & REGULATORY (High Priority)
            if (text.toLowerCase().includes("compliance") || text.toLowerCase().includes("compliant") || text.toLowerCase().includes("analyze regulations") || (text.toLowerCase().includes("check") && text.toLowerCase().includes("policy"))) {
                botText = "Analyzing document compliance against FDA regulations and Internal Policies...";
                setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text: botText, timestamp: new Date() }]);

                try {
                    const docText = await getDocumentText();
                    const [fdaData, maudeData, policyData] = await Promise.all([
                        regulatoryService.searchFDA("pacemaker"),
                        regulatoryService.searchMAUDE("lead fracture"),
                        graphService.getFileContent("4")
                    ]);

                    const regulations = [...fdaData, ...maudeData].map(r => `${r.type}: ${r.title} - ${r.summary}`);
                    const policies = [policyData];

                    const result = await openaiService.analyzeCompliance(docText, { policies, regulations });
                    botText = `**Compliance Status: ${result.status}**\n\n${result.summary}\n\n**Key Issues:**\n` +
                        result.issues.map(i => `- [${i.severity}] ${i.description} (${i.citation})`).join('\n');
                } catch (e) { botText = "Error analyzing compliance: " + (e as any).message; }

            } else if (text.toLowerCase().includes("pull up")) {
                const files = await graphService.searchSharePoint(text);
                botText = `I found a few documents: ${files.map(f => f.name).join(", ")}. I can compare them if you like.`;

            } else if (text.toLowerCase().includes("insert")) {
                const lastBotMessage = [...messages].reverse().find(m => m.sender === "bot");
                if (lastBotMessage) {
                    const match = lastBotMessage.text.match(/<doc>([\s\S]*?)<\/doc>/);
                    const contentToInsert = match ? match[1] : lastBotMessage.text;
                    await insertAsTrackedChange(contentToInsert);
                    botText = "Inserted text into document as a tracked change.";
                } else {
                    botText = "I don't have anything to insert yet.";
                }

            } else if (text.toLowerCase().includes("comment") || text.toLowerCase().includes("justification") || text.toLowerCase().includes("why")) {
                if (lastJustification.current) {
                    await addComment(lastJustification.current);
                    botText = `Added comment: "${lastJustification.current}"`;
                } else {
                    botText = "I don't have a recent edit to justify. Try asking me to rewrite something first.";
                }

            } else if (text.toLowerCase().includes("refer to") || text.toLowerCase().includes("based on") || text.toLowerCase().includes("using")) {
                botText = "Searching OneDrive for reference documents...";
                setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text: botText, timestamp: new Date() }]);

                const searchTerm = text.replace("refer to", "").replace("based on", "").replace("using", "").trim();
                const files = await graphService.searchSharePoint(searchTerm);

                if (files.length > 0) {
                    const file = files[0];
                    lastSourceDoc.current = file.name;
                    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text: `Found "${file.name}". Reading content...`, timestamp: new Date() }]);

                    const fileContent = await graphService.getFileContent(file.id);
                    lastSourceContent.current = fileContent;
                    const ragContext = `Reference Document (${file.name}):\n${fileContent}`;
                    botText = await openaiService.chat([...messages, newMessage], ragContext);
                } else {
                    botText = "I couldn't find a matching document in OneDrive.";
                }

            } else if (text.toLowerCase().includes("find source") || text.toLowerCase().includes("citation")) {
                if (!lastSourceContent.current) {
                    botText = "I don't have a reference document loaded yet. Please ask me to 'refer to [document name]' first.";
                } else {
                    botText = "Analyzing selection against reference document...";
                    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text: botText, timestamp: new Date() }]);
                    try {
                        const selection = await getSelectedText();
                        if (!selection) botText = "Please select text first.";
                        else {
                            const prompt = `Context: Find the source of this text in the Reference Document.\nRef Doc:\n${lastSourceContent.current}\nSelection:\n${selection}\nTask: Return exact quote in <doc> tags.`;
                            botText = await openaiService.chat([{ id: "sys", sender: "bot", text: "Citation assistant.", timestamp: new Date() }, ...messages], prompt);
                        }
                    } catch (e) { botText = "Error: " + (e as any).message; }
                }

            } else if (text.toLowerCase().includes("logo")) {
                botText = "Inserting NovaAssist logo...";
                try {
                    await insertImage(NOVA_ASSIST_LOGO_BASE64);
                    botText = "NovaAssist Logo inserted!";
                } catch (e) { botText = "Error: " + (e as any).message; }

                // --- NEW REGULATORY FEATURES ---

            } else if (text.toLowerCase().includes("fda") || text.toLowerCase().includes("maude") || text.toLowerCase().includes("regulatory search")) {
                const query = text.replace(/search|fda|maude|regulatory/gi, "").trim();
                botText = `Searching regulatory databases for "${query}"...`;
                setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text: botText, timestamp: new Date() }]);

                try {
                    const [fdaResults, maudeResults] = await Promise.all([
                        regulatoryService.searchFDA(query),
                        regulatoryService.searchMAUDE(query)
                    ]);
                    const results = [...fdaResults, ...maudeResults];
                    if (results.length > 0) {
                        botText = `Found ${results.length} regulatory records:\n\n` +
                            results.map(r => `**${r.type}**: [${r.id}] ${r.title}\n_${r.summary}_`).join('\n\n');
                    } else { botText = "No regulatory records found."; }
                } catch (e) { botText = "Error searching DB: " + (e as any).message; }

            } else if (text.toLowerCase().includes("redline") || text.toLowerCase().includes("rewrite")) {
                // ... Redline Logic ...
                try { await enableTrackChanges(); } catch (e) { }

                if (!text.toLowerCase().includes("based on")) botText = "Analyzing selection...";
                else botText = "Analyzing selection with context..."; // Simplified for brevity in this rewrite, logic is same

                try {
                    const match = text.match(/(?:based on|using|match)\s+(.+)/i);
                    if (match) {
                        const files = await graphService.searchSharePoint(match[1].trim());
                        if (files.length > 0) {
                            lastSourceDoc.current = files[0].name;
                            lastSourceContent.current = await graphService.getFileContent(files[0].id);
                        }
                    }

                    const selection = await getSelectedText();
                    if (!selection) {
                        botText = "Please select text to redline.";
                    } else {
                        const redlines = await openaiService.generateRedlines(selection, text, lastSourceContent.current);
                        if (redlines && redlines.length > 0) {
                            lastJustification.current = redlines[0].justification;
                            await applySurgicalRedlines(selection, redlines[0].new);
                            await addComment(lastJustification.current);
                            botText = `Redlined selection. Added comment.`;
                        } else {
                            botText = "Could not generate suggestion.";
                        }
                    }
                } catch (e) { botText = "Redline Error: " + (e as any).message; }

            } else {
                // General Chat
                let docText = "";
                try { docText = await getDocumentText(); } catch (e) { }
                botText = await openaiService.chat([...messages, newMessage], docText);
            }

            const botResponse: Message = {
                id: (Date.now() + 100).toString(),
                sender: "bot",
                text: botText,
                timestamp: new Date(),
                sourceDoc: lastSourceDoc.current ? lastSourceDoc.current : undefined
            };
            setMessages((prev) => [...prev, botResponse]);

        } catch (error: any) {
            setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text: "Error: " + error.message, timestamp: new Date() }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.list}>
                {messages.map((msg) => (
                    <ChatMessage
                        key={msg.id}
                        message={msg}
                        onInsert={async (text) => {
                            const match = text.match(/<doc>([\s\S]*?)<\/doc>/);
                            await insertAsTrackedChange(match ? match[1] : text);
                        }}
                    />
                ))}
                {isLoading && (
                    <div style={{ display: 'flex', gap: '8px', padding: '10px', alignItems: 'center', color: tokens.colorNeutralForeground2 }}>
                        <Spinner size="extra-small" />
                        <span>NovaAssist is thinking...</span>
                    </div>
                )}
            </div>

            <div className={styles.quickActions}>
                <Button size="small" shape="circular" appearance="outline" icon={<Search24Regular />} onClick={() => handleQuickAction("Find Source")}>
                    Find Source
                </Button>
                <Button size="small" shape="circular" appearance="outline" icon={<ShieldCheckmark24Regular />} onClick={() => handleQuickAction("Analyze Compliance")}>
                    Compliance
                </Button>
                <Button size="small" shape="circular" appearance="outline" icon={<Organization24Regular />} onClick={() => handleQuickAction("Search FDA 510(k)")}>
                    FDA Search
                </Button>
                <Button size="small" shape="circular" appearance="outline" icon={<Image24Regular />} onClick={() => handleQuickAction("Add NovaAssist's logo")}>
                    Add Logo
                </Button>
            </div>

            <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
    );
};
