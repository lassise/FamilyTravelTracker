import { Link } from "react-router-dom";

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-border bg-background py-6 mt-auto">
            <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                <p>&copy; {currentYear} Family Travel Tracker. All rights reserved.</p>
                <div className="flex items-center gap-6">
                    <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
                        Privacy Policy
                    </Link>
                    <Link to="/terms-of-service" className="hover:text-foreground transition-colors">
                        Terms of Service
                    </Link>
                    <a href="mailto:support@familytraveltracker.com" className="hover:text-foreground transition-colors">
                        Contact Support
                    </a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
