import * as React from "react";
import { Button, Textarea, makeStyles, tokens } from "@fluentui/react-components";
import { Send24Regular } from "@fluentui/react-icons";

const useStyles = makeStyles({
    container: {
        display: "flex",
        gap: "5px",
        padding: "10px",
        borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    },
    input: {
        flex: 1,
    },
});

interface ChatInputProps {
    onSend: (text: string) => void;
    disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
    const styles = useStyles();
    const [text, setText] = React.useState("");

    const handleSend = () => {
        if (text.trim() && !disabled) {
            onSend(text);
            setText("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className={styles.container}>
            <Textarea
                className={styles.input}
                value={text}
                onChange={(_, data) => setText(data.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me to redline or summarize..."
                resize="none"
                disabled={disabled}
            />
            <Button icon={<Send24Regular />} appearance="primary" onClick={handleSend} disabled={disabled || !text.trim()} />
        </div>
    );
};
