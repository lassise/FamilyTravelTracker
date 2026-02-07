
import { googleLogout } from '@react-oauth/google';

export interface GmailMessage {
    id: string;
    threadId: string;
    snippet: string;
    internalDate: string;
    payload?: {
        headers: Array<{ name: string; value: string }>;
        body?: { data: string };
        parts?: Array<{ body?: { data: string }; mimeType: string }>;
    };
}

export class GmailService {
    private static accessToken: string | null = null;

    static setAccessToken(token: string) {
        this.accessToken = token;
    }

    static getAccessToken() {
        return this.accessToken;
    }

    static isAuthenticated() {
        return !!this.accessToken;
    }

    static logout() {
        googleLogout();
        this.accessToken = null;
    }

    static async listMessages(query: string, maxResults: number = 20): Promise<GmailMessage[]> {
        if (!this.accessToken) throw new Error('Not authenticated');

        try {
            const response = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Gmail API error: ${response.statusText}`);
            }

            const data = await response.json();
            const messages = data.messages || [];

            // Fetch details for each message
            const detailedMessages = await Promise.all(
                messages.map((msg: { id: string }) => this.getMessage(msg.id))
            );

            return detailedMessages;
        } catch (error) {
            console.error('Error listing messages:', error);
            throw error;
        }
    }

    static async getMessage(id: string): Promise<GmailMessage> {
        if (!this.accessToken) throw new Error('Not authenticated');

        const response = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Gmail API error: ${response.statusText}`);
        }

        return await response.json();
    }
}
