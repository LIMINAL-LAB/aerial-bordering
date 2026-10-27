dev:
  npm run dev

build:
  npm run build

# Port a report draft from Word into src/data/report.json. The path to a report
# draft (.docx) is required; drafts are kept in the untracked design/ dir.
port-report docx:
  python3 scripts/docx_to_report.py {{docx}}
