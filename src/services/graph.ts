export interface SharePointFile {
    id: string;
    name: string;
    webUrl: string;
}

export const graphService = {
    // Mock search for SharePoint files
    searchSharePoint: async (query: string): Promise<SharePointFile[]> => {
        console.log("Searching SharePoint via Graph for:", query);
        await new Promise(resolve => setTimeout(resolve, 800));

        const mockFiles: SharePointFile[] = [
            { id: "1", name: "NDA_Template_v2.docx", webUrl: "https://contoso.sharepoint.com/sites/legal/NDA_Template_v2.docx" },
            { id: "2", name: "Employee_Handbook.docx", webUrl: "https://contoso.sharepoint.com/sites/hr/Employee_Handbook.docx" },
            { id: "3", name: "Office_Travel_Policy.docx", webUrl: "https://contoso.sharepoint.com/sites/admin/Office_Travel_Policy.docx" },
            { id: "4", name: "FNSB_Travel_Policy.docx", webUrl: "https://contoso.sharepoint.com/sites/admin/FNSB_Travel_Policy.docx" }
        ];

        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

        const scoredFiles = mockFiles.map(file => {
            const fileName = file.name.toLowerCase();
            const matchCount = queryWords.reduce((count, word) => {
                return count + (fileName.includes(word) ? 1 : 0);
            }, 0);
            return { file, matchCount };
        });

        // Filter out non-matches and sort by relevance (descending)
        return scoredFiles
            .filter(item => item.matchCount > 0)
            .sort((a, b) => b.matchCount - a.matchCount)
            .map(item => item.file);
    },

    // Mock getting file content
    getFileContent: async (fileId: string): Promise<string> => {
        console.log("Fetching content for file:", fileId);
        await new Promise(resolve => setTimeout(resolve, 800));

        if (fileId === "4") {
            return `
TRAVEL POLICY
GENERAL
The purpose of the Travel Policy is to ensure that employees are properly compensated and covered while engaged in official Borough business away from their normal business site, outside of the Fairbanks North Star Borough. The Borough follows the requirements to maintain an IRS qualified plan, which reduces taxability for the traveler.

PURPOSE
This policy outlines the steps necessary for approving and processing of travel and training.

RESPONSIBILITY
Department directors shall ensure that their department staff follows the procedure set forth in this policy.
Compliance with this policy is the responsibility of all Borough employees.
Human Resources shall maintain this policy.

POLICY
It is the policy of the FNSB Administration to authorize employees to travel on official FNSB business or for training purposes utilizing the most cost effective means available, given all considerations. Personal travel may be combined with a business trip. Travel must be approved in advance by the appropriate authority and processed in accordance with the travel procedures. Should special circumstances not allow pre-approval, the same process shall be followed upon return. A Travel Authorization (TA) must be completed for any travel outside of the Fairbanks North Star Borough. Appropriate authority must include a recommendation from the department director and approval by the Mayor or Chief of Staff, except for Assembly or Borough Clerk’s office travel, short notice travel required by the Borough Attorney’s office, or other emergency travel as authorized by the Borough Mayor.

Should the IRS or grant regulations require additional information than is expressed in this policy, the Borough and travelling employee is required to comply.

PROCEDURE
Extraordinary circumstances requiring variations from these travel procedures may be approved by the Mayor and/or his/her designee and should be justified in writing.
            `;
        }

        if (fileId === "3") { // Office Travel Policy
            return `
            Office Travel Policy
            1. Purpose: Ensure consistency and safety in employee travel.
            2. Authorization: All travel must be pre-approved.
            3. Guidelines:
               - Air Travel: Economy class for flights under 6 hours. Business class for over 6 hours.
               - Accommodation: Cap of $250/night.
               - Meals: Per diem of $75/day.
            4. Expense Reimbursement: Submit reports within 30 days. Receipts required.
            5. Non-Reimbursable: Personal entertainment, alcohol, fines.
            `;
        }

        return "This is the content of the document from SharePoint. [Mock Data]. It contains standard clauses.";
    }
};
