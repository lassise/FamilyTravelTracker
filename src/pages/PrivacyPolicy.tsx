import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Shield, Lock, Eye, Share2, Server } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
    const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link to="/">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Family Travel Tracker Privacy Policy</CardTitle>
                        <CardDescription>Last Updated: {lastUpdated}</CardDescription>
                    </CardHeader>
                    <CardContent className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                        <section>
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                Introduction
                            </h3>
                            <p>
                                Family Travel Tracker ("we," "our," or "us") is committed to protecting your privacy.
                                This Privacy Policy explains how we collect, use, disclosure, and safeguard your information
                                when you visit our website and use our application.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Eye className="h-5 w-5 text-primary" />
                                Google User Data Access & Collection
                            </h3>
                            <p>
                                Our application accesses Google user data to provide travel tracking features.
                                Specifically, we request access to:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li><strong>Gmail Read-Only Access:</strong> To scan for travel-related emails (flight confirmations, hotel bookings) to automatically build your travel history.</li>
                                <li><strong>Google Profile Information:</strong> To display your name and profile picture within the application.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Server className="h-5 w-5 text-primary" />
                                How We Use Your Data
                            </h3>
                            <p>
                                We use the information we collect from Google APIs solely for the purpose of providing or improving
                                user-facing features. We do <strong>not</strong> use your Google data for:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li>Serving advertisements.</li>
                                <li>Surveillance or re-selling data.</li>
                                <li>Any purpose other than the specific functionality of tracking your family's travel history.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Lock className="h-5 w-5 text-primary" />
                                Data Storage & Security
                            </h3>
                            <p>
                                We implement a variety of security measures to maintain the safety of your personal information.
                                Your data is stored securely using industry-standard encryption protocols. We use Supabase
                                for data storage, which provides robust security features including Row Level Security (RLS)
                                to ensure you are the only one who can access your data.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Share2 className="h-5 w-5 text-primary" />
                                Data Sharing & Disclosure
                            </h3>
                            <p>
                                We do <strong>not</strong> sell, trade, or otherwise transfer your Google user data to outside parties.
                                This does not include website hosting partners and other parties who assist us in operating our website,
                                conducting our business, or serving our users, so long as those parties agree to keep this information confidential.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold">Limited Use Disclosure</h3>
                            <p className="border-l-4 border-primary pl-4 italic">
                                Family Travel Tracker's use and transfer to any other app of information received from Google APIs
                                will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google API Services User Data Policy</a>,
                                including the Limited Use requirements.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold">Contact Us</h3>
                            <p>
                                If you have any questions about this Privacy Policy, please contact us at support@familytraveltracker.com.
                            </p>
                        </section>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
