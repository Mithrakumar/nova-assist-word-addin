export interface RegulatoryRecord {
    id: string;
    title: string;
    type: 'FDA_510K' | 'MAUDE_EVENT' | 'Guidance';
    summary: string;
    sourceUrl: string;
    date: string;
}

export const regulatoryService = {
    // Mock search for FDA 510(k) clearances
    searchFDA: async (query: string): Promise<RegulatoryRecord[]> => {
        console.log("Searching FDA 510(k) database for:", query);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API latency

        const mockRecords: RegulatoryRecord[] = [
            {
                id: "K203456",
                title: "CardioLife Advanced Pacemaker System",
                type: "FDA_510K",
                summary: "Device is indicated for use in patients with bradycardia. Substantially equivalent to Predicate Device K190001.",
                sourceUrl: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K203456",
                date: "2023-11-15"
            },
            {
                id: "K210987",
                title: "NeuroStim VNS Therapy System",
                type: "FDA_510K",
                summary: "Vagus Nerve Stimulator for epilepsy. Class III device. Validated for MRI safety under specific conditions.",
                sourceUrl: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K210987",
                date: "2024-01-20"
            },
            {
                id: "K195555",
                title: "OrthoFix Bone Cement Mixer",
                type: "FDA_510K",
                summary: "Vacuum mixing system for bone cement. Indicated for use in arthroplasty procedures.",
                sourceUrl: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K195555",
                date: "2022-06-10"
            }
        ];

        // Simple mock filtering
        return mockRecords.filter(r =>
            r.title.toLowerCase().includes(query.toLowerCase()) ||
            r.summary.toLowerCase().includes(query.toLowerCase())
        );
    },

    // Mock search for MAUDE (Manufacturer and User Facility Device Experience)
    searchMAUDE: async (query: string): Promise<RegulatoryRecord[]> => {
        console.log("Searching MAUDE database for:", query);
        await new Promise(resolve => setTimeout(resolve, 800));

        const mockEvents: RegulatoryRecord[] = [
            {
                id: "MDR-2024-001",
                title: "Pacemaker Lead Fracture Event",
                type: "MAUDE_EVENT",
                summary: "Patient reported dizziness. Imaging revealed fracture in RV lead. Lead replaced successfully. No permanent injury.",
                sourceUrl: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/detail.cfm?mdrfozi=2024001",
                date: "2024-02-01"
            },
            {
                id: "MDR-2023-999",
                title: "Bone Cement Exothermic Reaction",
                type: "MAUDE_EVENT",
                summary: "During mixing, cement became excessively hot, causing minor burns to surgeon's glove. Product lot isolated.",
                sourceUrl: "https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfmaude/detail.cfm?mdrfozi=2023999",
                date: "2023-12-12"
            }
        ];

        return mockEvents.filter(r =>
            r.title.toLowerCase().includes(query.toLowerCase()) ||
            r.summary.toLowerCase().includes(query.toLowerCase())
        );
    }
};
