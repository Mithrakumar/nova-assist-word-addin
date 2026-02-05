import * as React from "react";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { makeStyles, tokens, Button, Spinner } from "@fluentui/react-components";
import { Message } from "../../types";
import { openaiService } from "../../../services/openai";
import { graphService } from "../../../services/graph";
import { insertRedline, getDocumentText, getSelectedText, insertText, insertAsTrackedChange, addComment, insertImage, applySurgicalRedlines } from "../../office-interactions";
import { LIVANOVA_LOGO_BASE64 } from "./logo";
import { Edit24Regular, Search24Regular, Image24Regular } from "@fluentui/react-icons";

// ... (keep useStyles as is)
const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 58px)", // Reduced height adjustment to fit header
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
        "::-webkit-scrollbar": { display: "none" } // Hide scrollbar for sleekness
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

    // Quick Action Handler
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

            // Simple intent handling
            if (text.toLowerCase().includes("pull up")) {
                // Mock Graph Search
                const files = await graphService.searchSharePoint(text);
                botText = `I found a few documents: ${files.map(f => f.name).join(", ")}. I can compare them if you like.`;
            } else if (text.toLowerCase().includes("insert")) {
                // "Insert" intent: Take the last bot message and insert it.
                const lastBotMessage = [...messages].reverse().find(m => m.sender === "bot");
                if (lastBotMessage) {
                    // Extract content between <doc> tags if present
                    const match = lastBotMessage.text.match(/<doc>([\s\S]*?)<\/doc>/);
                    const contentToInsert = match ? match[1] : lastBotMessage.text;

                    await insertAsTrackedChange(contentToInsert);
                    botText = "Inserted text into document as a tracked change.";
                } else {
                    botText = "I don't have anything to insert yet.";
                }

            } else if (text.toLowerCase().includes("comment") || text.toLowerCase().includes("justification") || text.toLowerCase().includes("why")) {
                // Comment Intent
                if (lastJustification.current) {
                    await addComment(lastJustification.current);
                    botText = `Added comment: "${lastJustification.current}"`;
                } else {
                    botText = "I don't have a recent edit to justify. Try asking me to rewrite something first.";
                }

            } else if (text.toLowerCase().includes("refer to") || text.toLowerCase().includes("based on") || text.toLowerCase().includes("using")) {
                // RAG Flow: Search for the referenced document
                botText = "Searching OneDrive for reference documents...";
                // Intermediate update
                setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text: botText, timestamp: new Date() }]);

                // Simple extraction of generic search terms for demo
                const searchTerm = text.replace("refer to", "").replace("based on", "").replace("using", "").trim();
                console.log("Searching for:", searchTerm); // Debug log

                const files = await graphService.searchSharePoint(searchTerm);

                if (files.length > 0) {
                    const file = files[0]; // Take top match
                    lastSourceDoc.current = file.name; // Store source name
                    // Update user that we found it
                    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text: `Found "${file.name}". Reading content...`, timestamp: new Date() }]);

                    const fileContent = await graphService.getFileContent(file.id);
                    lastSourceContent.current = fileContent; // Store source content!

                    // Call AI with the File Content as Context
                    const ragContext = `Reference Document (${file.name}):\n${fileContent}`;
                    botText = await openaiService.chat([...messages, newMessage], ragContext); // Pass file content as context
                } else {
                    botText = "I couldn't find a matching document in OneDrive.";
                }

            } else if (text.toLowerCase().includes("find source") || text.toLowerCase().includes("citation") || text.toLowerCase().includes("where is this from")) {
                // Reverse Citation Lookup
                if (!lastSourceContent.current) {
                    botText = "I don't have a reference document loaded yet. Please ask me to 'refer to [document name]' first.";
                } else {
                    botText = "Analyzing selection against reference document...";
                    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text: botText, timestamp: new Date() }]);

                    try {
                        const selection = await getSelectedText();
                        if (!selection) {
                            botText = "Please select the text you want to find the source for.";
                        } else {
                            // Construct a prompt to find the match
                            const prompt = `Context: The user has selected text in their document. Your task is to find the corresponding original text or supporting section in the Reference Document.\n\nReference Document Content:\n${lastSourceContent.current}\n\nSelected Text:\n${selection}\n\nTask: Return the exact quote(s) from the Reference Document that matches or supports the selection. Wrap the quote in <doc> tags.`;

                            botText = await openaiService.chat(
                                [{ id: "sys", sender: "bot", text: "You are a citation assistant.", timestamp: new Date() }, ...messages],
                                prompt
                            );
                        }
                    } catch (e) {
                        botText = "Error analyzing source: " + (e as any).message;
                    }
                }

            } else if (text.toLowerCase().includes("logo")) {
                botText = "Inserting LivaNova logo...";
                // setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text: botText, timestamp: new Date() }]);

                try {
                    await insertImage(LIVANOVA_LOGO_BASE64);
                    botText = "LivaNova Logo inserted!";
                } catch (e) {
                    botText = "Error inserting logo: " + (e as any).message;
                }

            } else if (text.toLowerCase().includes("redline") || text.toLowerCase().includes("rewrite")) {
                // Redline Flow
                if (!text.toLowerCase().includes("based on")) {
                    botText = "Analyzing selection...";
                } else {
                    botText = "Analyzing selection with context...";
                }
                // setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text: botText, timestamp: new Date() }]);

                try {
                    // 0. CHECK FOR AUTO-CONTEXT ("Redline based on Policy")
                    const match = text.match(/(?:based on|using|match)\s+(.+)/i);
                    if (match) {
                        const query = match[1].trim();
                        // setMessages((prev) => [...prev, { id: Date.now().toString(), sender: "bot", text: `(Loading "${query}" for context...)`, timestamp: new Date() }]);

                        const files = await graphService.searchSharePoint(query);
                        if (files && files.length > 0) {
                            const file = files[0];
                            lastSourceDoc.current = file.name;
                            const content = await graphService.getFileContent(file.id);
                            lastSourceContent.current = content;
                        }
                    }

                    // 1. Get Selected Text
                    console.log("Step 1: Getting selection...");
                    let selection;
                    try {
                        selection = await getSelectedText();
                    } catch (e) {
                        throw new Error(`Step 1 (Selection) failed: ${(e as any).message}`);
                    }
                    console.log("Step 1 Complete. Selection length:", selection?.length);

                    if (!selection || selection.trim().length === 0) {
                        botText = "I couldn't read your selection. Please make sure you have text highlighted in the document.";
                    } else {
                        console.log("Valid Selection:", selection.substring(0, 50));
                        // 2. Call AI with CONTEXT
                        console.log("Step 2: Calling AI...");
                        let redlines;
                        try {
                            redlines = await openaiService.generateRedlines(selection, text, lastSourceContent.current);
                        } catch (e) {
                            throw new Error(`Step 2 (AI) failed: ${(e as any).message}`);
                        }

                        // 3. Apply Redline
                        if (redlines && redlines.length > 0) {
                            // Store justification for later use
                            let justification = redlines[0].justification;
                            if (lastSourceDoc.current) {
                                justification += ` (Source: ${lastSourceDoc.current})`;
                            }
                            lastJustification.current = justification;

                            // Use applySurgicalRedlines for precise diffing
                            console.log("Step 3: Calculating and applying surgical redlines...");
                            try {
                                await applySurgicalRedlines(selection, redlines[0].new);
                                if (justification) {
                                    // Add comment to the selection area
                                    await addComment(justification);
                                }
                            } catch (e) {
                                throw new Error(`Step 3 (Surgical Redline) failed: ${(e as any).message}`);
                            }
                            console.log("Step 3 Complete.");

                            botText = `I've redlined the selection: "${redlines[0].new}"\n\n(I added a comment explaining why.)`;
                        } else {
                            botText = "I couldn't generate a suggestion.";
                        }
                    }
                } catch (error) {
                    console.error("Redline Error details:", error);
                    botText = "Error redlining matches: " + (error as any).message;
                }
            } else {
                // General Chat
                let docText = "";
                try {
                    docText = await getDocumentText();
                } catch (e) {
                    console.warn("Could not fetch doc text", e);
                }

                // Add current messages to history + Doc Context
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
                            // Extract content between <doc> tags if present
                            const match = text.match(/<doc>([\s\S]*?)<\/doc>/);
                            const contentToInsert = match ? match[1] : text;
                            await insertAsTrackedChange(contentToInsert);
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
                <Button size="small" shape="circular" appearance="outline" icon={<Search24Regular />} onClick={() => handleQuickAction("Find Source for this selection")}>
                    Find Source
                </Button>
                <Button size="small" shape="circular" appearance="outline" icon={<Image24Regular />} onClick={() => handleQuickAction("Add LivaNova's logo")}>
                    Add Logo
                </Button>
            </div>

            <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
    );
};
