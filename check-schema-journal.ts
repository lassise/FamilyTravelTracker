
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking schema for country_visit_details...");

    // Try to insert a dummy row with the columns we want to check
    // We'll immediately delete it or fail. 
    // actually simpler: select * limit 1 and check keys

    const { data, error } = await supabase
        .from("country_visit_details")
        .select("*")
        .limit(1);

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    if (data && data.length > 0) {
        const row = data[0];
        console.log("Columns found:", Object.keys(row));
        console.log("Has 'highlight'?", "highlight" in row);
        console.log("Has 'why_it_mattered'?", "why_it_mattered" in row);
        console.log("Has 'photos'?", "photos" in row);
        console.log("Has 'image_urls'?", "image_urls" in row);
    } else {
        console.log("No rows found, cannot infer columns from 'select *'. Trying inspection by error.");

        // Try to select specific columns, if it errors, they don't exist
        const { error: colError } = await supabase
            .from("country_visit_details")
            .select("highlight, why_it_mattered, photos")
            .limit(1);

        if (colError) {
            console.error("Verification by select failed:", colError.message);
        } else {
            console.log("Select 'highlight, why_it_mattered, photos' succeeded! Columns exist.");
        }
    }
}

checkSchema();
