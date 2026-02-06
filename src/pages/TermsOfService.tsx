import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ScrollText, Scale, AlertTriangle, ShieldCheck, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const TermsOfService = () => {
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
                    <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Family Travel Tracker Terms of Service</CardTitle>
                        <CardDescription>Last Updated: {lastUpdated}</CardDescription>
                    </CardHeader>
                    <CardContent className="prose prose-slate dark:prose-invert max-w-none space-y-6">
                        <section>
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <ScrollText className="h-5 w-5 text-primary" />
                                Agreement to Terms
                            </h3>
                            <p>
                                By accessing or using Family Travel Tracker, you agree to be bound by these Terms of Service
                                and our Privacy Policy. If you disagree with any part of the terms, then you may not access the service.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Scale className="h-5 w-5 text-primary" />
                                Use of Service
                            </h3>
                            <p>
                                Family Travel Tracker provides a platform for users to meaningful visualize and track their collection of travel memories.
                                You are responsible for:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                                <li>Maintaining the confidentiality of your account and password.</li>
                                <li>Restricting access to your computer and devices.</li>
                                <li>All activities that occur under your account or password.</li>
                            </ul>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                Intellectual Property
                            </h3>
                            <p>
                                The Service and its original content, features, and functionality are and will remain the exclusive
                                property of Family Travel Tracker and its licensors. The Service is protected by copyright, trademark,
                                and other laws of both the United States and foreign countries.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-primary" />
                                Limitation of Liability
                            </h3>
                            <p>
                                In no event shall Family Travel Tracker, nor its directors, employees, partners, agents, suppliers, or affiliates,
                                be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation,
                                loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of
                                or inability to access or use the Service.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold">Termination</h3>
                            <p>
                                We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever,
                                including without limitation if you breach the Terms. All provisions of the Terms which by their nature should survive
                                termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers,
                                indemnity and limitations of liability.
                            </p>
                        </section>

                        <section>
                            <h3 className="text-xl font-semibold flex items-center gap-2">
                                <Mail className="h-5 w-5 text-primary" />
                                Contact Us
                            </h3>
                            <p>
                                If you have any questions about these Terms, please contact us at support@familytraveltracker.com.
                            </p>
                        </section>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TermsOfService;
