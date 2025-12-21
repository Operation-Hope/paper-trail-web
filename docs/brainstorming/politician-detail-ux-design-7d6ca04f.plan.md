<!-- 7d6ca04f-a695-46c0-a9c5-33761836e689 4ab4c8d7-4201-4bd5-b8b6-456ead263457 -->
# Politician Detail View - UX Design Ideas

## 1. Voting Record Filtering Enhancements

### 1.1 Live Search / Typeahead for Bills

**Replace** the current "Bill Subjects" dropdown with a **search input** that auto-filters as the user types.

```
┌─────────────────────────────────────────────────────────┐
│  🔍 Search bills...                              [×]    │
│  ─────────────────────────────────────────────────────  │
│  Searching bill titles, subjects, and bill numbers     │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**

- Filters across bill title, subjects, AND bill number
- Debounced input (300ms delay before filtering)
- Shows match count: "Showing 47 of 1,348 votes"
- Clear button (×) to reset
- Keep checkboxes for Bill Type (HR, S, HJRes, SJRes) - they work well

### 1.2 Date Range Filter

Add a date range picker to filter votes by time period.

```
┌──────────────────────────────────────────────────────────┐
│  Date Range                                              │
│  ┌─────────────┐  to  ┌─────────────┐                   │
│  │ Jan 2020    │      │ Dec 2024    │    [This Congress]│
│  └─────────────┘      └─────────────┘    [Last 2 Years] │
└──────────────────────────────────────────────────────────┘
```

**Quick presets:** This Congress | Last 2 Years | Last 5 Years | All Time

### 1.3 Vote Outcome Filter (bonus)

Simple toggle chips to filter by how they voted:

```
┌──────────────────────────────────────────────────────────┐
│  Vote: [Yea ✓] [Nay ✓] [Abstain] [Not Voting]           │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Donation Filtering Enhancements

### 2.1 Donation Amount Range Slider

Add a range slider to filter donations by amount.

```
┌──────────────────────────────────────────────────────────┐
│  Donation Amount                                         │
│  $0 ├────────●════════════●────────┤ $10,000+           │
│              $500         $5,000                         │
│                                                          │
│  [Under $200] [Small $200-$999] [Large $1000+] [All]    │
└──────────────────────────────────────────────────────────┘
```

**Quick presets:** Small donors (<$200) | Medium ($200-$999) | Large ($1,000+)

### 2.2 Date Range for Donations

Mirror the voting date filter for donations:

- Filter by election cycle (2024, 2022, 2020...)
- Custom date range

---

## 3. Donation-Vote Correlation Feature

### 3.1 Industry-to-Subject Matching

The key insight: **Connect donation industries to bill subjects**

**Mapping examples:**

- Healthcare donations → Healthcare, Medicare, Medicaid bills
- Finance donations → Banking, Securities, Financial Services bills
- Energy donations → Energy, Environment, Climate bills
- Defense donations → Armed Forces, Veterans, National Security bills

### 3.2 UI Concept: "Follow the Money" Panel

```
┌──────────────────────────────────────────────────────────┐
│  💰 Follow the Money                            [?]      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Healthcare Industry: $6.3M received                     │
│  ├─ 127 votes on healthcare-related bills               │
│  ├─ 89% voted Yea on industry-favorable bills           │
│  └─ [View Healthcare Votes →]                           │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  Finance Industry: $1.5M received                        │
│  ├─ 43 votes on finance-related bills                   │
│  ├─ 72% voted Yea on industry-favorable bills           │
│  └─ [View Finance Votes →]                              │
│                                                          │
│  ─────────────────────────────────────────────────────   │
│                                                          │
│  [Show All Industries ▼]                                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 3.3 Interactive Cross-Filtering

When user clicks an industry in the donation chart:

1. Highlight that industry's donations
2. **Auto-filter the voting table** to show only bills related to that industry
3. Show a banner: "Showing 127 votes related to Healthcare industry"
```
┌──────────────────────────────────────────────────────────┐
│  ⚡ Filtered: Showing votes related to Healthcare        │
│     $6.3M received from this industry    [Clear Filter] │
└──────────────────────────────────────────────────────────┘
```


### 3.4 Visual Connection (Advanced)

Draw a subtle visual line/connection between the donation chart segment and the filtered votes table when an industry is selected.

---

## 4. Revised Filter Panel Layout

Combining all the above, the new Voting Record filter panel:

```
┌──────────────────────────────────────────────────────────┐
│  🔍 Search bills, subjects, or numbers...        [×]    │
├──────────────────────────────────────────────────────────┤
│  Bill Type:  ☑ House (HR)  ☑ Senate (S)                 │
│              ☐ HJRes       ☐ SJRes                       │
├──────────────────────────────────────────────────────────┤
│  Date Range: [Jan 2020 ▼] to [Dec 2024 ▼]               │
│              [This Congress] [Last 2 Yrs] [All Time]    │
├──────────────────────────────────────────────────────────┤
│  Vote:  [Yea ✓] [Nay ✓] [Abstain] [Not Voting]          │
├──────────────────────────────────────────────────────────┤
│  Sort: [Newest First ▼]           [Clear All Filters]   │
└──────────────────────────────────────────────────────────┘

Showing 47 of 1,348 votes
```

---

## 5. Data Requirements

For the correlation feature to work, we need:

1. **Industry-to-Subject mapping table** - maps donation industries (Healthcare, Finance, etc.) to bill subjects (Medicare, Banking, etc.)

2. **Subject normalization** - bill subjects from CongressGov need to map to our industry categories

3. **API support** for:

   - Filtering votes by date range
   - Filtering votes by subject keywords
   - Cross-referencing donations with vote subjects

---

## Summary of Changes

| Feature | Complexity | Value |

|---------|------------|-------|

| Live search for bills | Low | High |

| Date range filter | Low | Medium |

| Vote outcome filter | Low | Medium |

| Donation amount filter | Low | Medium |

| Industry-vote correlation | Medium | Very High |

| Cross-filter interaction | Medium | High |