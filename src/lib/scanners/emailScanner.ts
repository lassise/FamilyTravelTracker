
import { ScannedEmail } from "./types";
import { MOCK_EMAILS } from "./mockData";
import { GmailService, GmailMessage } from "../services/gmail";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class EmailScanner {
    // In a real app, this would use Gmail API or similar

    // Helper to extract headers
    private getHeader(msg: GmailMessage, name: string): string {
        return msg.payload?.headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    }

    private parseGmailMessage(msg: GmailMessage): ScannedEmail | null {
        const subject = this.getHeader(msg, 'subject');

        // Basic filtering to ensure it's travel related (redundant if query is good, but safe)
        if (!/flight|booking|confirmation|ticket|reservation/i.test(subject)) {
            return null;
        }

        // Try to find a date
        // Gmail API internalDate is ms timestamp
        const dateStr = new Date(parseInt(msg.internalDate)).toISOString();

        return {
            id: msg.id,
            subject: subject,
            snippet: msg.snippet,
            date: dateStr,
            sender: this.getHeader(msg, 'from'),
            type: 'flight' // simplified, assumption
        };
    }

    async scanEmails(onProgress?: (count: number) => void): Promise<ScannedEmail[]> {
        console.log("Starting email scan...");

        if (GmailService.isAuthenticated()) {
            try {
                // Search for flights and bookings
                // "after:2020/01/01" is a safe default to not go back forever
                const query = 'subject:(flight OR booking OR confirmation OR ticket) after:2020/01/01 -category:promotions';
                const messages = await GmailService.listMessages(query, 15); // Limit to 15 for demo speed

                const results: ScannedEmail[] = [];
                for (let i = 0; i < messages.length; i++) {
                    const parsed = this.parseGmailMessage(messages[i]);
                    if (parsed) {
                        results.push(parsed);
                    }
                    if (onProgress) onProgress(i + 1);
                }

                console.log(`Gmail scan complete. Found ${results.length} relevant emails.`);
                return results;

            } catch (error) {
                console.error("Gmail scan failed, falling back to mock:", error);
                // Fallback to mock if API fails
            }
        }

        // Fallback or Mock mode
        const results: ScannedEmail[] = [];
        const total = MOCK_EMAILS.length;

        for (let i = 0; i < total; i++) {
            await delay(400); // Emails take slightly longer to "fetch" and "parse"
            results.push(MOCK_EMAILS[i]);
            if (onProgress) onProgress(i + 1);
        }

        console.log(`Mock Email scan complete. Found ${results.length} relevant emails.`);
        return results;
    }
}

export const emailScanner = new EmailScanner();
