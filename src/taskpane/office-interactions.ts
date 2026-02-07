/* global Word, Office */

// Helper function to enable Track Changes
export async function enableTrackChanges(): Promise<void> {
    await Word.run(async (context) => {
        context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
        await context.sync();
        console.log("Track Changes enabled");
    });
}

export async function getSelectedText(): Promise<string> {
    return new Promise((resolve, reject) => {
        Office.context.document.getSelectedDataAsync(Office.CoercionType.Text, (result) => {
            if (result.status === Office.AsyncResultStatus.Failed) {
                // If selection fails, it might mean nothing is selected or API error.
                // Resolve empty string to avoid crashes, let UI handle "Please select".
                console.warn("Get selection failed:", result.error.message);
                resolve("");
            } else {
                resolve(result.value as string);
            }
        });
    });
}

export async function insertRedline(originalText: string, newText: string) {
    await Word.run(async (context) => {
        const range = context.document.getSelection();
        range.load("text");
        await context.sync();

        // Simple visual redlining simulation
        // In a real implementation, we would diff 'originalText' vs 'newText' 
        // and apply formatting to specific ranges.
        // For now, we will just insert the new text with specific formatting.

        // Clear suggestion:
        // This is a placeholder. Real redlining requires diffing logic.
        // We will just insert the suggested text in Green/Underline and strike the old.

        // Note: This logic needs to be sophisticated.
        // Approach:
        // 1. Strikethrough selection.
        // 2. Insert new text after.

        range.font.strikeThrough = true;
        range.font.color = "red";

        const insertion = range.insertText(newText, Word.InsertLocation.after);
        insertion.font.strikeThrough = false;
        insertion.font.color = "green";
        insertion.font.underline = "Single";

        await context.sync();
    });
}

export async function getDocumentText(): Promise<string> {
    return Word.run(async (context) => {
        const body = context.document.body;
        body.load("text");
        await context.sync();
        return body.text;
    });
}

export async function addComment(text: string) {
    await Word.run(async (context) => {
        const range = context.document.getSelection();
        range.insertComment(text);
        await context.sync();
    });
}
export function insertText(text: string) {
    return Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.insertText(text, Word.InsertLocation.replace);
        await context.sync();
    });
}

export async function insertAsTrackedChange(text: string, comment?: string) {
    // 1. Clean Markdown
    const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
        .replace(/\*(.*?)\*/g, '$1')     // Italic
        .replace(/###\s?/g, '')           // Headers
        .replace(/---\s?/g, '')           // Horizontal rules
        .trim();

    return new Promise<void>((resolve, reject) => {
        // Fallback to classic API for robustness against "setValue" errors
        Office.context.document.setSelectedDataAsync(
            cleanText,
            { coercionType: Office.CoercionType.Text },
            (asyncResult) => {
                if (asyncResult.status === Office.AsyncResultStatus.Failed) {
                    console.error("Insertion failed:", asyncResult.error.message);
                    reject(new Error(asyncResult.error.message));
                } else {
                    if (comment) {
                        // Try to add comment using Word.run on the current selection
                        // (We expect the selection to be the newly inserted text or near it)
                        Word.run(async (ctx) => {
                            try {
                                const range = ctx.document.getSelection();
                                range.insertComment(comment);
                                await ctx.sync();
                            } catch (err) {
                                console.warn("Retrying comment insertion failed:", err);
                            }
                        }).catch(e => console.warn("Word.run for comment failed:", e));
                    }
                    resolve();
                }
            }
        );
    });
}

// Exporting Image Handler
export async function insertImage(base64: string) {
    // Strip data URI prefix if present (Office.js expects raw base64)
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, "");

    return new Promise<void>((resolve, reject) => {
        Office.context.document.setSelectedDataAsync(
            cleanBase64,
            { coercionType: Office.CoercionType.Image },
            (asyncResult) => {
                if (asyncResult.status === Office.AsyncResultStatus.Failed) {
                    console.error("Image insertion failed:", asyncResult.error.message);
                    reject(new Error(asyncResult.error.message));
                } else {
                    resolve();
                }
            }
        );
    });
}

import diff from "fast-diff";

// ... existing imports

export async function applySurgicalRedlines(originalText: string, newText: string) {
    // 1. Clean Markdown & Normalize Newlines AND Special Chars
    const normalize = (str: string) => str
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[\u2018\u2019]/g, "'") // Smart Single Quotes
        .replace(/[\u201C\u201D]/g, '"') // Smart Double Quotes
        .replace(/\u2013/g, "-")         // En Dash
        .replace(/\u2014/g, "--")        // Em Dash
        .replace(/\u00A0/g, " ");        // Non-breaking space

    const cleanNewText = normalize(newText)
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/###\s?/g, '')
        .replace(/---\s?/g, '')
        .trim();

    // Normalize original text similarly to ensure diffs match
    const cleanOriginalText = normalize(originalText).trim();

    // 2. Compute Diff
    const diffs = diff(cleanOriginalText, cleanNewText);
    console.log("Surgical Redline Diffs:", JSON.stringify(diffs));

    await Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("text");
        await context.sync();

        let remainingRange = selection;

        for (const [op, text] of diffs) {
            if (!text) continue;

            // Search Options: Ignore insignificant differences to find the "anchor" text
            // ignoreSpace handles extra newlines/spaces. ignorePunct handles smart quotes if normalization missed them.
            const searchOptions = { matchCase: true, matchWildcards: false, ignoreSpace: true, ignorePunct: true };

            if (op === 0) { // EQUAL
                // Find this text in the remaining range
                const searchResults = remainingRange.search(text, searchOptions);
                searchResults.load("items");
                await context.sync();

                if (searchResults.items.length > 0) {
                    const match = searchResults.items[0];
                    // Found the equal text. 
                    // New remaining range starts AFTER this match.
                    remainingRange = match.getRange(Word.RangeLocation.end).expandTo(selection.getRange(Word.RangeLocation.end));
                }
            } else if (op === -1) { // DELETE
                // Find the text to delete
                const searchResults = remainingRange.search(text, { matchCase: true, matchWildcards: false });
                searchResults.load("items");
                await context.sync();

                if (searchResults.items.length > 0) {
                    const match = searchResults.items[0];
                    // We must calculate the NEW remaining range BEFORE deleting,
                    // because deleting collapses the range.
                    // The new start is the End of the match (which becomes the deletion point).
                    // We anchor our remaining range to the end of the match.
                    const newStart = match.getRange(Word.RangeLocation.end);
                    const newRest = newStart.expandTo(selection.getRange(Word.RangeLocation.end));

                    match.delete();
                    // Track Changes marks it deleted.

                    remainingRange = newRest;
                }
            } else if (op === 1) { // INSERT
                // Insert text BEFORE the current remaining range
                // (i.e. at the cursor position defined by where we are)
                const startPoint = remainingRange.getRange(Word.RangeLocation.start);
                startPoint.insertText(text, Word.InsertLocation.before);

                // Insertion doesn't consume existing text.
                // It expands the document but 'remainingRange' (which points to existing text)
                // should technically stay valid and point to "Next text".
                // So no update to remainingRange needed.
            }
        }
        await context.sync();
    });
}
