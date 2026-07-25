#!/usr/bin/env python3
"""Sync primary-source data to the Hugging Face dataset repo the site reads from.

Downloads FEC bulk data (committee/PAC contributions to candidates for the
active election cycle) and VoteView roll-call data, converts both to Parquet
with the column names the frontend's SQL expects (see src/services/api.ts),
and uploads the result to a Hugging Face dataset repo.

Runs daily via .github/workflows/data-sync.yml. The FEC refreshes its bulk
files nightly, so the site stays current with the official reporting timeline.

Usage:
  python scripts/data_sync.py [--cycle 2026] [--out-dir data_out]
                              [--skip-upload] [--skip-fec] [--skip-voteview]
                              [--skip-earmarks]

Outputs (per cycle):
  fec/contributions_{cycle}_organizational.parquet   PAC treasury money given
      to candidates (24K/24Z), day-netted
  fec/independent_expenditures_{cycle}.parquet       super PAC money spent for
      (24E) / against (24A) candidates, day-netted
  fec/earmarked_contributions_{cycle}.parquet        individual money earmarked
      through conduits (15E), attributed to the conduit, day-netted
  voteview/HSall_{members,rollcalls,votes}.parquet   roll-call data

Outputs (not per cycle):
  fec/presidential_receipts_{cycle}.parquet          individual receipts of
      2028 hopefuls' federal committees
  fec/contributions_former_federal.parquet           PAC money received by 2028
      hopefuls who previously served in Congress, across every cycle of their
      service, keyed by curated slug

Environment:
  HF_REPO  Hugging Face dataset repo id, e.g. "someuser/paper-trail-data"

Upload auth uses Hugging Face Trusted Publishers (OIDC) when run inside
GitHub Actions with `permissions: id-token: write` -- no token needed. Outside
CI (e.g. --skip-upload for local testing), no auth is required either.
"""

import argparse
import os
import sys
import tempfile
import urllib.request
import zipfile
from datetime import datetime, timezone

import duckdb

FEC_BASE = "https://www.fec.gov/files/bulk-downloads"
VOTEVIEW_BASE = "https://voteview.com/static/data/out"

# FEC bulk files are pipe-delimited with no header row; column order is fixed
# by the FEC data dictionaries (fec.gov/campaign-finance-data/browse-data).
PAS2_COLUMNS = {
    "CMTE_ID": "VARCHAR", "AMNDT_IND": "VARCHAR", "RPT_TP": "VARCHAR",
    "TRANSACTION_PGI": "VARCHAR", "IMAGE_NUM": "VARCHAR", "TRANSACTION_TP": "VARCHAR",
    "ENTITY_TP": "VARCHAR", "NAME": "VARCHAR", "CITY": "VARCHAR", "STATE": "VARCHAR",
    "ZIP_CODE": "VARCHAR", "EMPLOYER": "VARCHAR", "OCCUPATION": "VARCHAR",
    "TRANSACTION_DT": "VARCHAR", "TRANSACTION_AMT": "DOUBLE", "OTHER_ID": "VARCHAR",
    "CAND_ID": "VARCHAR", "TRAN_ID": "VARCHAR", "FILE_NUM": "VARCHAR",
    "MEMO_CD": "VARCHAR", "MEMO_TEXT": "VARCHAR", "SUB_ID": "VARCHAR",
}
CN_COLUMNS = {
    "CAND_ID": "VARCHAR", "CAND_NAME": "VARCHAR", "CAND_PTY_AFFILIATION": "VARCHAR",
    "CAND_ELECTION_YR": "VARCHAR", "CAND_OFFICE_ST": "VARCHAR", "CAND_OFFICE": "VARCHAR",
    "CAND_OFFICE_DISTRICT": "VARCHAR", "CAND_ICI": "VARCHAR", "CAND_STATUS": "VARCHAR",
    "CAND_PCC": "VARCHAR", "CAND_ST1": "VARCHAR", "CAND_ST2": "VARCHAR",
    "CAND_CITY": "VARCHAR", "CAND_ST": "VARCHAR", "CAND_ZIP": "VARCHAR",
}
CM_COLUMNS = {
    "CMTE_ID": "VARCHAR", "CMTE_NM": "VARCHAR", "TRES_NM": "VARCHAR",
    "CMTE_ST1": "VARCHAR", "CMTE_ST2": "VARCHAR", "CMTE_CITY": "VARCHAR",
    "CMTE_ST": "VARCHAR", "CMTE_ZIP": "VARCHAR", "CMTE_DSGN": "VARCHAR",
    "CMTE_TP": "VARCHAR", "CMTE_PTY_AFFILIATION": "VARCHAR",
    "CMTE_FILING_FREQ": "VARCHAR", "ORG_TP": "VARCHAR",
    "CONNECTED_ORG_NM": "VARCHAR", "CAND_ID": "VARCHAR",
}
# Individual contributions file (itcont.txt): same layout as PAS2 minus CAND_ID
# (individual money goes to a committee, not directly to a candidate).
INDIV_COLUMNS = {
    "CMTE_ID": "VARCHAR", "AMNDT_IND": "VARCHAR", "RPT_TP": "VARCHAR",
    "TRANSACTION_PGI": "VARCHAR", "IMAGE_NUM": "VARCHAR", "TRANSACTION_TP": "VARCHAR",
    "ENTITY_TP": "VARCHAR", "NAME": "VARCHAR", "CITY": "VARCHAR", "STATE": "VARCHAR",
    "ZIP_CODE": "VARCHAR", "EMPLOYER": "VARCHAR", "OCCUPATION": "VARCHAR",
    "TRANSACTION_DT": "VARCHAR", "TRANSACTION_AMT": "DOUBLE", "OTHER_ID": "VARCHAR",
    "TRAN_ID": "VARCHAR", "FILE_NUM": "VARCHAR",
    "MEMO_CD": "VARCHAR", "MEMO_TEXT": "VARCHAR", "SUB_ID": "VARCHAR",
}
# Candidate-committee linkage: maps recipient committees to their candidate.
CCL_COLUMNS = {
    "CAND_ID": "VARCHAR", "CAND_ELECTION_YR": "VARCHAR", "FEC_ELECTION_YR": "VARCHAR",
    "CMTE_ID": "VARCHAR", "CMTE_TP": "VARCHAR", "CMTE_DSGN": "VARCHAR",
    "LINKAGE_ID": "VARCHAR",
}
# Candidate financial summary (weball): one row per candidate with FEC's own
# cycle-to-date totals. Gives "PAC money as a share of total raised" context
# the itemized files can't. Note CVG_END_DT uses %m/%d/%Y, unlike the
# itemized files' %m%d%Y.
WEBALL_COLUMNS = {
    "CAND_ID": "VARCHAR", "CAND_NAME": "VARCHAR", "CAND_ICI": "VARCHAR",
    "PTY_CD": "VARCHAR", "CAND_PTY_AFFILIATION": "VARCHAR",
    "TTL_RECEIPTS": "DOUBLE", "TRANS_FROM_AUTH": "DOUBLE", "TTL_DISB": "DOUBLE",
    "TRANS_TO_AUTH": "DOUBLE", "COH_BOP": "DOUBLE", "COH_COP": "DOUBLE",
    "CAND_CONTRIB": "DOUBLE", "CAND_LOANS": "DOUBLE", "OTHER_LOANS": "DOUBLE",
    "CAND_LOAN_REPAY": "DOUBLE", "OTHER_LOAN_REPAY": "DOUBLE",
    "DEBTS_OWED_BY": "DOUBLE", "TTL_INDIV_CONTRIB": "DOUBLE",
    "CAND_OFFICE_ST": "VARCHAR", "CAND_OFFICE_DISTRICT": "VARCHAR",
    "SPEC_ELECTION": "VARCHAR", "PRIM_ELECTION": "VARCHAR",
    "RUN_ELECTION": "VARCHAR", "GEN_ELECTION": "VARCHAR",
    "GEN_ELECTION_PRECENT": "VARCHAR", "OTHER_POL_CMTE_CONTRIB": "DOUBLE",
    "POL_PTY_CONTRIB": "DOUBLE", "CVG_END_DT": "VARCHAR",
    "INDIV_REFUNDS": "DOUBLE", "CMTE_REFUNDS": "DOUBLE",
}


def log(msg: str) -> None:
    print(f"[data_sync] {msg}", flush=True)


def download(url: str, dest: str, attempts: int = 3) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "paper-trail-data-sync/1.0"})
    for attempt in range(1, attempts + 1):
        try:
            log(f"downloading {url}")
            with urllib.request.urlopen(request, timeout=300) as response, open(dest, "wb") as out:
                while chunk := response.read(1 << 20):
                    out.write(chunk)
            size_mb = os.path.getsize(dest) / (1 << 20)
            log(f"  -> {dest} ({size_mb:.1f} MB)")
            return
        except Exception as err:  # noqa: BLE001 - retry any transient network failure
            if attempt == attempts:
                raise
            log(f"  attempt {attempt} failed ({err}), retrying")


def download_and_extract_zip(url: str, work_dir: str) -> None:
    zip_path = os.path.join(work_dir, os.path.basename(url))
    download(url, zip_path)
    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(work_dir)
    # The individual-contributions archive is ~2 GB zipped / ~8 GB extracted;
    # dropping each zip immediately keeps peak disk usage inside what a GitHub
    # Actions runner has available.
    os.remove(zip_path)


def fec_read_csv(path: str, columns: dict[str, str]) -> str:
    # quote='' because FEC files use no quoting and names may contain quote chars
    return (
        f"read_csv('{path}', delim='|', header=false, quote='', "
        f"columns={columns}, encoding='latin-1')"
    )


def build_fec(con: duckdb.DuckDBPyConnection, work_dir: str, out_dir: str, cycle: int) -> None:
    yy = f"{cycle % 100:02d}"
    for name in (f"pas2{yy}", f"cn{yy}", f"cm{yy}"):
        download_and_extract_zip(f"{FEC_BASE}/{cycle}/{name}.zip", work_dir)

    pas2 = fec_read_csv(os.path.join(work_dir, "itpas2.txt"), PAS2_COLUMNS)
    cn = fec_read_csv(os.path.join(work_dir, "cn.txt"), CN_COLUMNS)
    cm = fec_read_csv(os.path.join(work_dir, "cm.txt"), CM_COLUMNS)

    out_path = os.path.join(out_dir, "fec", f"contributions_{cycle}_organizational.parquet")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    # Transaction types 24K (direct contribution) and 24Z (in-kind) are money
    # given TO a candidate. Independent expenditures (24A/24E) are handled
    # separately below -- they are money spent for/against a candidate, never
    # given to them, and must not be mixed into contribution totals.
    # MEMO_CD = 'X' rows are informational duplicates that would double-count.
    # Rows are netted per (committee, candidate, day): FEC files contain
    # negative amounts from amended/refunded filings, so summing at build time
    # keeps every downstream aggregate correct without each query having to
    # know about corrections. Negative day-nets are kept (they offset a
    # different day's row); only exact zero-nets are dropped as pure noise.
    # Column aliases intentionally mirror the DIME schema the frontend queries.
    # "contributor.name" prefers the PAC's connected organization (the company
    # or union behind it): the frontend's hide-PACs filter and sector
    # classifier key off name text, and raw committee names nearly all contain
    # "PAC"/"COMMITTEE", which would hide everything and classify every donor
    # as a political committee.
    con.execute(f"""
        COPY (
            SELECT
                ANY_VALUE(COALESCE(
                    NULLIF(NULLIF(TRIM(cm.CONNECTED_ORG_NM), ''), 'NONE'),
                    cm.CMTE_NM,
                    p.CMTE_ID
                ))                                                 AS "contributor.name",
                ANY_VALUE(cm.CMTE_NM)                              AS committee_name,
                ANY_VALUE(NULLIF(TRIM(p.OCCUPATION), ''))          AS "contributor.occupation",
                ANY_VALUE(NULLIF(TRIM(p.EMPLOYER), ''))            AS "contributor.employer",
                ANY_VALUE(COALESCE(NULLIF(TRIM(cn.CAND_NAME), ''), p.NAME)) AS "recipient.name",
                SUM(p.TRANSACTION_AMT)                             AS amount,
                strftime(try_strptime(p.TRANSACTION_DT, '%m%d%Y'), '%Y-%m-%d') AS date,
                p.CAND_ID                                          AS cand_id,
                p.CMTE_ID                                          AS cmte_id,
                p.TRANSACTION_TP                                   AS transaction_tp,
                ANY_VALUE(cn.CAND_PTY_AFFILIATION)                 AS recipient_party,
                ANY_VALUE(cn.CAND_OFFICE)                          AS recipient_office,
                ANY_VALUE(cn.CAND_OFFICE_ST)                       AS recipient_state,
                ANY_VALUE(cn.CAND_OFFICE_DISTRICT)                 AS recipient_district
            FROM {pas2} p
            LEFT JOIN {cm} cm ON p.CMTE_ID = cm.CMTE_ID
            LEFT JOIN {cn} cn ON p.CAND_ID = cn.CAND_ID
            WHERE p.TRANSACTION_TP IN ('24K', '24Z')
              AND COALESCE(p.MEMO_CD, '') <> 'X'
            GROUP BY p.CMTE_ID, p.CAND_ID, date, p.TRANSACTION_TP
            HAVING SUM(p.TRANSACTION_AMT) <> 0
            ORDER BY date
        ) TO '{out_path}' (FORMAT PARQUET, COMPRESSION ZSTD)
    """)

    # `|| ''` forces a real scan: bare MIN/MAX on parquet strings can be
    # answered from row-group statistics, which are stored truncated.
    rows, dmin, dmax = con.execute(
        f"SELECT COUNT(*), MIN(date || ''), MAX(date || '') FROM '{out_path}'"
    ).fetchone()
    log(f"FEC contributions: {rows} rows, {dmin} .. {dmax}")

    # Independent expenditures: super PAC (and other committee) money spent
    # FOR (24E) or AGAINST (24A) a candidate. Written to a separate file so
    # contribution queries can never mistake spending *about* a candidate for
    # money *given to* them. Same day-level netting as above -- IE filings are
    # amended often, and several committees show negative cycle totals that
    # only make sense summed net.
    ie_path = os.path.join(out_dir, "fec", f"independent_expenditures_{cycle}.parquet")
    con.execute(f"""
        COPY (
            SELECT
                ANY_VALUE(COALESCE(
                    NULLIF(NULLIF(TRIM(cm.CONNECTED_ORG_NM), ''), 'NONE'),
                    cm.CMTE_NM,
                    p.CMTE_ID
                ))                                                 AS "spender.name",
                ANY_VALUE(cm.CMTE_NM)                              AS committee_name,
                -- FEC committee type of the spender: 'O' is a true super PAC
                -- (independent-expenditure-only), 'U' single-candidate IE-only,
                -- 'V'/'W' hybrid PACs whose IE accounts operate like super
                -- PACs. Everything else (traditional PACs, party committees,
                -- individuals) also files IEs but must not be labeled
                -- "super PAC" spending.
                ANY_VALUE(cm.CMTE_TP)                              AS spender_committee_type,
                CASE
                    WHEN ANY_VALUE(cm.CMTE_TP) IN ('O', 'U') THEN 'super_pac'
                    WHEN ANY_VALUE(cm.CMTE_TP) IN ('V', 'W') THEN 'hybrid_pac'
                    WHEN ANY_VALUE(cm.CMTE_TP) IN ('X', 'Y', 'Z') THEN 'party'
                    WHEN ANY_VALUE(cm.CMTE_TP) IN ('Q', 'N') THEN 'pac'
                    ELSE 'other'
                END                                                AS spender_kind,
                CASE p.TRANSACTION_TP WHEN '24E' THEN 'support' ELSE 'oppose' END AS direction,
                ANY_VALUE(COALESCE(NULLIF(TRIM(cn.CAND_NAME), ''), p.NAME)) AS "candidate.name",
                SUM(p.TRANSACTION_AMT)                             AS amount,
                -- Some committees (UDP among them) file IEs with an empty
                -- transaction date, which would make millions of dollars
                -- vanish from any date-filtered total. Fall back to the
                -- filing receipt date embedded in IMAGE_NUM (YYYYMMDD
                -- prefix) so every dollar keeps a real, defensible date.
                COALESCE(
                    strftime(try_strptime(p.TRANSACTION_DT, '%m%d%Y'), '%Y-%m-%d'),
                    strftime(try_strptime(substr(p.IMAGE_NUM, 1, 8), '%Y%m%d'), '%Y-%m-%d')
                ) AS date,
                p.CAND_ID                                          AS cand_id,
                p.CMTE_ID                                          AS cmte_id,
                p.TRANSACTION_TP                                   AS transaction_tp,
                ANY_VALUE(cn.CAND_PTY_AFFILIATION)                 AS candidate_party,
                ANY_VALUE(cn.CAND_OFFICE)                          AS candidate_office,
                ANY_VALUE(cn.CAND_OFFICE_ST)                       AS candidate_state,
                ANY_VALUE(cn.CAND_OFFICE_DISTRICT)                 AS candidate_district
            FROM {pas2} p
            LEFT JOIN {cm} cm ON p.CMTE_ID = cm.CMTE_ID
            LEFT JOIN {cn} cn ON p.CAND_ID = cn.CAND_ID
            WHERE p.TRANSACTION_TP IN ('24A', '24E')
              AND COALESCE(p.MEMO_CD, '') <> 'X'
            GROUP BY p.CMTE_ID, p.CAND_ID, date, p.TRANSACTION_TP
            HAVING SUM(p.TRANSACTION_AMT) <> 0
            ORDER BY date
        ) TO '{ie_path}' (FORMAT PARQUET, COMPRESSION ZSTD)
    """)
    rows, total = con.execute(
        f"SELECT COUNT(*), SUM(amount) FROM '{ie_path}'"
    ).fetchone()
    log(f"FEC independent expenditures: {rows} rows, ${total:,.0f} net")

    # Candidate financial summary: FEC's own cycle-to-date totals per
    # candidate. Lets the frontend show itemized PAC money as a share of
    # everything the candidate raised, which itemized files alone can't.
    download_and_extract_zip(f"{FEC_BASE}/{cycle}/weball{yy}.zip", work_dir)
    weball = fec_read_csv(os.path.join(work_dir, f"weball{yy}.txt"), WEBALL_COLUMNS)
    summary_path = os.path.join(out_dir, "fec", f"candidate_summary_{cycle}.parquet")
    con.execute(f"""
        COPY (
            SELECT
                CAND_ID                 AS cand_id,
                CAND_NAME               AS cand_name,
                CAND_PTY_AFFILIATION    AS party,
                TTL_RECEIPTS            AS total_receipts,
                TTL_INDIV_CONTRIB       AS total_individual,
                OTHER_POL_CMTE_CONTRIB  AS total_committee,
                POL_PTY_CONTRIB         AS total_party,
                TTL_DISB                AS total_disbursements,
                COH_COP                 AS cash_on_hand,
                strftime(try_strptime(CVG_END_DT, '%m/%d/%Y'), '%Y-%m-%d') AS coverage_end,
                CAND_OFFICE_ST          AS office_state,
                CAND_OFFICE_DISTRICT    AS office_district
            FROM {weball}
        ) TO '{summary_path}' (FORMAT PARQUET, COMPRESSION ZSTD)
    """)
    rows = con.execute(f"SELECT COUNT(*) FROM '{summary_path}'").fetchone()[0]
    log(f"FEC candidate summary: {rows} candidates")


# Federal committees affiliated with potential 2028 presidential candidates
# who are NOT sitting members of Congress (curated by hand from the FEC
# committee master, 2026-07; verified by name, treasurer, and location).
# Sitting members are excluded — their money shows through the normal member
# pages. People with no active federal committee are simply absent here and
# their pages say so. Slugs match src/data/presidential2028.ts.
PRESIDENTIAL_COMMITTEES: dict[str, list[str]] = {
    "gavin-newsom": ["C00836320", "C00836338", "C00836346"],  # Campaign for Democracy PAC / Group / JFC
    "gretchen-whitmer": ["C00842104"],  # Fight Like Hell PAC
    "andy-beshear": ["C00864785"],  # In This Together PAC
    "pete-buttigieg": ["C00697441"],  # Win the Era PAC
    "jd-vance": ["C00783167"],  # Working for Ohio
    "marco-rubio": ["C00500025"],  # Reclaim America PAC
    "kamala-harris": ["C00744946", "C00838912"],  # Harris Victory Fund / Harris Action Fund
    "robert-f-kennedy-jr": ["C00836916"],  # Team Kennedy
}


# 2028 hopefuls who previously served in Congress, and therefore have a real
# federal roll-call record and federal campaign money from that service.
#
# Both IDs are CURATED AND VERIFIED BY HAND -- never derive these by matching
# names. A name search for "Kennedy, Robert" in VoteView returns RFK Sr. (the
# senator assassinated in 1968) and an 1880s congressman; "Newsom" returns a
# congressman from 1943. Publishing either under a 2028 candidate's name would
# be a fabricated voting record. icpsr comes from the VoteView member file
# (exact bioname match); cand_id comes from the FEC candidate master.
#
# cand_ids are congressional committees only. Presidential campaign committees
# (e.g. Rubio 2016, Harris 2020/2024, DeSantis 2024) are deliberately excluded:
# that money was raised for a different office and pairing it with roll-call
# votes they cast years earlier would be misleading.
FORMER_FEDERAL: dict[str, dict] = {
    "kamala-harris": {"icpsr": 41701, "cand_ids": ["S6CA00584"]},   # Sen. CA, 2017-2021
    "jd-vance": {"icpsr": 42304, "cand_ids": ["S2OH00436"]},        # Sen. OH, 2023-2025
    "marco-rubio": {"icpsr": 41102, "cand_ids": ["S0FL00338"]},     # Sen. FL, 2011-2025
    "kristi-noem": {"icpsr": 21177, "cand_ids": ["H0SD00054"]},     # Rep. SD, 2011-2019
    "rahm-emanuel": {"icpsr": 20323, "cand_ids": ["H2IL05092"]},    # Rep. IL, 2003-2009
    "ron-desantis": {"icpsr": 21318, "cand_ids": ["H2FL00292"]},    # Rep. FL, 2013-2019
}

# Cycles spanning the above candidates' congressional service (2003-2025).
FORMER_FEDERAL_CYCLES: list[int] = [
    2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026
]


def build_former_federal(con: duckdb.DuckDBPyConnection, work_dir: str, out_dir: str) -> None:
    """PAC contributions received by former members of Congress while serving.

    Same transaction rules and day-netting as build_fec, but filtered to a
    curated set of candidate IDs and unioned across every cycle that overlaps
    their service, so their pages can show the same vote-money timeline the
    sitting-member pages show. Emitting `slug` directly means the frontend
    never has to name-match these people.
    """
    cand_to_slug = {
        cid: slug
        for slug, meta in FORMER_FEDERAL.items()
        for cid in meta["cand_ids"]
    }
    slug_values = ", ".join(f"('{cid}', '{slug}')" for cid, slug in cand_to_slug.items())

    out_path = os.path.join(out_dir, "fec", "contributions_former_federal.parquet")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    con.execute("DROP TABLE IF EXISTS former_federal")
    table_created = False

    for cycle in FORMER_FEDERAL_CYCLES:
        yy = f"{cycle % 100:02d}"
        # Per-cycle directory: every cycle's archive unpacks to the same
        # itpas2.txt/cm.txt filenames, so they must not share a directory.
        cdir = os.path.join(work_dir, f"cycle_{cycle}")
        os.makedirs(cdir, exist_ok=True)
        for name in (f"pas2{yy}", f"cm{yy}"):
            download_and_extract_zip(f"{FEC_BASE}/{cycle}/{name}.zip", cdir)

        pas2 = fec_read_csv(os.path.join(cdir, "itpas2.txt"), PAS2_COLUMNS)
        cm = fec_read_csv(os.path.join(cdir, "cm.txt"), CM_COLUMNS)
        select_sql = f"""
            WITH targets(cand_id, slug) AS (VALUES {slug_values})
            SELECT
                t.slug                                             AS slug,
                {cycle}                                            AS cycle,
                ANY_VALUE(COALESCE(
                    NULLIF(NULLIF(TRIM(cm.CONNECTED_ORG_NM), ''), 'NONE'),
                    cm.CMTE_NM,
                    p.CMTE_ID
                ))                                                 AS "contributor.name",
                ANY_VALUE(cm.CMTE_NM)                              AS committee_name,
                ANY_VALUE(NULLIF(TRIM(p.OCCUPATION), ''))          AS "contributor.occupation",
                ANY_VALUE(NULLIF(TRIM(p.EMPLOYER), ''))            AS "contributor.employer",
                SUM(p.TRANSACTION_AMT)                             AS amount,
                COALESCE(
                    strftime(try_strptime(p.TRANSACTION_DT, '%m%d%Y'), '%Y-%m-%d'),
                    strftime(try_strptime(substr(p.IMAGE_NUM, 1, 8), '%Y%m%d'), '%Y-%m-%d')
                )                                                  AS date,
                p.CAND_ID                                          AS cand_id,
                p.CMTE_ID                                          AS cmte_id,
                p.TRANSACTION_TP                                   AS transaction_tp
            FROM {pas2} p
            JOIN targets t ON p.CAND_ID = t.cand_id
            LEFT JOIN {cm} cm ON p.CMTE_ID = cm.CMTE_ID
            WHERE p.TRANSACTION_TP IN ('24K', '24Z')
              AND COALESCE(p.MEMO_CD, '') <> 'X'
            GROUP BY t.slug, p.CMTE_ID, p.CAND_ID, date, p.TRANSACTION_TP
            HAVING SUM(p.TRANSACTION_AMT) <> 0
        """
        if not table_created:
            con.execute(f"CREATE TABLE former_federal AS {select_sql}")
            table_created = True
        else:
            con.execute(f"INSERT INTO former_federal {select_sql}")

        # Reclaim disk before the next cycle's ~100 MB extraction.
        for fname in ("itpas2.txt", "cm.txt"):
            fpath = os.path.join(cdir, fname)
            if os.path.exists(fpath):
                os.remove(fpath)

    con.execute(f"""
        COPY (SELECT * FROM former_federal ORDER BY slug, date)
        TO '{out_path}' (FORMAT PARQUET, COMPRESSION ZSTD)
    """)
    rows, total = con.execute(
        f"SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM '{out_path}'"
    ).fetchone()
    log(f"FEC former-federal contributions: {rows} rows, ${total:,.0f} net")


def build_presidential(con: duckdb.DuckDBPyConnection, work_dir: str, out_dir: str, cycle: int) -> None:
    """Itemized individual receipts of 2028 presidential hopefuls' federal committees.

    Money "received" by a non-member candidate this cycle means donations to
    the federal committees they control (leadership PACs, active campaign
    committees). Individual receipts (types 15/15E) are summed net of refunds
    (22Y), day-netted per donor. State campaign accounts are regulated by
    state law and never appear in FEC data — the frontend says so.
    """
    yy = f"{cycle % 100:02d}"
    if not os.path.exists(os.path.join(work_dir, "itcont.txt")):
        download_and_extract_zip(f"{FEC_BASE}/{cycle}/indiv{yy}.zip", work_dir)
    if not os.path.exists(os.path.join(work_dir, "cm.txt")):
        download_and_extract_zip(f"{FEC_BASE}/{cycle}/cm{yy}.zip", work_dir)

    indiv = fec_read_csv(os.path.join(work_dir, "itcont.txt"), INDIV_COLUMNS)
    cm = fec_read_csv(os.path.join(work_dir, "cm.txt"), CM_COLUMNS)

    slug_rows = ", ".join(
        f"('{slug}', '{cmte}')"
        for slug, committees in PRESIDENTIAL_COMMITTEES.items()
        for cmte in committees
    )

    out_path = os.path.join(out_dir, "fec", f"presidential_receipts_{cycle}.parquet")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    con.execute(f"""
        COPY (
            WITH targets(slug, cmte_id) AS (VALUES {slug_rows})
            SELECT
                t.slug                                             AS slug,
                i.CMTE_ID                                          AS cmte_id,
                ANY_VALUE(cm.CMTE_NM)                              AS committee_name,
                NULLIF(TRIM(i.NAME), '')                           AS "contributor.name",
                NULLIF(TRIM(i.EMPLOYER), '')                       AS "contributor.employer",
                NULLIF(TRIM(i.OCCUPATION), '')                     AS "contributor.occupation",
                SUM(CASE WHEN i.TRANSACTION_TP = '22Y'
                         THEN -i.TRANSACTION_AMT ELSE i.TRANSACTION_AMT END) AS amount,
                CAST(COUNT(*) AS INTEGER)                          AS n_contributions,
                COALESCE(
                    strftime(try_strptime(i.TRANSACTION_DT, '%m%d%Y'), '%Y-%m-%d'),
                    strftime(try_strptime(substr(i.IMAGE_NUM, 1, 8), '%Y%m%d'), '%Y-%m-%d')
                ) AS date
            FROM {indiv} i
            JOIN targets t ON i.CMTE_ID = t.cmte_id
            LEFT JOIN {cm} cm ON i.CMTE_ID = cm.CMTE_ID
            WHERE i.TRANSACTION_TP IN ('15', '15E', '22Y')
              AND COALESCE(i.MEMO_CD, '') <> 'X'
            GROUP BY t.slug, i.CMTE_ID, "contributor.name",
                     "contributor.employer", "contributor.occupation", date
            HAVING SUM(CASE WHEN i.TRANSACTION_TP = '22Y'
                       THEN -i.TRANSACTION_AMT ELSE i.TRANSACTION_AMT END) <> 0
            ORDER BY date
        ) TO '{out_path}' (FORMAT PARQUET, COMPRESSION ZSTD)
    """)
    rows, total = con.execute(
        f"SELECT COUNT(*), COALESCE(SUM(amount), 0) FROM '{out_path}'"
    ).fetchone()
    log(f"FEC presidential receipts: {rows} rows, ${total:,.0f} net")


def build_earmarks(con: duckdb.DuckDBPyConnection, work_dir: str, out_dir: str, cycle: int) -> None:
    """Attribute earmarked individual contributions to the conduit they passed through.

    Most "PAC money" reported in the press is not PAC treasury money but
    individual contributions earmarked THROUGH a conduit committee (AIPAC PAC,
    ActBlue, WinRed, Club for Growth, ...). Those flows live in the individual
    contributions file as transaction type 15E, reported by the RECIPIENT
    committee with OTHER_ID naming the conduit. The conduit's own copies of the
    same dollars (types 15/24T/24I) are deliberately not read -- counting both
    sides would double-count. Refunds (22Y) are not netted here because the
    FEC does not link a refund back to the conduit it arrived through.

    Rows are aggregated per (conduit, recipient committee, candidate, day),
    summing net amounts: itemized 15E corrections can be negative and only the
    day-net is meaningful. This collapses ~16M itemized rows into a few
    hundred thousand while keeping day-level timing intact for the frontend's
    vote-proximity analysis.
    """
    yy = f"{cycle % 100:02d}"
    # itcont may already be present from build_presidential (same download).
    for name, fname in ((f"indiv{yy}", "itcont.txt"), (f"ccl{yy}", "ccl.txt")):
        if not os.path.exists(os.path.join(work_dir, fname)):
            download_and_extract_zip(f"{FEC_BASE}/{cycle}/{name}.zip", work_dir)
    # cm/cn are normally already extracted by build_fec; fetch them if this
    # step runs standalone (--skip-fec).
    for name, fname in ((f"cm{yy}", "cm.txt"), (f"cn{yy}", "cn.txt")):
        if not os.path.exists(os.path.join(work_dir, fname)):
            download_and_extract_zip(f"{FEC_BASE}/{cycle}/{name}.zip", work_dir)

    indiv_path = os.path.join(work_dir, "itcont.txt")
    indiv = fec_read_csv(indiv_path, INDIV_COLUMNS)
    ccl = fec_read_csv(os.path.join(work_dir, "ccl.txt"), CCL_COLUMNS)
    cm = fec_read_csv(os.path.join(work_dir, "cm.txt"), CM_COLUMNS)
    cn = fec_read_csv(os.path.join(work_dir, "cn.txt"), CN_COLUMNS)

    out_path = os.path.join(out_dir, "fec", f"earmarked_contributions_{cycle}.parquet")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    # A few hundred committees appear in ccl linked to more than one candidate
    # (old linkages, redesignations). Money must not fan out across all of
    # them: keep one candidate per committee, preferring the principal
    # campaign committee linkage from the most recent election year.
    con.execute(f"""
        COPY (
            WITH linkage AS (
                SELECT CMTE_ID, CAND_ID FROM (
                    SELECT CMTE_ID, CAND_ID,
                           ROW_NUMBER() OVER (
                               PARTITION BY CMTE_ID
                               ORDER BY (CMTE_DSGN = 'P') DESC,
                                        FEC_ELECTION_YR DESC, CAND_ID
                           ) AS rn
                    FROM {ccl}
                ) WHERE rn = 1
            )
            SELECT
                -- Unlike direct contributions (where the connected org -- the
                -- company behind a PAC -- is the truer donor identity), a
                -- conduit IS the identity: ActBlue's connected-org field is
                -- an unrelated registration name that would break the
                -- frontend's name-based ActBlue/WinRed filter. The connected
                -- org is kept as a separate column for sector classification.
                ANY_VALUE(COALESCE(conduit.CMTE_NM, i.OTHER_ID))   AS "conduit.name",
                ANY_VALUE(NULLIF(NULLIF(TRIM(conduit.CONNECTED_ORG_NM), ''), 'NONE')) AS conduit_connected_org,
                ANY_VALUE(COALESCE(NULLIF(TRIM(cn.CAND_NAME), ''), l.CAND_ID)) AS "recipient.name",
                SUM(i.TRANSACTION_AMT)                             AS amount,
                CAST(COUNT(*) AS INTEGER)                          AS n_contributions,
                strftime(try_strptime(i.TRANSACTION_DT, '%m%d%Y'), '%Y-%m-%d') AS date,
                l.CAND_ID                                          AS cand_id,
                i.OTHER_ID                                         AS conduit_cmte_id,
                i.CMTE_ID                                          AS recipient_cmte_id,
                ANY_VALUE(cn.CAND_PTY_AFFILIATION)                 AS recipient_party,
                ANY_VALUE(cn.CAND_OFFICE)                          AS recipient_office,
                ANY_VALUE(cn.CAND_OFFICE_ST)                       AS recipient_state,
                ANY_VALUE(cn.CAND_OFFICE_DISTRICT)                 AS recipient_district
            FROM {indiv} i
            JOIN linkage l ON i.CMTE_ID = l.CMTE_ID
            LEFT JOIN {cm} conduit ON i.OTHER_ID = conduit.CMTE_ID
            LEFT JOIN {cn} cn ON l.CAND_ID = cn.CAND_ID
            WHERE i.TRANSACTION_TP = '15E'
              AND COALESCE(TRIM(i.OTHER_ID), '') <> ''
              AND COALESCE(i.MEMO_CD, '') <> 'X'
            GROUP BY i.OTHER_ID, i.CMTE_ID, l.CAND_ID, date
            HAVING SUM(i.TRANSACTION_AMT) <> 0
            ORDER BY date
        ) TO '{out_path}' (FORMAT PARQUET, COMPRESSION ZSTD)
    """)

    # The extracted individual file is ~5-9 GB; drop it as soon as the
    # aggregate is built so the rest of the run has disk headroom.
    os.remove(indiv_path)

    rows, total, n = con.execute(
        f'SELECT COUNT(*), SUM(amount), SUM(n_contributions) FROM \'{out_path}\''
    ).fetchone()
    log(f"FEC earmarked contributions: {rows} rows (from {n} itemized), ${total:,.0f} net")


def build_voteview(con: duckdb.DuckDBPyConnection, work_dir: str, out_dir: str) -> None:
    vv_out = os.path.join(out_dir, "voteview")
    os.makedirs(vv_out, exist_ok=True)

    # Integer casts keep numeric columns INT32 so duckdb-wasm surfaces them to
    # the frontend as JS numbers (INT64/BIGINT would arrive as BigInt and break
    # comparisons like `party_code === 100`). Dates stay VARCHAR because the
    # frontend compares them as ISO strings.
    datasets = {
        "members": (
            "SELECT * REPLACE (CAST(congress AS INTEGER) AS congress, "
            "CAST(icpsr AS INTEGER) AS icpsr, CAST(party_code AS INTEGER) AS party_code, "
            "CAST(district_code AS INTEGER) AS district_code) FROM {src} "
            "ORDER BY congress DESC"
        ),
        "rollcalls": (
            "SELECT * REPLACE (CAST(congress AS INTEGER) AS congress, "
            "CAST(rollnumber AS INTEGER) AS rollnumber, CAST(date AS VARCHAR) AS date) "
            "FROM {src} ORDER BY congress DESC, rollnumber"
        ),
        "votes": (
            "SELECT * REPLACE (CAST(congress AS INTEGER) AS congress, "
            "CAST(rollnumber AS INTEGER) AS rollnumber, CAST(icpsr AS INTEGER) AS icpsr, "
            "CAST(cast_code AS INTEGER) AS cast_code) FROM {src} "
            "ORDER BY congress DESC, icpsr"
        ),
    }
    for name, select in datasets.items():
        csv_path = os.path.join(work_dir, f"HSall_{name}.csv")
        download(f"{VOTEVIEW_BASE}/{name}/HSall_{name}.csv", csv_path)
        out_path = os.path.join(vv_out, f"HSall_{name}.parquet")
        src = f"read_csv('{csv_path}')"
        con.execute(
            f"COPY ({select.format(src=src)}) TO '{out_path}' "
            f"(FORMAT PARQUET, COMPRESSION ZSTD)"
        )
        rows = con.execute(f"SELECT COUNT(*) FROM '{out_path}'").fetchone()[0]
        log(f"voteview {name}: {rows} rows")


def write_meta(con: duckdb.DuckDBPyConnection, out_dir: str, cycle: int) -> None:
    """Write meta.json: build stamp, filing freshness, and cycle totals.

    The frontend shows "FEC filings through <date>" from this file so readers
    can't mistake not-yet-filed money for absent money, and the money-flow
    explainer page shows real cycle totals without loading DuckDB.
    """
    import json

    meta: dict = {
        "generated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "cycle": cycle,
        "totals": {},
    }
    max_dates = []

    def add(key: str, rel_path: str, amount_sql: str) -> None:
        path = os.path.join(out_dir, rel_path)
        if not os.path.exists(path):
            return
        # Both date bounds matter: filings occasionally carry typo'd or
        # post-dated transaction dates (real examples: year 3312, and
        # December dates filed in July), which would otherwise become the
        # "filings through" stamp shown to readers.
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        total, dmax = con.execute(
            f"SELECT {amount_sql}, MAX(date || '') FROM '{path}' "
            f"WHERE date >= '{cycle - 1}-01-01' AND date <= '{today}'"
        ).fetchone()
        meta["totals"][key] = round(total or 0)
        if dmax:
            max_dates.append(dmax)

    # ie_* totals are scoped to super PACs (and hybrid PACs' IE accounts):
    # the frontend labels this money "super PAC spending", and ~2% of IE
    # dollars come from traditional PACs / party committees that must not be
    # counted under that label.
    add("contributions", f"fec/contributions_{cycle}_organizational.parquet", "SUM(amount)")
    add("earmarked", f"fec/earmarked_contributions_{cycle}.parquet", "SUM(amount)")
    add("ie_support", f"fec/independent_expenditures_{cycle}.parquet",
        "SUM(CASE WHEN direction = 'support' AND spender_kind IN ('super_pac', 'hybrid_pac') THEN amount ELSE 0 END)")
    add("ie_oppose", f"fec/independent_expenditures_{cycle}.parquet",
        "SUM(CASE WHEN direction = 'oppose' AND spender_kind IN ('super_pac', 'hybrid_pac') THEN amount ELSE 0 END)")

    if max_dates:
        meta["fec_filings_through"] = max(max_dates)

    meta_path = os.path.join(out_dir, "meta.json")
    with open(meta_path, "w") as fh:
        json.dump(meta, fh, indent=2)
    log(f"meta.json: filings through {meta.get('fec_filings_through', 'n/a')}, "
        f"totals {meta['totals']}")


def upload(out_dir: str, repo: str) -> None:
    from huggingface_hub import HfApi
    from huggingface_hub._oidc import oidc_login

    # Trusted Publishers (OIDC): exchange this job's short-lived GitHub Actions
    # id token for a short-lived HF token scoped to this repo, instead of
    # relying on a long-lived HF_TOKEN secret. Requires the workflow to have
    # `permissions: id-token: write` and to be registered on the HF dataset
    # repo under Settings > Trusted Publishers.
    token = oidc_login(resource=f"datasets/{repo}")["access_token"]

    api = HfApi(token=token)
    api.create_repo(repo_id=repo, repo_type="dataset", exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    api.upload_folder(
        folder_path=out_dir,
        repo_id=repo,
        repo_type="dataset",
        commit_message=f"Automated data sync {stamp}",
    )
    log(f"uploaded {out_dir} -> https://huggingface.co/datasets/{repo}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cycle", type=int, default=2026, help="election cycle (even year)")
    parser.add_argument("--out-dir", default="data_out", help="local output directory")
    parser.add_argument("--skip-upload", action="store_true", help="build locally, don't upload")
    parser.add_argument("--skip-fec", action="store_true")
    parser.add_argument("--skip-voteview", action="store_true")
    parser.add_argument(
        "--skip-earmarks", action="store_true",
        help="skip the ~2 GB individual-contributions download (faster local runs)",
    )
    args = parser.parse_args()

    repo = os.environ.get("HF_REPO", "")
    if not args.skip_upload and not repo:
        log("ERROR: HF_REPO must be set (or pass --skip-upload)")
        return 1

    os.makedirs(args.out_dir, exist_ok=True)
    con = duckdb.connect()
    with tempfile.TemporaryDirectory(prefix="data_sync_") as work_dir:
        if not args.skip_fec:
            build_fec(con, work_dir, args.out_dir, args.cycle)
        if not args.skip_fec:
            build_former_federal(con, work_dir, args.out_dir)
        if not args.skip_earmarks:
            # Presidential receipts first: it shares the indiv download that
            # build_earmarks deletes when it finishes.
            build_presidential(con, work_dir, args.out_dir, args.cycle)
            build_earmarks(con, work_dir, args.out_dir, args.cycle)
        if not args.skip_voteview:
            build_voteview(con, work_dir, args.out_dir)

    write_meta(con, args.out_dir, args.cycle)

    if args.skip_upload:
        log("skip-upload set; done")
    else:
        upload(args.out_dir, repo)
    return 0


if __name__ == "__main__":
    sys.exit(main())
