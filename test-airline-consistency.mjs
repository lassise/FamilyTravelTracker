
// Mock Data
const AIRLINES = [
    { code: "UA", name: "United Airlines", alliance: "Star Alliance" },
    { code: "NH", name: "ANA", alliance: "Star Alliance" },
    { code: "LH", name: "Lufthansa", alliance: "Star Alliance" },
    { code: "AA", name: "American Airlines", alliance: "Oneworld" },
    { code: "JL", name: "Japan Airlines", alliance: "Oneworld" },
    { code: "DL", name: "Delta Air Lines", alliance: "SkyTeam" },
    { code: "AF", name: "Air France", alliance: "SkyTeam" },
    { code: "NK", name: "Spirit Airlines" }, // No alliance
];

const ALLIANCES = ["Star Alliance", "Oneworld", "SkyTeam"];

// Mock Helper functions
const normalizeAirline = (airlineInput) => {
    if (!airlineInput) return { codeNormalized: null, airline: null };

    const upper = airlineInput.toUpperCase().trim();

    // Direct code match
    let airline = AIRLINES.find(a => a.code === upper);

    // Name match if not found
    if (!airline) {
        airline = AIRLINES.find(a => a.name.toUpperCase() === upper || upper.includes(a.name.toUpperCase()));
    }

    return {
        codeNormalized: airline ? airline.code : upper.substring(0, 2), // Fallback
        airline: airline || null
    };
};

// Function under test
const areAirlinesCompatible = (airline1, airline2) => {
    if (!airline1 || !airline2) {
        return { compatible: true, matchType: "different", detail: null };
    }

    // Normalize both airlines
    const norm1 = normalizeAirline(airline1);
    const norm2 = normalizeAirline(airline2);

    // Same airline (by code)
    if (norm1.codeNormalized && norm1.codeNormalized === norm2.codeNormalized) {
        return { compatible: true, matchType: "same", detail: null };
    }

    // Same airline (by name)
    if (norm1.airline?.name && norm1.airline.name === norm2.airline?.name) {
        return { compatible: true, matchType: "same", detail: null };
    }

    // Same alliance
    if (norm1.airline?.alliance && norm1.airline.alliance === norm2.airline?.alliance) {
        return {
            compatible: true,
            matchType: "alliance",
            detail: norm1.airline.alliance
        };
    }

    // Different airlines, no alliance match
    return { compatible: false, matchType: "different", detail: null };
};

// Test Runner
console.log("🧪 Testing Airline Consistency Logic...\n");

const scenarios = [
    { a1: "UA", a2: "UA", expected: "same", desc: "Same Airline (Code)" },
    { a1: "United Airlines", a2: "United Airlines", expected: "same", desc: "Same Airline (Name)" },
    { a1: "UA", a2: "NH", expected: "alliance", desc: "Star Alliance (UA + ANA)" },
    { a1: "United Airlines", a2: "Lufthansa", expected: "alliance", desc: "Star Alliance (United + Lufthansa)" },
    { a1: "AA", a2: "JL", expected: "alliance", desc: "Oneworld (AA + JAL)" },
    { a1: "AA", a2: "DL", expected: "different", desc: "Different Alliances (AA + DL)" },
    { a1: "NK", a2: "UA", expected: "different", desc: "No Alliance vs Alliance" },
    { a1: "NK", a2: "NK", expected: "same", desc: "Same Airline (No Alliance)" },
    { a1: "DL", a2: "AF", expected: "alliance", desc: "SkyTeam (DL + AF)" },
];

let passed = 0;
let failed = 0;

scenarios.forEach(sc => {
    const result = areAirlinesCompatible(sc.a1, sc.a2);
    const isMatch = result.matchType === sc.expected;

    if (isMatch) {
        console.log(`✅ PASS: ${sc.desc} (${sc.a1} + ${sc.a2}) -> ${result.matchType}`);
        passed++;
    } else {
        console.log(`❌ FAIL: ${sc.desc} (${sc.a1} + ${sc.a2})`);
        console.log(`   Expected: ${sc.expected}, Got: ${result.matchType}`);
        failed++;
    }
});

console.log(`\nResults: ${passed} Passed, ${failed} Failed`);

if (failed > 0) process.exit(1);
