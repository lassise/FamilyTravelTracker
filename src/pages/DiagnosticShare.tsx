import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Copy, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TestResult {
  name: string;
  status: "pending" | "pass" | "fail" | "warning";
  message: string;
  details?: unknown;
}

const TEST_TOKEN = "9665cf215dcdde8f21131e2a23d46281";

export default function DiagnosticShare() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [fullReport, setFullReport] = useState<object | null>(null);

  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests((prev) => {
      const newTests = [...prev];
      newTests[index] = { ...newTests[index], ...update };
      return newTests;
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setSummary(null);
    
    const initialTests: TestResult[] = [
      { name: "Auth State Check", status: "pending", message: "Checking current authentication..." },
      { name: "share_links Table Structure", status: "pending", message: "Checking table schema..." },
      { name: "Token in share_links", status: "pending", message: "Looking for token in share_links..." },
      { name: "share_profiles Table Structure", status: "pending", message: "Checking table schema..." },
      { name: "Token in share_profiles", status: "pending", message: "Looking for token in share_profiles..." },
      { name: "Anonymous RLS Check (share_links)", status: "pending", message: "Testing anonymous access..." },
      { name: "Anonymous RLS Check (share_profiles)", status: "pending", message: "Testing anonymous access..." },
      { name: "Edge Function Test", status: "pending", message: "Testing get-public-dashboard function..." },
    ];
    setTests(initialTests);

    const report: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      testToken: TEST_TOKEN,
      tests: {},
    };

    // Test 1: Auth State
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const isAnon = !session;
      report.tests = { ...report.tests as object, authState: { session: session ? "logged_in" : "anonymous", userId: session?.user?.id } };
      updateTest(0, {
        status: isAnon ? "warning" : "pass",
        message: isAnon 
          ? "Not logged in (anonymous) - this simulates incognito mode" 
          : `Logged in as ${session?.user?.email}`,
        details: { userId: session?.user?.id, email: session?.user?.email }
      });
    } catch (e: any) {
      updateTest(0, { status: "fail", message: `Error: ${e.message}`, details: e });
      report.tests = { ...report.tests as object, authState: { error: e.message } };
    }

    // Test 2: share_links table structure
    try {
      // Query the table to see what columns exist
      const { data, error } = await supabase
        .from("share_links")
        .select("*")
        .limit(1);
      
      if (error) {
        if (error.message.includes("does not exist")) {
          updateTest(1, { status: "fail", message: "Table share_links does NOT exist", details: error });
          report.tests = { ...report.tests as object, shareLinksStructure: { exists: false, error: error.message } };
        } else {
          updateTest(1, { status: "warning", message: `Query error: ${error.message}`, details: error });
          report.tests = { ...report.tests as object, shareLinksStructure: { exists: "unknown", error: error.message } };
        }
      } else {
        const columns = data && data.length > 0 ? Object.keys(data[0]) : ["Table exists but empty"];
        updateTest(1, { 
          status: "pass", 
          message: `Table exists with columns: ${columns.join(", ")}`,
          details: { columns, sampleRow: data?.[0] }
        });
        report.tests = { ...report.tests as object, shareLinksStructure: { exists: true, columns, sampleRow: data?.[0] } };
      }
    } catch (e: any) {
      updateTest(1, { status: "fail", message: `Error: ${e.message}`, details: e });
      report.tests = { ...report.tests as object, shareLinksStructure: { error: e.message } };
    }

    // Test 3: Token in share_links
    try {
      const { data, error } = await supabase
        .from("share_links")
        .select("*")
        .eq("token", TEST_TOKEN)
        .maybeSingle();
      
      if (error) {
        updateTest(2, { status: "fail", message: `Query error: ${error.message}`, details: error });
        report.tests = { ...report.tests as object, tokenInShareLinks: { found: false, error: error.message } };
      } else if (data) {
        updateTest(2, { 
          status: "pass", 
          message: `✅ TOKEN FOUND in share_links! owner_user_id: ${data.owner_user_id}`,
          details: data
        });
        report.tests = { ...report.tests as object, tokenInShareLinks: { found: true, data } };
      } else {
        updateTest(2, { 
          status: "fail", 
          message: "❌ Token NOT found in share_links table",
          details: { searched: TEST_TOKEN }
        });
        report.tests = { ...report.tests as object, tokenInShareLinks: { found: false, searched: TEST_TOKEN } };
      }
    } catch (e: any) {
      updateTest(2, { status: "fail", message: `Error: ${e.message}`, details: e });
      report.tests = { ...report.tests as object, tokenInShareLinks: { error: e.message } };
    }

    // Test 4: share_profiles table structure
    try {
      const { data, error } = await supabase
        .from("share_profiles")
        .select("*")
        .limit(1);
      
      if (error) {
        if (error.message.includes("does not exist")) {
          updateTest(3, { status: "fail", message: "Table share_profiles does NOT exist", details: error });
          report.tests = { ...report.tests as object, shareProfilesStructure: { exists: false, error: error.message } };
        } else {
          updateTest(3, { status: "warning", message: `Query error: ${error.message}`, details: error });
          report.tests = { ...report.tests as object, shareProfilesStructure: { exists: "unknown", error: error.message } };
        }
      } else {
        const columns = data && data.length > 0 ? Object.keys(data[0]) : ["Table exists but empty"];
        updateTest(3, { 
          status: "pass", 
          message: `Table exists with columns: ${columns.join(", ")}`,
          details: { columns, sampleRow: data?.[0] }
        });
        report.tests = { ...report.tests as object, shareProfilesStructure: { exists: true, columns } };
      }
    } catch (e: any) {
      updateTest(3, { status: "fail", message: `Error: ${e.message}`, details: e });
      report.tests = { ...report.tests as object, shareProfilesStructure: { error: e.message } };
    }

    // Test 5: Token in share_profiles
    try {
      const { data, error } = await supabase
        .from("share_profiles")
        .select("*")
        .eq("dashboard_share_token", TEST_TOKEN)
        .maybeSingle();
      
      if (error) {
        updateTest(4, { status: "fail", message: `Query error: ${error.message}`, details: error });
        report.tests = { ...report.tests as object, tokenInShareProfiles: { found: false, error: error.message } };
      } else if (data) {
        const isPublic = data.is_public;
        updateTest(4, { 
          status: isPublic ? "pass" : "warning", 
          message: isPublic 
            ? `✅ TOKEN FOUND in share_profiles! user_id: ${data.user_id}, is_public: true`
            : `⚠️ Token found but is_public=${data.is_public}`,
          details: data
        });
        report.tests = { ...report.tests as object, tokenInShareProfiles: { found: true, isPublic, data } };
      } else {
        updateTest(4, { 
          status: "warning", 
          message: "Token NOT found in share_profiles (this may be OK if it's in share_links)",
          details: { searched: TEST_TOKEN }
        });
        report.tests = { ...report.tests as object, tokenInShareProfiles: { found: false, searched: TEST_TOKEN } };
      }
    } catch (e: any) {
      updateTest(4, { status: "fail", message: `Error: ${e.message}`, details: e });
      report.tests = { ...report.tests as object, tokenInShareProfiles: { error: e.message } };
    }

    // Test 6: Anonymous RLS check (share_links)
    // Sign out temporarily to test anonymous access
    try {
      // Create a separate anon client to test
      const anonResult = await supabase
        .from("share_links")
        .select("token")
        .eq("token", TEST_TOKEN)
        .maybeSingle();
      
      if (anonResult.error) {
        if (anonResult.error.message.includes("permission denied") || 
            anonResult.error.code === "42501" ||
            anonResult.error.message.includes("RLS")) {
          updateTest(5, { 
            status: "fail", 
            message: "❌ RLS blocks anonymous access to share_links",
            details: anonResult.error
          });
          report.tests = { ...report.tests as object, anonRLSShareLinks: { blocked: true, error: anonResult.error.message } };
        } else {
          updateTest(5, { 
            status: "warning", 
            message: `Query error: ${anonResult.error.message}`,
            details: anonResult.error
          });
          report.tests = { ...report.tests as object, anonRLSShareLinks: { error: anonResult.error.message } };
        }
      } else if (anonResult.data) {
        updateTest(5, { 
          status: "pass", 
          message: "✅ Anonymous can read from share_links (RLS allows)",
          details: { found: true }
        });
        report.tests = { ...report.tests as object, anonRLSShareLinks: { allowed: true } };
      } else {
        updateTest(5, { 
          status: "warning", 
          message: "Query returned null - token not found or RLS blocking",
          details: { found: false }
        });
        report.tests = { ...report.tests as object, anonRLSShareLinks: { allowed: "unknown", found: false } };
      }
    } catch (e: any) {
      updateTest(5, { status: "fail", message: `Error: ${e.message}`, details: e });
      report.tests = { ...report.tests as object, anonRLSShareLinks: { error: e.message } };
    }

    // Test 7: Anonymous RLS check (share_profiles)
    try {
      const result = await supabase
        .from("share_profiles")
        .select("dashboard_share_token, is_public")
        .eq("dashboard_share_token", TEST_TOKEN)
        .eq("is_public", true)
        .maybeSingle();
      
      if (result.error) {
        if (result.error.message.includes("permission denied") || 
            result.error.code === "42501") {
          updateTest(6, { 
            status: "fail", 
            message: "❌ RLS blocks access to share_profiles",
            details: result.error
          });
          report.tests = { ...report.tests as object, anonRLSShareProfiles: { blocked: true, error: result.error.message } };
        } else {
          updateTest(6, { 
            status: "warning", 
            message: `Query error: ${result.error.message}`,
            details: result.error
          });
          report.tests = { ...report.tests as object, anonRLSShareProfiles: { error: result.error.message } };
        }
      } else {
        updateTest(6, { 
          status: result.data ? "pass" : "warning", 
          message: result.data 
            ? "✅ Can read from share_profiles" 
            : "Query returned null - token not found",
          details: result.data
        });
        report.tests = { ...report.tests as object, anonRLSShareProfiles: { allowed: true, found: !!result.data } };
      }
    } catch (e: any) {
      updateTest(6, { status: "fail", message: `Error: ${e.message}`, details: e });
      report.tests = { ...report.tests as object, anonRLSShareProfiles: { error: e.message } };
    }

    // Test 8: Edge Function
    try {
      const { data, error } = await supabase.functions.invoke("get-public-dashboard", {
        body: { token: TEST_TOKEN },
      });
      
      if (error) {
        updateTest(7, { 
          status: "fail", 
          message: `Edge function error: ${error.message}`,
          details: error
        });
        report.tests = { ...report.tests as object, edgeFunction: { success: false, error: error.message } };
      } else if (data?.ok) {
        updateTest(7, { 
          status: "pass", 
          message: `✅ Edge function works! Found ${data.data?.stats?.visitedCountriesCount || 0} countries`,
          details: data
        });
        report.tests = { ...report.tests as object, edgeFunction: { success: true, data } };
      } else {
        updateTest(7, { 
          status: "fail", 
          message: `Edge function returned error: ${data?.error || "Unknown"}`,
          details: data
        });
        report.tests = { ...report.tests as object, edgeFunction: { success: false, response: data } };
      }
    } catch (e: any) {
      updateTest(7, { status: "fail", message: `Error: ${e.message}`, details: e });
      report.tests = { ...report.tests as object, edgeFunction: { error: e.message } };
    }

    // Generate summary
    const failedTests = tests.filter(t => t.status === "fail").map(t => t.name);
    const testsRef = document.querySelectorAll('[data-test-status]');
    let problems: string[] = [];

    setFullReport(report);

    // Wait for state to update
    setTimeout(() => {
      setTests(prev => {
        const failed = prev.filter(t => t.status === "fail");
        const warnings = prev.filter(t => t.status === "warning");
        
        if (failed.length === 0 && warnings.length === 0) {
          setSummary("✅ All tests passed! The share link should work.");
        } else if (failed.some(t => t.name.includes("Token in share_links") && t.status === "fail") && 
                   failed.some(t => t.name.includes("Token in share_profiles") || prev.find(p => p.name.includes("Token in share_profiles"))?.status === "warning")) {
          setSummary("🔴 The problem is: TOKEN NOT IN DATABASE. The share token was never saved. Need to fix the share link creation code.");
        } else if (failed.some(t => t.name.includes("RLS"))) {
          setSummary("🔴 The problem is: RLS BLOCKING ANONYMOUS ACCESS. Need to add RLS policy for anonymous SELECT.");
        } else if (failed.some(t => t.name.includes("Edge Function"))) {
          setSummary("🔴 The problem is: EDGE FUNCTION FAILING. Check the edge function logs for details.");
        } else if (failed.some(t => t.name.includes("Table"))) {
          setSummary("🔴 The problem is: TABLE STRUCTURE ISSUE. Some tables are missing or have wrong schema.");
        } else {
          setSummary(`⚠️ Some tests have issues: ${[...failed.map(t => t.name), ...warnings.map(t => t.name)].join(", ")}`);
        }
        return prev;
      });
    }, 100);

    setIsRunning(false);
  };

  const copyReport = () => {
    const reportText = JSON.stringify({
      ...fullReport,
      testResults: tests.map(t => ({ name: t.name, status: t.status, message: t.message, details: t.details })),
      summary
    }, null, 2);
    navigator.clipboard.writeText(reportText);
    toast.success("Report copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-2">Share Link Diagnostic</h1>
        <p className="text-muted-foreground mb-4">
          Testing token: <code className="bg-muted px-2 py-1 rounded text-sm">{TEST_TOKEN}</code>
        </p>

        <div className="flex gap-2 mb-6">
          <Button onClick={runDiagnostics} disabled={isRunning}>
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              "Run Diagnostics"
            )}
          </Button>
          {fullReport && (
            <Button variant="outline" onClick={copyReport}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Report
            </Button>
          )}
        </div>

        {summary && (
          <div className={`p-4 rounded-lg mb-6 border-2 ${
            summary.includes("✅") ? "bg-green-500/10 border-green-500 text-green-700 dark:text-green-400" :
            summary.includes("🔴") ? "bg-red-500/10 border-red-500 text-red-700 dark:text-red-400" :
            "bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-400"
          }`}>
            <p className="font-semibold text-lg">{summary}</p>
          </div>
        )}

        <div className="space-y-3">
          {tests.map((test, index) => (
            <div 
              key={test.name}
              data-test-status={test.status}
              className={`p-4 rounded-lg border ${
                test.status === "pass" ? "bg-green-500/10 border-green-500/50" :
                test.status === "fail" ? "bg-red-500/10 border-red-500/50" :
                test.status === "warning" ? "bg-yellow-500/10 border-yellow-500/50" :
                "bg-muted border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {test.status === "pass" && <Check className="h-5 w-5 text-green-500" />}
                  {test.status === "fail" && <X className="h-5 w-5 text-red-500" />}
                  {test.status === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                  {test.status === "pending" && <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{test.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{test.message}</p>
                  {test.details && test.status !== "pending" && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        Show details
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-48">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {tests.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Click "Run Diagnostics" to start testing the share link
          </div>
        )}

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h2 className="font-semibold mb-2">What this page tests:</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Auth State:</strong> Whether you're logged in or anonymous</li>
            <li>• <strong>Table Structure:</strong> If share_links and share_profiles tables exist and their columns</li>
            <li>• <strong>Token Lookup:</strong> Whether the specific token exists in the database</li>
            <li>• <strong>RLS Policies:</strong> If anonymous users can read from the tables</li>
            <li>• <strong>Edge Function:</strong> If the get-public-dashboard function works</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
