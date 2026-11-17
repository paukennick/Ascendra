# Lab coverage against the density rule (REQ-295)

Measured 2026-11-14 on branch feature/build-labs and re-measured 2026-11-16 after merging master (checkpoint #193, which added new courses with their own labs), for every course in the seeded catalog that is not hidden (`hiddenAt` unset), counting labs on active objectives of active units only.

**The rule (Nick, 2026-11-14):** one lab per unit, plus six per course split across units by exam weight (equal split, earliest units first, when a course has no weights), at most three per unit, and never more labs in a unit than it has objectives. The generator's own plan (`unitPlan`, policy hybrid, docs/labs.md "Density") also caps each unit by how many objectives its verb heuristic counts as hands-on, which planned fewer labs than this rule in 40 visible courses; a course brought up to the rule gets a `LAB_PLAN_TOP_UPS` entry so the plan and the density tests follow the rule.

**Totals for visible courses (2026-11-16, 146 courses):** 1703 labs now, 1707 required by the rule. On 2026-11-14 the 118 courses then visible had 1287 labs before the fill; this fill added 77. Hidden courses not measured: DCA, EX188, EX280, and ITIL4FND (hidden 2026-11-16, REQ-308; it had 12/12 and its row is replaced by ITIL5FND, built to the rule with 13 labs).

Group: 1 = pre-generated and level-aware lessons, 2 = mixed-round courses, 3 = the rest (Nick's fill order); 3* = a course added by #193 after the first measurement (its "labs before" is its count at merge). Per unit shows labs now / rule, in unit order.

| Course | Group | Units | Labs before | Rule | Gap before | Labs now | Gap now | Per unit (now/rule) |
|---|---|---|---|---|---|---|---|---|
| MSCS | 3 | 15 | 16 | 21 | 5 | 21 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 |
| SECPLUS | 1 | 5 | 10 | 11 | 1 | 11 | 0 | 2/2 2/2 2/2 3/3 2/2 |
| SECPLUSV8 | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 2/2 2/2 3/3 2/2 |
| PYTHON | 1 | 9 | 9 | 15 | 6 | 15 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 1/1 1/1 |
| JAVASCRIPT | 1 | 9 | 10 | 15 | 5 | 15 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 1/1 1/1 |
| LINUXPLUS | 2 | 5 | 10 | 11 | 1 | 11 | 0 | 3/3 2/2 2/2 2/2 2/2 |
| CYSAPLUS | 3 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| PENTESTPLUS | 3 | 5 | 6 | 11 | 5 | 11 | 0 | 2/2 2/2 2/2 3/3 2/2 |
| SECURITYX | 3 | 4 | 10 | 10 | 0 | 10 | 0 | 2/2 3/3 3/3 2/2 |
| CMPCBS | 3 | 20 | 21 | 26 | 5 | 26 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 |
| AWSCLF | 2 | 4 | 10 | 10 | 0 | 10 | 0 | 2/2 3/3 3/3 2/2 |
| AWSAIF | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 2/2 3/3 2/2 2/2 |
| AWSSAA | 1 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| AWSDVA | 3 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| AWSSOA | 2 | 5 | 11 | 11 | 0 | 11 | 0 | 3/3 2/2 2/2 2/2 2/2 |
| AWSDEA | 3 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| AWSMLA | 1 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| AWSSAP | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 3/3 2/2 2/2 2/2 2/2 |
| AWSDOP | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| AWSSCS | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| AWSANS | 3 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| AZ900 | 3 | 3 | 8 | 9 | 1 | 9 | 0 | 3/3 3/3 3/3 |
| AZ104 | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 3/3 2/2 2/2 2/2 2/2 |
| AZ305 | 3 | 4 | 9 | 10 | 1 | 10 | 0 | 3/3 2/2 2/2 3/3 |
| AI901 | 3 | 2 | 6 | 6 | 0 | 6 | 0 | 3/3 3/3 |
| DP900 | 3 | 4 | 8 | 10 | 2 | 10 | 0 | 3/3 2/2 2/2 3/3 |
| AZ700 | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 3/3 2/2 2/2 2/2 2/2 |
| AZ140 | 3 | 4 | 9 | 9 | 0 | 9 | 0 | 3/3 2/2 2/2 2/2 |
| DP300 | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 3/3 2/2 2/2 2/2 |
| AZ400 | 3 | 5 | 10 | 10 | 0 | 10 | 0 | 2/2 2/2 3/3 2/2 1/1 |
| AZ120 | 3 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| GCPCDL | 2 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| GCPACE | 2 | 4 | 10 | 10 | 0 | 10 | 0 | 2/2 3/3 3/3 2/2 |
| GCPPCA | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| GCPPDE | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 3/3 2/2 2/2 2/2 |
| GCPDEVOPS | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 3/3 2/2 2/2 2/2 |
| GCPSEC | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 3/3 2/2 2/2 2/2 2/2 |
| GCPNET | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| GCPDBE | 3 | 4 | 9 | 10 | 1 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| GCPDEV | 3 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 2/2 3/3 2/2 |
| GCPMLE | 3 | 6 | 11 | 12 | 1 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| GCPGAIL | 3 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| NCLEXRN | 1 | 8 | 14 | 14 | 0 | 14 | 0 | 2/2 2/2 2/2 1/1 1/1 2/2 2/2 2/2 |
| NCLEXPN | 1 | 8 | 14 | 14 | 0 | 14 | 0 | 2/2 2/2 1/1 2/2 2/2 2/2 2/2 1/1 |
| CNA | 1 | 7 | 12 | 13 | 1 | 13 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 |
| LPNVN | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| ADNRN | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| BSNRN | 3 | 10 | 15 | 16 | 1 | 16 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 1/1 1/1 1/1 |
| APLUS_CORE1 | 2 | 5 | 10 | 11 | 1 | 11 | 0 | 2/2 2/2 2/2 2/2 3/3 |
| APLUS_CORE2 | 2 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| NETWORKPLUS | 2 | 5 | 10 | 11 | 1 | 11 | 0 | 2/2 2/2 2/2 2/2 3/3 |
| CLOUDPLUS | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| DATAPLUS | 3 | 5 | 9 | 11 | 2 | 11 | 0 | 2/2 2/2 3/3 2/2 2/2 |
| SERVERPLUS | 3 | 4 | 10 | 10 | 0 | 10 | 0 | 2/2 3/3 2/2 3/3 |
| PROJECTPLUS | 3 | 4 | 7 | 10 | 3 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| TECHPLUS | 3 | 6 | 8 | 12 | 4 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| AUTOOPSPLUS | 3 | 4 | 8 | 10 | 2 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| CLOUDNETX | 3 | 4 | 9 | 10 | 1 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| SECAIPLUS | 3 | 4 | 7 | 10 | 3 | 10 | 0 | 2/2 3/3 3/3 2/2 |
| DATAAI | 3 | 5 | 8 | 11 | 3 | 11 | 0 | 2/2 3/3 2/2 2/2 2/2 |
| CAPM | 2 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 2/2 2/2 3/3 |
| PMP | 2 | 3 | 9 | 9 | 0 | 9 | 0 | 3/3 3/3 3/3 |
| PMIACP | 3 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 2/2 2/2 3/3 |
| PGMP | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 3/3 2/2 2/2 2/2 |
| PFMP | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 3/3 2/2 2/2 2/2 2/2 |
| PMIRMP | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 3/3 2/2 2/2 2/2 |
| PMISP | 3 | 5 | 10 | 11 | 1 | 11 | 0 | 2/2 3/3 3/3 1/1 2/2 |
| PMICP | 3 | 4 | 9 | 9 | 0 | 9 | 0 | 3/3 3/3 2/2 1/1 |
| PMIPMOCP | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| PMIPBA | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 2/2 3/3 2/2 2/2 |
| PMICPMAI | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 3/3 2/2 2/2 2/2 |
| CSPP | 3 | 5 | 10 | 11 | 1 | 11 | 0 | 2/2 2/2 3/3 2/2 2/2 |
| NPTEPT | 2 | 14 | 20 | 20 | 0 | 20 | 0 | 3/3 3/3 2/2 2/2 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 |
| NPTEPTA | 3 | 14 | 19 | 20 | 1 | 20 | 0 | 3/3 3/3 2/2 2/2 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 1/1 |
| DPT | 1 | 8 | 14 | 14 | 0 | 14 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 1/1 |
| ABPTSOCS | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 3/3 1/1 3/3 2/2 2/2 |
| ABPTSGCS | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 3/3 2/2 2/2 1/1 |
| ABPTSNCS | 3 | 4 | 9 | 10 | 1 | 10 | 0 | 2/2 2/2 3/3 3/3 |
| ABPTSCCS | 3 | 8 | 14 | 14 | 0 | 14 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 1/1 |
| ABPTSPCS | 3 | 6 | 11 | 12 | 1 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| ABPTSSCS | 3 | 5 | 10 | 11 | 1 | 11 | 0 | 2/2 1/1 3/3 3/3 2/2 |
| ABPTSONC | 3 | 6 | 10 | 12 | 2 | 12 | 0 | 2/2 2/2 2/2 2/2 3/3 1/1 |
| ABPTSECS | 3 | 5 | 10 | 11 | 1 | 11 | 0 | 2/2 2/2 2/2 3/3 2/2 |
| ABPTSPWCS | 3 | 3 | 8 | 8 | 0 | 8 | 0 | 2/2 3/3 3/3 |
| ABPTSWMS | 3 | 7 | 12 | 13 | 1 | 13 | 0 | 2/2 1/1 2/2 2/2 2/2 2/2 2/2 |
| PTPREREQ | 1 | 11 | 17 | 17 | 0 | 17 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 1/1 1/1 1/1 1/1 |
| NASMCPT | 2 | 6 | 11 | 12 | 1 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| ACECPT | 3 | 4 | 9 | 10 | 1 | 10 | 0 | 2/2 3/3 3/3 2/2 |
| ACSMCPT | 3 | 4 | 7 | 9 | 2 | 9 | 0 | 2/2 3/3 2/2 2/2 |
| NSCACSCS | 3 | 7 | 12 | 13 | 1 | 13 | 0 | 3/3 2/2 1/1 2/2 2/2 2/2 1/1 |
| NSCACPT | 3 | 4 | 10 | 10 | 0 | 10 | 0 | 2/2 3/3 3/3 2/2 |
| NCCPTCPT | 3 | 6 | 10 | 12 | 2 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| NASMCNC | 3* | 4 | 10 | 10 | 0 | 10 | 0 | 2/2 3/3 2/2 3/3 |
| CCRNADULT | 1 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| CCRNPEDS | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| CCRNNEO | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| MSHI | 3 | 10 | 15 | 16 | 1 | 16 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 1/1 1/1 1/1 |
| CKA | 2 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 2/2 2/2 2/2 3/3 |
| CKAD | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 2/2 2/2 3/3 2/2 |
| KCNA | 2 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| CKS | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| KCSA | 3 | 6 | 11 | 12 | 1 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| PCA | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 3/3 2/2 2/2 2/2 2/2 |
| OTCA | 3 | 4 | 9 | 9 | 0 | 9 | 0 | 2/2 3/3 2/2 2/2 |
| CGOA | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 3/3 2/2 2/2 2/2 |
| CAPA | 3 | 4 | 9 | 10 | 1 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| CCA | 3 | 8 | 13 | 14 | 1 | 14 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 1/1 |
| ICA | 3 | 4 | 10 | 10 | 0 | 10 | 0 | 2/2 3/3 3/3 2/2 |
| KCA | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 3/3 1/1 |
| CBA | 3 | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 2/2 2/2 3/3 |
| CNPA | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 3/3 2/2 2/2 2/2 2/2 1/1 |
| CNPE | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 3/3 2/2 2/2 2/2 |
| NREMTEMT | 2 | 5 | 10 | 10 | 0 | 10 | 0 | 2/2 3/3 1/1 2/2 2/2 |
| NREMTEMR | 3 | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 3/3 2/2 2/2 2/2 |
| NREMTPARAMEDIC | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 1/1 2/2 2/2 3/3 |
| NREMTAEMT | 3 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 1/1 3/3 1/1 3/3 |
| EPPP | 3 | 8 | 14 | 14 | 0 | 14 | 0 | 1/1 2/2 2/2 2/2 2/2 2/2 1/1 2/2 |
| NCE | 2 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 3/3 1/1 3/3 1/1 |
| NCMHCE | 2 | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| PYAUTO | 3* | 10 | 16 | 16 | 0 | 16 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 1/1 1/1 1/1 |
| PYDATA | 3* | 9 | 14 | 15 | 1 | 14 | 1 | 2/2 2/2 2/2 2/2 2/2 1/2 1/1 1/1 1/1 |
| LINUXFUND | 3* | 10 | 16 | 16 | 0 | 16 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 1/1 1/1 1/1 |
| LFCS | 3* | 5 | 11 | 11 | 0 | 11 | 0 | 3/3 2/2 2/2 2/2 2/2 |
| PCEP | 3* | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 2/2 3/3 2/2 2/2 |
| PCAP | 3* | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 1/1 3/3 2/2 2/2 |
| SQL | 3* | 8 | 14 | 14 | 0 | 14 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 1/1 |
| TSNODE | 3* | 7 | 13 | 13 | 0 | 13 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 1/1 |
| PL300 | 3* | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| SC500 | 3* | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| AI200 | 3* | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| ISC2CC | 3* | 5 | 11 | 11 | 0 | 11 | 0 | 3/3 2/2 2/2 2/2 2/2 |
| CISSP | 3* | 8 | 14 | 14 | 0 | 14 | 0 | 2/2 1/1 2/2 2/2 2/2 2/2 2/2 1/1 |
| CISM | 3* | 4 | 10 | 10 | 0 | 10 | 0 | 2/2 2/2 3/3 3/3 |
| CEH | 3* | 9 | 15 | 15 | 0 | 15 | 0 | 1/1 2/2 2/2 3/3 2/2 1/1 2/2 1/1 1/1 |
| CMSRN | 3* | 5 | 11 | 11 | 0 | 11 | 0 | 3/3 2/2 2/2 2/2 2/2 |
| CEN | 3* | 11 | 17 | 17 | 0 | 17 | 0 | 2/2 2/2 2/2 2/2 1/1 2/2 2/2 1/1 1/1 1/1 1/1 |
| PCCN | 3* | 12 | 18 | 18 | 0 | 18 | 0 | 2/2 2/2 1/1 1/1 2/2 1/1 1/1 1/1 2/2 1/1 2/2 2/2 |
| FNPAANP | 3* | 4 | 10 | 10 | 0 | 10 | 0 | 3/3 3/3 2/2 2/2 |
| FNPANCC | 3* | 5 | 11 | 11 | 0 | 11 | 0 | 2/2 2/2 2/2 3/3 2/2 |
| PSMI | 3* | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| CSM | 3* | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 3/3 2/2 1/1 2/2 |
| ITIL5FND | 3* | 7 | 13 | 13 | 0 | 13 | 0 | 3/3 2/2 2/2 3/3 1/1 1/1 1/1 |
| CSSGB | 3* | 6 | 12 | 12 | 0 | 12 | 0 | 2/2 2/2 2/2 2/2 2/2 2/2 |
| ASWBCLINICAL | 3* | 3 | 9 | 9 | 0 | 9 | 0 | 3/3 3/3 3/3 |
| ASWBMASTERS | 3* | 3 | 9 | 9 | 0 | 9 | 0 | 3/3 3/3 3/3 |
| WAPSYCHJP | 3* | 6 | 9 | 12 | 3 | 9 | 3 | 1/2 1/2 3/3 2/2 1/2 1/1 |

## Courses still short of the rule

- PYDATA: 1 lab short (unit 6).
- WAPSYCHJP: 3 labs short (units 1, 2 and 5).

Both arrived with checkpoint #193 on 2026-11-16, after this fill was measured, and are being built by other builders, so this fill left them to their owners rather than edit their lab files at the same time. The twelve clinical, physical therapy and fitness courses listed here on 2026-11-14 (BSN-RN, NPTE-PTA, six ABPTS specialist courses, ACE, ACSM, NSCA-CSCS and NCCPT) were filled on 2026-11-14 to 2026-11-16 once their sources could be read.

## How to re-measure

`lib/labs-density-fill.test.ts` checks every filled course against the rule (its `ruleFor`). To re-measure the whole catalog, compare `apportion(6, unit weights)` from scripts/generate-labs-lib.ts, capped as above, with the labs per active unit in `LAB_SETS` (supabase/seed/labs).

