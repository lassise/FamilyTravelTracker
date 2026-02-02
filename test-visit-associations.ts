/**
 * Test script to verify visit-member associations are correct
 * 
 * Run this in the browser console or as a Node script (with Supabase client)
 * 
 * This script checks:
 * 1. Which members are associated with each country visit
 * 2. If any member shows "traveling since" a year they shouldn't
 * 3. If countries appear in member lists incorrectly
 */

import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase URL and anon key
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  memberName: string;
  memberId: string;
  earliestYear: number | null;
  countriesVisited: string[];
  issues: string[];
}

async function testVisitAssociations() {
  console.log('🔍 Testing visit-member associations...\n');

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ No user logged in');
    return;
  }

  // Fetch all data
  const [membersResult, countriesResult, visitDetailsResult, visitMembersResult] = await Promise.all([
    supabase.from('family_members').select('*').eq('user_id', user.id),
    supabase.from('countries').select('*').eq('user_id', user.id),
    supabase.from('country_visit_details').select('*').eq('user_id', user.id),
    supabase.from('visit_family_members').select('*').eq('user_id', user.id),
  ]);

  const members = membersResult.data || [];
  const countries = countriesResult.data || [];
  const visitDetails = visitDetailsResult.data || [];
  const visitMembers = visitMembersResult.data || [];

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
  const results: TestResult[] = [];

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
    // (This would require a birth_date field - adjust as needed)
    if (earliestYear && earliestYear < 2020) {
      issues.push(`⚠️  Member shows traveling since ${earliestYear} - verify this is correct`);
    }

    // Check for Jamaica specifically (as per the bug report)
    if (countriesVisited.has('Jamaica')) {
      console.log(`📍 ${member.name} is associated with Jamaica`);
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
      memberId: member.id,
      earliestYear,
      countriesVisited: Array.from(countriesVisited),
      issues,
    });
  }

  // Print results
  console.log('\n📊 Test Results:\n');
  results.forEach(result => {
    console.log(`👤 ${result.memberName}:`);
    console.log(`   Earliest Year: ${result.earliestYear || 'None'}`);
    console.log(`   Countries: ${result.countriesVisited.length > 0 ? result.countriesVisited.join(', ') : 'None'}`);
    if (result.issues.length > 0) {
      console.log(`   Issues:`);
      result.issues.forEach(issue => console.log(`     ${issue}`));
    }
    console.log('');
  });

  // Summary
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  if (totalIssues === 0) {
    console.log('✅ No issues found!');
  } else {
    console.log(`⚠️  Found ${totalIssues} potential issue(s)`);
  }
}

// Run if in Node environment
if (typeof window === 'undefined') {
  testVisitAssociations().catch(console.error);
}

export { testVisitAssociations };
