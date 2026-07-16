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
    # given TO a candidate. Other pas2 types (24A/24E independent expenditures
    # for/against, etc.) are not contributions and must be excluded.
    # MEMO_CD = 'X' rows are informational duplicates that would double-count.
    # Column aliases intentionally mirror the DIME schema the frontend queries.
    # "contributor.name" prefers the PAC's connected organization (the company
    # or union behind it): the frontend's hide-PACs filter and sector
    # classifier key off name text, and raw committee names nearly all contain
    # "PAC"/"COMMITTEE", which would hide everything and classify every donor
    # as a political committee.
    con.execute(f"""
        COPY (
            SELECT
                COALESCE(
                    NULLIF(NULLIF(TRIM(cm.CONNECTED_ORG_NM), ''), 'NONE'),
                    cm.CMTE_NM,
                    p.CMTE_ID
                )                                                  AS "contributor.name",
                cm.CMTE_NM                                         AS committee_name,
                NULLIF(TRIM(p.OCCUPATION), '')                     AS "contributor.occupation",
                NULLIF(TRIM(p.EMPLOYER), '')                       AS "contributor.employer",
                COALESCE(NULLIF(TRIM(cn.CAND_NAME), ''), p.NAME)   AS "recipient.name",
                p.TRANSACTION_AMT                                  AS amount,
                strftime(try_strptime(p.TRANSACTION_DT, '%m%d%Y'), '%Y-%m-%d') AS date,
                p.CAND_ID                                          AS cand_id,
                p.CMTE_ID                                          AS cmte_id,
                p.TRANSACTION_TP                                   AS transaction_tp,
                cn.CAND_PTY_AFFILIATION                            AS recipient_party,
                cn.CAND_OFFICE                                     AS recipient_office,
                cn.CAND_OFFICE_ST                                  AS recipient_state,
                cn.CAND_OFFICE_DISTRICT                            AS recipient_district
            FROM {pas2} p
            LEFT JOIN {cm} cm ON p.CMTE_ID = cm.CMTE_ID
            LEFT JOIN {cn} cn ON p.CAND_ID = cn.CAND_ID
            WHERE p.TRANSACTION_TP IN ('24K', '24Z')
              AND COALESCE(p.MEMO_CD, '') <> 'X'
            ORDER BY date
        ) TO '{out_path}' (FORMAT PARQUET, COMPRESSION ZSTD)
    """)

    # `|| ''` forces a real scan: bare MIN/MAX on parquet strings can be
    # answered from row-group statistics, which are stored truncated.
    rows, dmin, dmax = con.execute(
        f"SELECT COUNT(*), MIN(date || ''), MAX(date || '') FROM '{out_path}'"
    ).fetchone()
    log(f"FEC contributions: {rows} rows, {dmin} .. {dmax}")


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
        if not args.skip_voteview:
            build_voteview(con, work_dir, args.out_dir)

    if args.skip_upload:
        log("skip-upload set; done")
    else:
        upload(args.out_dir, repo)
    return 0


if __name__ == "__main__":
    sys.exit(main())
