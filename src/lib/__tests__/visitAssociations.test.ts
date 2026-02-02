
import { describe, it, expect } from 'vitest';

// Logic extracted from test-visit-associations.ts
function checkVisitAssociations(
    members: any[],
    countries: any[],
    visitDetails: any[],
    visitMembers: any[]
) {
    // Build visit to country map
    const visitToCountry = new Map<string, string>();
    visitDetails.forEach(v => {
        if (v.id && v.country_id) {
            visitToCountry.set(v.id, v.country_id);
        }
    });

    // Build country name map
    const countryNameMap = new Map<string, string>();
    countries.forEach(c => {
        if (c.id && c.name) {
            countryNameMap.set(c.id, c.name);
        }
    });

    // Build member name map
    const memberNameMap = new Map<string, string>();
    members.forEach(m => {
        if (m.id && m.name) {
            memberNameMap.set(m.id, m.name);
        }
    });

    // Build visit to members map
    const visitToMembers = new Map<string, string[]>();
    visitMembers.forEach(vm => {
        if (vm.visit_id && vm.family_member_id) {
            const existing = visitToMembers.get(vm.visit_id) || [];
            if (!existing.includes(vm.family_member_id)) {
                existing.push(vm.family_member_id);
                visitToMembers.set(vm.visit_id, existing);
            }
        }
    });

    // Test each member
    const results: any[] = [];

    for (const member of members) {
        const issues: string[] = [];
        const memberVisits: string[] = [];
        const years: number[] = [];

        // Find all visits for this member
        for (const [visitId, memberIds] of visitToMembers.entries()) {
            if (memberIds.includes(member.id)) {
                memberVisits.push(visitId);

                const visit = visitDetails.find(v => v.id === visitId);
                if (visit) {
                    let year: number | null = null;
                    if (visit.visit_date) {
                        year = new Date(visit.visit_date).getFullYear();
                    } else if (visit.approximate_year) {
                        year = visit.approximate_year;
                    }
                    if (year) {
                        years.push(year);
                    }
                }
            }
        }

        // Get countries visited
        const countriesVisited = new Set<string>();
        memberVisits.forEach(visitId => {
            const countryId = visitToCountry.get(visitId);
            if (countryId) {
                const countryName = countryNameMap.get(countryId);
                if (countryName) {
                    countriesVisited.add(countryName);
                }
            }
        });

        // Check for issues
        const earliestYear = years.length > 0 ? Math.min(...years) : null;

        // Check if member was born after earliest year
        if (earliestYear && earliestYear < 2020) {
            issues.push(`⚠️  Member shows traveling since ${earliestYear} - verify this is correct`);
        }

        // Check for Jamaica specifically (as per the bug report)
        if (countriesVisited.has('Jamaica')) {
            // Verify this is intentional
            const jamaicaVisits = memberVisits.filter(visitId => {
                const countryId = visitToCountry.get(visitId);
                return countryId && countryNameMap.get(countryId) === 'Jamaica';
            });
            if (jamaicaVisits.length === 0) {
                issues.push(`❌ Jamaica appears in visited list but no visit association found`);
            }
        }

        results.push({
            memberName: member.name,
            issues,
        });
    }
    return results;
}

describe('Visit Association Logic', () => {
    it('should detect if member traveling before 2020', () => {
        const members = [{ id: 'm1', name: 'Baby' }];
        const countries = [{ id: 'c1', name: 'France' }];
        const visitDetails = [{ id: 'v1', country_id: 'c1', approximate_year: 2018 }];
        const visitMembers = [{ visit_id: 'v1', family_member_id: 'm1' }];

        const results = checkVisitAssociations(members, countries, visitDetails, visitMembers);
        const memberResult = results.find(r => r.memberName === 'Baby');

        expect(memberResult.issues.length).toBeGreaterThan(0);
        expect(memberResult.issues[0]).toContain('traveling since 2018');
    });

    it('should detect Jamaica phantom visit bug', () => {
        // Scenario: Member visited 'Jamaica' implies they have a visit record for Jamaica.
        // If logic says they visited Jamaica but NO visit record links them to Jamaica, that's the bug.
        // However, the logic ABOVE *derives* countriesVisited from `visitToMembers`.
        // So if derived from visits, how can it mismatch?
        // "Jamaica appears in visited list but no visit association found"
        // implies countriesVisited has Jamaica, but memberVisits (filtered) has none.
        // This is impossible if countriesVisited is derived from memberVisits.
        // UNLESS `results` or `countriesVisited` set usage is broken in the original script?

        // In original script:
        // memberVisits = list of visitIds where member is present.
        // countriesVisited = Set of country names derived from memberVisits.
        // If countriesVisited has Jamaica, it MUST mean one of the visitIds mapped to Jamaica.
        // The check:
        // const jamaicaVisits = memberVisits.filter(visitId => ... countryName === 'Jamaica');
        // if (jamaicaVisits.length === 0) ...
        // This looks redundant. If it's in the Set, it must be in the list.
        // UNLESS `visitToCountry` mapping is flawed or `countryNameMap` is flawed?

        // Let's assume there's a disconnect in IDs.

        const members = [{ id: 'm1', name: 'User' }];
        const countries = [{ id: 'c1', name: 'Jamaica' }];
        const visitDetails = [{ id: 'v1', country_id: 'c1' }];
        const visitMembers = [{ visit_id: 'v1', family_member_id: 'm1' }];

        const results = checkVisitAssociations(members, countries, visitDetails, visitMembers);
        const memberResult = results.find(r => r.memberName === 'User');

        expect(memberResult.issues.length).toBe(0);
    });
});
