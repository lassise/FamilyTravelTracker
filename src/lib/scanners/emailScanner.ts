
import { ScannedEmail } from "./types";
import { MOCK_EMAILS } from "./mockData";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class EmailScanner {
    // In a real app, this would use Gmail API or similar

    async scanEmails(onProgress?: (count: number) => void): Promise<ScannedEmail[]> {
        const results: ScannedEmail[] = [];
        const total = MOCK_EMAILS.length;

        for (let i = 0; i < total; i++) {
            await delay(400); // Emails take slightly longer to "fetch" and "parse"
            results.push(MOCK_EMAILS[i]);
            if (onProgress) onProgress(i + 1);
        }

        return results;
    }
}

export const emailScanner = new EmailScanner();
