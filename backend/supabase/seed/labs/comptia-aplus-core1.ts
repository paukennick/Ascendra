import { GENERAL_SAFETY, part, matchPart, numericPart, orderPart, selectPart, commandPart, type SeedLabSet } from "./types";
import { source } from "../sources";

// REQ-234: CompTIA A+ Core 1 (220-1201, V15).
//
// Aligned to CompTIA's own exam objectives document for 220-1201 V15
// ("Exam Objectives Document Version 4.0", downloaded from CompTIA's file
// host and read in full on 2026-11-11): Mobile Devices 13%, Networking 23%,
// Hardware 25%, Virtualization and Cloud Computing 11%, Hardware and Network
// Troubleshooting 28%. CompTIA's 220-1202 page (read the same day) still
// lists V15 as current, launched 2025-03-25, retirement estimated 2028, no
// successor announced.
//   https://lecbyo.files.cmp.optimizely.com/download/34be017cb73211ef8985a6f347fbf652
//   https://www.comptia.org/en-us/certifications/a/core-1-v15/
// The objectives document says the troubleshooting methodology is a
// "competency standard" that is NOT itself tested on V15, so no lab here
// targets the methodology objective; the case labs still walk it, because
// the scenario items expect a technician to work that way.
//
// Density (docs/labs.md, policy "hybrid"): 2 / 2 / 2 / 1 / 3 = 10.
// Values each lab quotes as a standard (RFC 1918 private ranges, RFC 3927
// link-local addresses, the ATX 3 output-voltage limits, the 2.4 GHz
// channel plan, the port numbers in CompTIA's own objectives) are sourced
// per lab in value-sources.ts. Every organization and person is fictional;
// addresses are from the private and documentation ranges.

export const APLUS_CORE1_LABS: SeedLabSet = {
  trackCode: "APLUS_CORE1",
  sources: [
    source("https://lecbyo.files.cmp.optimizely.com/download/34be017cb73211ef8985a6f347fbf652", "exam_outline", "2026-11-11"),
    source("https://www.comptia.org/en-us/certifications/a/core-1-v15/", "exam_outline", "2026-11-11"),
  ],
  labs: [
    // -----------------------------------------------------------------------
    // Mobile Devices (13%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "aplus1-laptop-upgrade-parts",
      objective: "Upgrading laptop internal components: SODIMM RAM and M.2/NVMe storage, respecting compatibility",
      kind: "build",
      title: "Pick the memory and SSD that fit a laptop upgrade",
      brief:
        "Fernhill Surveying, a fictional firm, wants to extend the life of its field laptops. The service manual for the model says: two SODIMM slots, DDR5 only, up to 32 GB per slot, dual channel when both slots hold matching modules; one M.2 2280 slot keyed M, PCIe 4.0 x4 NVMe, no SATA support in that slot. Each laptop now has one 8 GB DDR5 SODIMM and a 256 GB NVMe SSD. The engineers want 32 GB of RAM and 1 TB of storage. The parts drawer holds: two 16 GB DDR4 SODIMMs; two 16 GB DDR5 SODIMMs (matching kit); one 32 GB DDR5 DIMM (desktop); a 1 TB M.2 2280 SATA SSD (B+M key); a 1 TB M.2 2280 NVMe PCIe 4.0 SSD (M key); a 1 TB M.2 2242 NVMe SSD. The laptops hold client data, and the battery is internal.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Choose the parts, explain what rules out the others, and write the steps for doing the upgrade safely without losing the user's data.",
          parts: [
            part(
              "Memory choice",
              "Chooses the matching pair of 16 GB DDR5 SODIMMs (replacing the 8 GB module) for 32 GB in dual channel, and rules out the DDR4 SODIMMs (wrong generation, keyed differently, will not fit or work) and the 32 GB DDR5 DIMM (desktop form factor, does not fit a SODIMM slot). Notes that one 8 GB plus one 16 GB would be 24 GB and not a matched pair.",
              "Install the two 16 GB DDR5 SODIMMs as a matched kit and remove the 8 GB module: 32 GB in dual channel, as the manual describes. The DDR4 SODIMMs are a different generation with a different key notch, so they will not seat in a DDR5 slot. The 32 GB DDR5 DIMM is a desktop module: a DIMM is longer than a SODIMM and does not fit a laptop slot. Keeping the 8 GB with one 16 GB would give 24 GB and a mismatched pair."
            ),
            part(
              "Storage choice",
              "Chooses the 1 TB M.2 2280 NVMe PCIe SSD (M key), and rules out the SATA M.2 drive (the manual says the slot has no SATA support, even though the B+M key physically fits) and the 2242 drive (the wrong length for a 2280 standoff, unless the manual allowed it, which it does not mention).",
              "The 1 TB M.2 2280 NVMe PCIe 4.0 SSD, M key: it matches the slot's length (2280 = 22 mm wide, 80 mm long), key and protocol. The M.2 SATA SSD is the trap: a B+M key fits physically in an M-key slot, but this slot carries only PCIe NVMe, so the drive would not be detected. The 2242 drive is 42 mm long and would not reach the 2280 mounting standoff."
            ),
            part(
              "Upgrade procedure",
              "Backs up or clones the user's data before the swap (for example clone the 256 GB SSD to the new drive with a USB M.2 enclosure, or back up and reinstall), shuts down fully and disconnects the internal battery as the manual directs, uses ESD protection, installs the parts, then verifies in UEFI/the OS that 32 GB and the 1 TB drive are seen, and handles the old drive per data-handling policy because it holds client data.",
              "1) Back up the user's data and confirm the backup, then clone the old SSD to the new one in a USB M.2 enclosure (or plan a fresh image plus restore). 2) Shut down fully (not sleep), unplug AC, open the base and disconnect the internal battery connector as the service manual directs. 3) Wear an ESD strap or work on an ESD mat; handle modules by the edges. 4) Swap the SODIMMs and the M.2 drive, secure the drive screw. 5) Reconnect the battery, boot to UEFI: confirm 32 GB and the NVMe drive, and that it is the boot device. 6) In the OS confirm capacity (extend the partition if the clone did not) and that the user's files open. 7) The old SSD holds client data: wipe or destroy it per policy, or keep it labeled as a rollback copy for a set period."
            ),
          ],
        },
      ],
    },
    {
      slug: "aplus1-field-phone-connectivity",
      objective: "Configuring mobile device network connectivity: Wi-Fi, cellular data, Bluetooth tethering/hotspot, and airplane mode",
      kind: "case",
      title: "Get a field engineer's phone and laptop online",
      brief:
        "Tomas, a field engineer at the fictional Brightwater Utilities, has a new company phone with an eSIM, enrolled in the company's mobile device management (MDM) as a corporate device. He works at pump stations with no Wi-Fi and needs his laptop online through the phone, plus a Bluetooth headset for calls while driving. His plan has a 20 GB monthly data cap. He calls the help desk from a station: 'The phone says No Service, and I can't get the laptop online.'",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "You ask him to read the status bar: an airplane icon is showing, Wi-Fi is off, and Bluetooth is off. He says he turned something on during his flight yesterday.",
          ask: "What do you have him change first, and what do you check next if the phone still shows No Service?",
          parts: [
            part(
              "First change",
              "Has him turn airplane mode off (it disables the cellular radio, and by default Wi-Fi and Bluetooth), then confirms signal bars and the carrier name return.",
              "Turn airplane mode off. It switches off the cellular radio (and Wi-Fi and Bluetooth unless re-enabled), which is exactly 'No Service' after a flight. Within a minute he should see the carrier name and signal bars."
            ),
            part(
              "If there is still no service",
              "Checks that the eSIM line is enabled and selected for cellular data in settings, that cellular data is on (and data roaming if the carrier requires it there), restarts the phone, and only then suspects coverage or the carrier (for example, checks another phone at the same site or calls the carrier).",
              "Open the cellular settings: is the eSIM line turned on and chosen for cellular data, and is cellular data enabled? Restart the phone so it re-registers. If it still has no service, test coverage (another company phone at the station) before escalating to the carrier with the line number; an eSIM that was never activated is a carrier task."
            ),
          ],
        },
        {
          text: "The phone now shows four bars of 5G. Tomas turns on the personal hotspot, but the laptop does not see it in the Wi-Fi list. The MDM console shows a policy 'Hotspot: allowed' for his group and that the phone is compliant. His headset will not pair either: the phone does not list it.",
          ask: "Get the laptop online through the phone and pair the headset.",
          parts: [
            part(
              "Hotspot or tethering",
              "Turns the laptop's Wi-Fi on (it may be off or in airplane mode too), makes the phone's hotspot discoverable by staying on its hotspot screen, connects with the hotspot password; offers USB tethering or Bluetooth tethering as alternatives if Wi-Fi still fails, and tests by browsing.",
              "Check the laptop first: Wi-Fi on, not in airplane mode. Keep the phone on its hotspot settings screen (many phones only advertise while it is open, or turn on the 'maximize compatibility'/2.4 GHz option if the laptop's adapter is older), then join the network with the shown password. Alternatives if Wi-Fi will not work: USB tethering with the charging cable, or Bluetooth tethering. Test by loading a company site."
            ),
            part(
              "Headset pairing",
              "Turns Bluetooth on, puts the headset into pairing mode (it is not discoverable otherwise), finds it on the phone, enters or confirms the PIN code if asked (often 0000 per the headset's manual), and tests a call.",
              "Turn Bluetooth on (airplane mode switched it off), then put the headset in pairing mode per its manual (usually a long press until the light flashes). Select it on the phone; if a PIN is requested, enter the one in the headset's manual. Test with a short call."
            ),
          ],
        },
        {
          text: "Two weeks later the MDM sends Tomas a warning that he has used 17 GB of his 20 GB data cap. He uses the hotspot every day and the laptop syncs a large shared folder and installs OS updates when it is online.",
          ask: "What do you change so he stays under the cap without losing what he needs?",
          parts: [
            part(
              "Protect the data cap",
              "Has the laptop treat the hotspot as a metered connection (so updates and sync wait), pauses or limits large folder sync and updates until he is on office Wi-Fi, sets a data warning/limit on the phone, uses Wi-Fi in the office or depot where available, and explains to Tomas what was changed.",
              "On the laptop, mark the phone's hotspot as a metered connection so OS updates and the shared-folder sync defer large downloads; set the sync client to sync only the folders he needs in the field. On the phone, set a data warning below the cap. Ask Tomas to let the laptop update and sync on depot Wi-Fi. If his work truly needs more, raise a request for a bigger plan rather than disabling updates."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Networking (23%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "aplus1-soho-router-setup",
      objective: "Configuring a SOHO network: static vs. DHCP addressing, NAT, firewall rules, and port forwarding",
      kind: "build",
      title: "Set up the router for a three-person dental office",
      brief:
        "Lakeside Dental, a fictional practice, has a new SOHO router whose LAN interface is 192.168.10.1/24 and whose WAN port gets one public address from the ISP. On the LAN: six staff PCs and laptops, a network printer, a network video recorder (NVR) for the door cameras, and a small file server holding the scheduling database. The owner wants: the printer and file server always at the same address; everything else automatic; the cameras viewable from her phone when she is away; staff able to reach the file server from home; and nothing else open from the internet. A technician previously set a PC by hand to 192.168.10.1 'because it was free', and a laptop shows the address 169.254.37.12.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Write the addressing plan, the NAT and inbound rules, and explain the two addresses the technician saw.",
          parts: [
            part(
              "Addressing plan",
              "Sets a DHCP scope on 192.168.10.0/24 that excludes the router and a static/reserved block (for example pool .100-.199), gives the printer and file server either DHCP reservations or static addresses outside the pool, hands out the router as gateway and DNS, and notes that 192.168.10.0/24 is RFC 1918 private space.",
              "Router 192.168.10.1. DHCP pool 192.168.10.100-192.168.10.199, mask 255.255.255.0, gateway and DNS 192.168.10.1. Printer: reservation 192.168.10.20 (tied to its MAC). File server: static 192.168.10.10, outside the pool (or a reservation). NVR: reservation 192.168.10.30, because a port forward needs a fixed target. All of 192.168.10.0/24 is private (RFC 1918), so the router's NAT translates it to the one public address."
            ),
            matchPart(
              "Ports for the services involved",
              "All five right is met; three or four is partly there. The ports are those listed in CompTIA's objectives.",
              "HTTPS is TCP 443, RDP is TCP 3389, SMB file sharing is TCP 445, DNS is port 53 and SSH is TCP 22. Telnet (23) is not used here.",
              {
                leftHeading: "Service",
                rightHeading: "Port",
                left: ["HTTPS (a web interface)", "Remote Desktop Protocol", "SMB file sharing", "DNS lookups", "SSH"],
                right: ["443", "3389", "445", "53", "22", "23"],
                pairs: [0, 1, 2, 3, 4],
              }
            ),
            part(
              "Inbound rules and remote access",
              "Does NOT forward SMB (445) or RDP (3389) to the file server from the internet; instead gives staff a VPN (on the router or a remote-access service) and lets the owner view cameras through the NVR vendor's cloud app or a single HTTPS port forward to the NVR's reserved address; everything else inbound stays denied by the router's default; changes the router's admin password and disables UPnP so devices cannot open ports themselves.",
              "Default: deny all unsolicited inbound traffic (NAT already drops it). Staff from home: a VPN to the router, then they reach \\\\192.168.10.10 as if in the office; never forward 445 or 3389 to the internet, both are heavily attacked. Cameras: use the NVR vendor's cloud viewing app, or forward one HTTPS port (443 or a custom external port) only to 192.168.10.30 and keep the NVR firmware updated. Also change the router's default admin password, update its firmware and turn off UPnP."
            ),
            part(
              "The two odd addresses",
              "Explains that 192.168.10.1 is the router's own address, so the hand-set PC causes an IP conflict that can take the whole office offline, and fixes it by returning the PC to DHCP; and that 169.254.37.12 is an APIPA (link-local, 169.254.0.0/16) address, meaning the laptop got no DHCP reply, so it should check the cable or Wi-Fi association and the DHCP service, then renew.",
              "192.168.10.1 is the router's LAN address. A PC set to the same address creates an IP conflict, and other devices may send their internet traffic to the PC instead of the router. Set the PC back to obtain an address automatically. 169.254.37.12 is an APIPA, link-local address (169.254.0.0/16): Windows assigns one when no DHCP server answers. The laptop is not getting a lease: check that it is really connected (cable or Wi-Fi), that the router's DHCP is on and the pool is not exhausted, then run ipconfig /renew."
            ),
          ],
        },
      ],
    },
    {
      slug: "aplus1-cli-no-internet",
      objective: "Interpreting command-line network diagnostics: ipconfig/ifconfig, ping, tracert, and nslookup",
      kind: "case",
      title: "Read the command output for a PC that cannot browse",
      brief:
        "At the fictional Orchard Lane Library, a public-access Windows PC on the wired LAN 192.168.40.0/24 (gateway and DHCP server 192.168.40.1, DNS handed out by DHCP as 192.168.40.1) shows 'No internet' and no website opens. The other public PCs are fine. You open a command prompt on it.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text:
            "C:\\> ipconfig /all\n\nEthernet adapter Ethernet:\n   DHCP Enabled. . . . . . . . . . . : Yes\n   Autoconfiguration IPv4 Address. . : 169.254.112.9(Preferred)\n   Subnet Mask . . . . . . . . . . . : 255.255.0.0\n   Default Gateway . . . . . . . . . :\n   DNS Servers . . . . . . . . . . . : fec0:0:0:ffff::1%1",
          ask: "What does this output tell you, and what do you do next?",
          parts: [
            part(
              "Reading ipconfig",
              "Recognizes the 169.254.x.x Autoconfiguration (APIPA, link-local) address with no gateway as 'DHCP did not answer', so the PC can only talk to its own link; it is not a DNS or website problem yet.",
              "DHCP is enabled but the PC has an Autoconfiguration (APIPA) address, 169.254.112.9/16, and no default gateway. Windows assigns that link-local address when no DHCP server answers. The PC cannot leave its own segment, so 'No internet' is expected; DNS and websites are not the problem yet."
            ),
            part(
              "Next checks",
              "Checks the physical layer first (cable seated, link light on the NIC and switch port, try another port or cable), then asks for a new lease, and only then suspects the DHCP server (others still work, so it is unlikely).",
              "Look at the NIC and switch port link lights, reseat or swap the patch cable, try a known-good wall port. Then request a lease again. Because the other PCs get addresses, the DHCP server is probably fine; this points at this PC's cable, port or adapter."
            ),
            commandPart(
              "Command to request a new lease",
              "ipconfig /renew (after fixing the cable) is met.",
              "Run ipconfig /renew to ask the DHCP server for a new lease once the link is up.",
              { accepted: ["ipconfig /renew"], prompt: "C:\\>", ignoreCase: true }
            ),
          ],
        },
        {
          text:
            "The patch cable was half out of the wall jack. After reseating it and renewing:\n\nC:\\> ipconfig\n   IPv4 Address. . . . . . . . . . . : 192.168.40.57\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 192.168.40.1\n\nC:\\> ping 192.168.40.1\nReply from 192.168.40.1: bytes=32 time<1ms TTL=64 (4 of 4)\n\nC:\\> ping 203.0.113.10\nReply from 203.0.113.10: bytes=32 time=21ms TTL=55 (4 of 4)\n\nC:\\> nslookup www.example.com\nDNS request timed out.\n    timeout was 2 seconds.\nServer:  UnKnown\nAddress:  192.168.40.250\n\nWebsites still do not open. 203.0.113.10 is the library ISP's test server.",
          ask: "Where is the fault now, and how do you fix it?",
          parts: [
            selectPart(
              "The line that shows the fault",
              "Selects the nslookup Address line showing the PC is asking 192.168.40.250, not the DHCP-provided 192.168.40.1. Selecting the timeout line as well is fine; selecting the gateway or ping lines is not.",
              "The PC reaches the gateway and the internet by address, so routing works. nslookup shows it is asking 192.168.40.250 for names, and that server does not answer. DHCP hands out 192.168.40.1, so someone set a DNS server by hand.",
              {
                display: "log",
                lines: [
                  "IPv4 Address . . : 192.168.40.57",
                  "Default Gateway . . : 192.168.40.1",
                  "Reply from 192.168.40.1: time<1ms",
                  "Reply from 203.0.113.10: time=21ms",
                  "DNS request timed out.",
                  "Address:  192.168.40.250",
                ],
                correct: [4, 5],
              }
            ),
            part(
              "Fix and verify",
              "Sets the adapter's DNS back to 'obtain DNS server address automatically' (removing the static 192.168.40.250), flushes the resolver cache, verifies with nslookup and by opening sites, and checks whether a policy or image put the static DNS there.",
              "In the adapter's IPv4 properties, choose 'Obtain DNS server address automatically' so it uses 192.168.40.1 from DHCP. Run ipconfig /flushdns, then nslookup www.example.com should answer from 192.168.40.1, and websites open. Check the PC's image or setup notes: if a stale DNS setting came from there, fix the image so the next rebuild is right."
            ),
          ],
        },
        {
          text:
            "Browsing works. A patron says one particular site is 'very slow'. You run:\n\nC:\\> tracert -d 198.51.100.80\n  1    <1 ms   <1 ms   <1 ms  192.168.40.1\n  2     8 ms    7 ms    9 ms  203.0.113.1\n  3     9 ms   10 ms    9 ms  203.0.113.65\n  4   180 ms  175 ms  182 ms  198.51.100.1\n  5   181 ms  179 ms  183 ms  198.51.100.80",
          ask: "Interpret the trace and say what you would document and tell the patron.",
          parts: [
            part(
              "Interpreting tracert",
              "Sees that latency is low through the library's router and the ISP (hops 1-3) and jumps at hop 4 and stays high to the destination, so the delay is beyond the library's network (on the path to or at the remote site), not the PC or LAN; notes that one high hop that recovers later would not mean the same thing.",
              "Hops 1-3 (the library router and the ISP) answer in under 10 ms. The jump to about 180 ms starts at hop 4 and persists to the destination, so the delay is on the far side of the ISP, near the remote site's network. The PC and the library LAN are not the cause. (If only one middle hop were slow and later hops fast, that would just be a router slow to answer pings.)"
            ),
            part(
              "Document and communicate",
              "Records the original fault (loose cable, APIPA), the second fault (static DNS 192.168.40.250, reset to DHCP), the trace result and time, and tells the patron plainly that the slow site is outside the library's control.",
              "Ticket: 'PC-07: APIPA address from a half-seated patch cable, reseated and renewed. Static DNS 192.168.40.250 found and reset to automatic; verified browsing. Slow site 198.51.100.80: tracert shows latency added beyond the ISP at hop 4 (about 180 ms), outside our network.' To the patron: 'Your PC is fixed. That one site is slow somewhere on the internet between us and them, so there's nothing we can change here.'"
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Hardware (25%) -- 2 labs
    // -----------------------------------------------------------------------
    {
      slug: "aplus1-psu-and-cooling",
      objective: "Selecting a power supply by wattage and connector type, and choosing appropriate cooling for a build",
      kind: "build",
      title: "Size the power supply and cooling for a video workstation",
      brief:
        "Kestrel Media, a fictional studio, orders a video-editing workstation. The parts' spec sheets give maximum power draw: CPU 170 W; graphics card 285 W (it has one 12V-2x6 power connector and its box says it also ships with an adapter for three 8-pin PCIe cables); motherboard and memory 60 W; two NVMe SSDs 8 W each; five case fans and a pump 25 W in total; USB devices 20 W. The CPU needs one 8-pin EPS 12 V connector; the motherboard has a 24-pin (20+4) main connector. The shop's build policy: the estimated maximum load may be at most 70% of the power supply's rating, and the unit must be ATX 3 with a native 12V-2x6 cable. In stock: 550 W, 750 W, 850 W and 1000 W ATX 3 units, all 80 PLUS Gold, all with auto-ranging 100-240 VAC input. The workstation sits in a small, warm editing room.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Calculate the load, choose the power supply and its cables, and choose the cooling.",
          parts: [
            numericPart(
              "Estimated maximum load",
              "576 W (170 + 285 + 60 + 16 + 25 + 20) is met; within about 30 W is partly there.",
              "170 + 285 + 60 + (2 x 8 = 16) + 25 + 20 = 576 W estimated maximum load.",
              { answer: 576, tolerance: 2, partialTolerance: 30, unit: "W" }
            ),
            part(
              "Power supply and connectors",
              "Divides the load by 0.70 (about 823 W) and chooses the 850 W unit (750 W would put the load at about 77%, over policy; 1000 W also meets policy but is not needed), and lists the cables: 24-pin main (20+4), 8-pin EPS for the CPU, the native 12V-2x6 for the graphics card rather than the adapter, and power for the drives and fans from the motherboard headers or SATA; notes the auto-ranging input means no voltage switch for 120 V or 230 V outlets.",
              "576 / 0.70 = about 823 W, so the 850 W unit is the smallest that meets the 70% policy (750 W would run at 576/750 = 77%). Cables: the 24-pin (20+4) main connector to the motherboard; the 8-pin EPS 12 V to the CPU; the native 12V-2x6 cable to the graphics card (rated for up to 600 W, so no need for the three-way 8-pin adapter, each 8-pin PCIe being rated 150 W); the NVMe drives draw from the M.2 slots; fans and pump from motherboard headers or a SATA-powered hub. Input is auto-ranging 100-240 VAC, so it works on 120 V or 230 V outlets without a switch."
            ),
            part(
              "Cooling",
              "Chooses CPU cooling sized for a 170 W processor (a large tower air cooler or a 240/280/360 mm liquid cooler, with fresh thermal paste or the pre-applied pad), front-to-back case airflow with intake and exhaust balanced, and allows for the warm room (dust filters, monitoring temperatures in UEFI or software after a stress test).",
              "A 170 W CPU needs a high-end cooler: a large dual-tower air cooler or a 280/360 mm all-in-one liquid cooler, mounted with thermal paste (or its pre-applied pad). Case: front intake and rear/top exhaust so air moves front to back past the graphics card; keep dust filters on, because the room is warm. After the build, run a stress test and watch CPU and GPU temperatures in UEFI or monitoring software; if they throttle, add airflow or move the machine out of the cabinet."
            ),
          ],
        },
      ],
    },
    {
      slug: "aplus1-raid-by-use-case",
      objective: "Installing and configuring storage devices: SATA and NVMe SSDs, HDDs, and RAID levels by use case",
      kind: "build",
      title: "Choose the drives and RAID level for three machines",
      brief:
        "Harrow Architects, a fictional firm, is buying storage for three machines. (1) A small file server for project files: four 8 TB 7,200 rpm SATA hard drives in a 4-bay chassis; the owner wants the most usable space that still survives one drive failing. (2) A database server: four 2 TB SAS SSDs; the database vendor says to favor write performance and survive a drive failure, and the owner accepts losing half the raw space. (3) A rendering workstation: two 2 TB NVMe SSDs used only as scratch space that is rebuilt from the file server every morning; speed is all that matters.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "",
          ask: "Pick a RAID level for each machine, give the usable capacity, and say what RAID does not protect against.",
          parts: [
            matchPart(
              "RAID level for each machine",
              "(1) RAID 5, (2) RAID 10, (3) RAID 0. RAID 1 and RAID 6 are distractors here. All three right is met; two is partly there.",
              "File server: RAID 5 (most usable space that survives one failure). Database: RAID 10 (striped mirrors, good writes, survives a failure, half the raw space). Scratch: RAID 0 (striping for speed, no redundancy needed because the data is rebuilt daily).",
              {
                leftHeading: "Machine",
                rightHeading: "RAID level",
                left: ["(1) File server, four 8 TB HDDs", "(2) Database server, four 2 TB SSDs", "(3) Rendering scratch, two 2 TB NVMe"],
                right: ["RAID 5", "RAID 10", "RAID 0", "RAID 1", "RAID 6"],
                pairs: [0, 1, 2],
              }
            ),
            numericPart(
              "Usable capacity of the file server",
              "24 TB (four 8 TB drives in RAID 5, one drive's worth of parity) is met; within 6 TB is partly there.",
              "RAID 5 uses one drive's worth of space for parity: (4 - 1) x 8 TB = 24 TB usable. (RAID 6 would give 16 TB and survive two failures; RAID 10 would also give 16 TB.)",
              { answer: 24, tolerance: 0.5, partialTolerance: 6, unit: "TB" }
            ),
            part(
              "Capacities and trade-offs",
              "States database RAID 10 = 4 TB usable (half of 8 TB raw) and scratch RAID 0 = 4 TB (all of it), and names RAID 6 as the safer choice for large HDDs because a second failure during a long RAID 5 rebuild loses the array.",
              "Database: RAID 10 across four 2 TB SSDs = 4 TB usable (half of the 8 TB raw), survives one failure (and possibly a second in the other mirror), and has no parity to compute on writes. Scratch: RAID 0 across two 2 TB = 4 TB, fastest, but one failure loses everything, which is acceptable only because it is rebuilt daily. Trade-off on the file server: rebuilding an 8 TB drive in RAID 5 takes many hours under load; if a second drive fails then, the array is lost. RAID 6 (16 TB usable) survives two failures and is worth considering."
            ),
            part(
              "What RAID does not do",
              "States that RAID is not a backup: it does not protect against deletion, ransomware, corruption, controller failure, theft or fire, so the file server and database still need separate (ideally offsite) backups.",
              "RAID keeps a machine running through a drive failure; it is not a backup. A deleted file, ransomware, a corrupted database or a failed controller affects every drive in the array at once, and fire or theft takes the whole box. Back up the file server and the database separately, with a copy off site."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Virtualization and Cloud Computing (11%) -- 1 lab
    // -----------------------------------------------------------------------
    {
      slug: "aplus1-vm-wont-start",
      objective: "Configuring and troubleshooting resource allocation for a client-side virtual machine",
      kind: "case",
      title: "Fix a developer's virtual machine that will not start",
      brief:
        "Priya, a developer at the fictional Saltmarsh Software, has a laptop with an 8-core CPU, 16 GB of RAM and a 512 GB SSD with 60 GB free. She installed a type 2 hypervisor to run a Linux test server alongside Windows, and created a VM with 8 virtual CPUs, 14 GB of RAM and a 100 GB fixed-size virtual disk. It will not start.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The hypervisor's error says: 'Hardware virtualization (VT-x/AMD-V) is not available.' Task Manager's Performance tab on the host shows 'Virtualization: Disabled'.",
          ask: "What is wrong, and how do you fix it?",
          parts: [
            part(
              "Cause and fix",
              "Identifies that CPU virtualization support is turned off in the UEFI/BIOS settings and enables it there (Intel VT-x or AMD-V/SVM), then confirms Task Manager shows 'Virtualization: Enabled'.",
              "The CPU's virtualization extensions are disabled in firmware. Reboot into UEFI setup, enable Intel Virtualization Technology (VT-x) or AMD SVM/AMD-V, save and boot. Task Manager's Performance > CPU page should then show 'Virtualization: Enabled'."
            ),
          ],
        },
        {
          text: "Virtualization is now enabled. The VM still fails: 'Not enough memory to start the virtual machine', and before that the hypervisor warned that the virtual disk could not be created: not enough free space.",
          ask: "Reallocate the VM's resources so both the host and the VM run well.",
          parts: [
            part(
              "Memory and CPU",
              "Leaves enough RAM for the host (for example gives the VM 4-8 GB of the 16 GB, not 14) and fewer vCPUs than physical cores (for example 2-4 of 8), explaining that the host OS and the type 2 hypervisor run on top and need their own resources.",
              "A type 2 hypervisor runs on top of Windows, so Windows needs its own memory and CPU. Give the VM 6 GB of RAM (leaving about 10 GB for Windows and her tools) and 4 vCPUs of the 8 cores. A Linux test server rarely needs more; raise it later if monitoring shows pressure."
            ),
            part(
              "Disk",
              "Uses a dynamically allocated (thin) virtual disk or a smaller fixed disk that fits in the 60 GB free while leaving the host space to work, and/or frees space on the host first.",
              "A 100 GB fixed disk needs 100 GB now and she has 60 GB free. Create a dynamically allocated disk (it grows as used) with a sensible maximum such as 40 GB, or free space on the host first. Keep at least some headroom for Windows updates and swap."
            ),
          ],
        },
        {
          text: "The VM runs. Priya needs other developers on the office LAN to reach the test server's web page, but the VM got an address 10.0.2.15 that nobody else can reach, while the laptop is 192.168.20.44.",
          ask: "Explain why and change the VM's network so colleagues can reach it, keeping it safe.",
          parts: [
            part(
              "Network mode",
              "Explains the VM is on the hypervisor's NAT network (private address behind the host, reachable outbound only) and switches it to bridged mode so it gets its own LAN address (or sets a port forward on the NAT), and secures it (host-based firewall on the VM, only the web port open, patched, no sensitive data) since the VM is now a device on the office network.",
              "The VM is on the hypervisor's NAT network: it can reach out through the host, but 10.0.2.15 is private to the laptop and nothing on the LAN can reach it. Switch the VM's adapter to bridged mode so it gets its own address on 192.168.20.0/24 from the office DHCP (or add a NAT port forward from the host's port to the VM's web port). Once bridged it is a real device on the network: patch it, enable its firewall with only the web port open, and keep real customer data off it."
            ),
          ],
        },
      ],
    },
    // -----------------------------------------------------------------------
    // Hardware and Network Troubleshooting (28%) -- 3 labs
    // -----------------------------------------------------------------------
    {
      slug: "aplus1-random-shutdowns-psu",
      objective: "Troubleshooting motherboard, CPU, and power issues using diagnostic tools and POST error codes",
      kind: "case",
      title: "Find why a desktop shuts down under load",
      brief:
        "A three-year-old desktop at the fictional Granite Ridge Insurance office turns itself off without warning, usually when the user exports large reports. Nothing appears on screen before it goes off; it powers back on normally. The user mentions a faint burning smell last week. The PC has a 500 W ATX power supply, and a graphics card was added last month.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The event log shows 'The system has rebooted without cleanly shutting down first' (Kernel-Power) at each shutdown, with no blue screen recorded. CPU temperature in the UEFI hardware monitor is 48 C at idle.",
          ask: "List your theories in order of likelihood and what you will test first.",
          parts: [
            part(
              "Theories of probable cause",
              "Puts the power supply first (sudden power-off under load, a new graphics card adding load, burning smell), then overheating under load and failing motherboard power components (swollen capacitors), and treats software as unlikely because there is no crash screen.",
              "1) The power supply can no longer carry the load since the graphics card was added, or is failing (sudden off with no crash screen, burning smell). 2) Overheating under load (idle 48 C says little; need a load reading). 3) Motherboard voltage regulation: look for swollen or leaking capacitors near the CPU socket. A software fault usually leaves a blue screen or an application error, which there is not."
            ),
            part(
              "First tests",
              "Unplugs and inspects inside for burn marks, swollen capacitors and dust; checks temperatures under a load test; measures power supply voltages with a multimeter or PSU tester under load, staying out of the power supply itself.",
              "With the PC unplugged and an ESD strap on, inspect: scorch marks or a smell at the PSU, swollen capacitors on the board, dust-blocked heatsinks. Then run a load (the report export or a stress test) while watching temperatures, and measure the PSU's outputs at the connectors with a multimeter or PSU tester. Never open the power supply's case: its capacitors can hold a dangerous charge."
            ),
          ],
        },
        {
          text:
            "No swollen capacitors; heatsinks are clean; CPU reaches 71 C under load and the PC shuts down a minute into the stress test. Your multimeter readings at the connectors, at idle and just before shutdown:",
          ask: "Select the out-of-specification readings.",
          parts: [
            selectPart(
              "Out-of-specification readings",
              "Selects the +12 V reading under load (10.9 V is below the ATX 3 minimum of 11.20 V) and the +5 V reading under load (4.61 V is below 4.75 V). Selecting an in-range reading is a miss.",
              "ATX 3 design limits (Intel ATX Version 3 power supply design guide, Table 4-2): +12 V from 11.20 to 12.60 V; +5 V and +3.3 V within 5% (4.75-5.25 V and 3.14-3.47 V). Under load the +12 V rail sags to 10.9 V and the +5 V to 4.61 V, both out of range; the idle readings and the 3.3 V readings are fine.",
              {
                display: "table",
                header: "Rail and condition | Reading",
                lines: ["+12 V at idle | 12.08 V", "+12 V under load | 10.90 V", "+5 V at idle | 5.02 V", "+5 V under load | 4.61 V", "+3.3 V at idle | 3.31 V", "+3.3 V under load | 3.28 V"],
                correct: [1, 3],
              }
            ),
            part(
              "Conclusion",
              "Concludes the power supply cannot hold its outputs under load (sagging rails trigger the shutdown), likely overloaded by the added graphics card or aging, while 71 C is a normal load temperature and not the cause.",
              "The rails collapse under load, so the power supply is the cause: undersized for the new graphics card, worn out, or both. 71 C under load is normal for a desktop CPU and not a thermal shutdown."
            ),
          ],
        },
        {
          text: "The graphics card's documentation recommends a 650 W power supply for the whole system.",
          ask: "Plan the fix, verify it, and document it.",
          parts: [
            part(
              "Fix and verification",
              "Replaces the power supply with a quality unit of at least the card maker's recommendation (650 W or more) with the right connectors, rather than repairing it, then reruns the same load test and the report export and rechecks the rail voltages.",
              "Replace the PSU with a 650 W or larger unit from a reputable maker with the connectors the board and card need (24-pin, CPU 8-pin, the card's PCIe power). Do not repair the old one; dispose of it as e-waste. Verify by rerunning the stress test for 30 minutes and the user's large export, and re-measuring the rails under load: they should stay within limits."
            ),
            part(
              "Documentation",
              "Records symptoms, the readings, cause (PSU undersized after the graphics card upgrade), the part replaced, the verification, and a preventive note: check power budget before adding cards.",
              "Ticket: 'Sudden power-off under load, Kernel-Power events, burning smell reported. +12 V sagged to 10.90 V and +5 V to 4.61 V under load (ATX limits 11.20 V and 4.75 V). Cause: 500 W PSU overloaded after GPU added. Replaced with 650 W; 30-minute stress test and report export passed, rails in range.' Knowledge base: check the power budget before approving graphics card upgrades."
            ),
          ],
        },
      ],
    },
    {
      slug: "aplus1-degraded-raid-clicking",
      objective: "Troubleshooting common storage issues: read/write failures, degraded performance, and RAID or boot failures",
      kind: "case",
      title: "Handle a degraded RAID array with a clicking drive",
      brief:
        "The fictional Northwind Veterinary Clinic's file server keeps patient records on a four-drive RAID 5 array of 4 TB hard drives behind a hardware RAID controller. On Monday morning staff say opening files is 'really slow', and the server is beeping. The last full backup ran Saturday night; there is no backup since.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text: "The RAID controller's utility shows: Virtual disk 0: Degraded. Disk 2: Failed. Disks 0, 1, 3: Online. You hear a rhythmic clicking from bay 2. The OS still shows the volume, and files open, slowly.",
          ask: "What is going on, and what do you do before touching the drives?",
          parts: [
            part(
              "Interpretation",
              "Explains the array lost one drive and is running degraded (data rebuilt from parity on every read, so it is slow), the beeping is the controller's audible alarm, and the clicking indicates the failed drive's mechanical failure; one more failure would lose the array.",
              "Disk 2 has failed (the clicking is a mechanical failure: the heads cannot read). RAID 5 survives one failure, so the volume still works, but every read of disk 2's data is recalculated from parity on the other three drives, which is why it is slow. The beeping is the controller's alarm. The array has no redundancy left: another failure loses everything."
            ),
            part(
              "Before touching the drives",
              "Takes a fresh backup of the changed data (or confirms Saturday's backup is good and copies Monday's changes) before the rebuild, because the rebuild stresses the remaining drives; silences the alarm but keeps the alert; checks S.M.A.R.T. on the remaining drives; and arranges a short maintenance window with the clinic.",
              "First protect the data: confirm Saturday's backup completed and is restorable, and copy anything changed since (or run an incremental backup) now, because a rebuild reads every sector of the three surviving drives and is when a second failure is most likely. Silence the audible alarm but keep the alert open. Check the S.M.A.R.T. status of disks 0, 1 and 3 in the controller utility. Tell the clinic files will be slow during the rebuild."
            ),
          ],
        },
        {
          text: "The backup of Monday's changes completes. S.M.A.R.T. shows disk 1 with a growing count of reallocated sectors; disks 0 and 3 are healthy. A replacement 4 TB drive of the same model is on the shelf.",
          ask: "Plan the replacement and rebuild given disk 1's warning.",
          parts: [
            orderPart(
              "Rebuild sequence",
              "All in order is met; one pair swapped is partly there.",
              "Back up first, identify the bay by its LED or locate function so you pull the right drive, hot-swap the failed disk with the identical model, let the controller rebuild and watch it, then deal with disk 1 once the array is optimal, and verify.",
              [
                "Confirm the backup of current data is complete and restorable",
                "Use the controller's locate function to light bay 2's LED",
                "Hot-swap the failed disk 2 with the identical replacement",
                "Start or confirm the rebuild and monitor its progress",
                "After the array is Optimal, replace disk 1 proactively and rebuild again",
                "Verify files open at normal speed and the controller shows Optimal",
              ]
            ),
            part(
              "Why disk 1 waits",
              "Explains that disk 1 must not be pulled while the array is degraded (that would be a second failure and lose the array), so it is replaced only after the first rebuild completes, and that a rising reallocated-sector count predicts failure.",
              "Pulling disk 1 now would be the second missing drive in a degraded RAID 5 and the array would fail. Rebuild disk 2 first; once the array is Optimal again, swap disk 1 (its growing reallocated-sector count means it is wearing out) and let it rebuild. If disk 1 fails during the first rebuild, restore from the backup taken this morning."
            ),
          ],
        },
        {
          text: "Both rebuilds finish; the array is Optimal and files open quickly. The clinic manager asks why the server did not warn anyone before Monday.",
          ask: "What do you change so the next failure is caught early, and what do you document?",
          parts: [
            part(
              "Prevention and documentation",
              "Sets up alerting (controller email or monitoring for degraded arrays and S.M.A.R.T. warnings), schedules regular backup tests, considers RAID 6 or a hot spare for larger drives, and documents the failure, actions, drive serials and verification.",
              "Configure the RAID controller's email alerts (or the monitoring system) for a degraded array, a failed disk and S.M.A.R.T. warnings, so the clinic is told the same day, not when files slow down. Add a hot spare or plan to move to RAID 6 at the next refresh. Test a restore from backup every month. Document: date, symptoms, failed drive serial and bay, the backup taken, both replacements, rebuild times and the final Optimal status."
            ),
          ],
        },
      ],
    },
    {
      slug: "aplus1-wifi-drops-voip",
      objective: "Troubleshooting wired and wireless network problems: intermittent connectivity, slow transfer speeds, and limited connectivity",
      kind: "case",
      title: "Fix Wi-Fi drops and choppy calls in a small office",
      brief:
        "The fictional Pebble Creek Realty office in the United States has two access points (AP-Front and AP-Back) on 2.4 GHz and 5 GHz, one SSID, and 12 staff who use laptops and softphone calls over Wi-Fi. Since a new tenant moved in upstairs, staff complain that Wi-Fi drops for a few seconds several times an hour, transfers to the file server are slow, and calls sound choppy. Wired PCs in the office have no problems.",
      safetyNote: GENERAL_SAFETY,
      steps: [
        {
          text:
            "You run a Wi-Fi analyzer by the reception desk. On 2.4 GHz it shows:\n\nSSID            Channel  Signal\nPebbleCreek     3        -48 dBm (AP-Front)\nPebbleCreek     9        -60 dBm (AP-Back)\nUpstairs-Guest  6        -52 dBm\nUpstairs-Office 11       -55 dBm\n\nOn 5 GHz only your two APs appear, both set to channel 36.",
          ask: "What is wrong with the channel plan, and what do you change?",
          parts: [
            part(
              "Diagnosis",
              "Explains that in the US 2.4 GHz has only three non-overlapping 20 MHz channels (1, 6 and 11), so channels 3 and 9 overlap both the neighbor's 6 and 11 and each other's neighbors, causing interference; and that both APs on 5 GHz channel 36 interfere with each other.",
              "In the United States 2.4 GHz has three non-overlapping channels: 1, 6 and 11. AP-Front on 3 overlaps the neighbors on 1-6 and AP-Back on 9 overlaps 6 and 11, so every transmission collides with the upstairs networks. On 5 GHz both APs share channel 36, so they contend with each other."
            ),
            part(
              "Channel changes",
              "Moves the 2.4 GHz radios to non-overlapping channels (for example AP-Front on 1 and AP-Back on 1 or 11 depending on what is quietest, never 3/9), puts the two 5 GHz radios on different non-overlapping channels (for example 36 and 149, or 36 and 44 at 20/40 MHz), encourages clients onto 5 GHz (band steering), and keeps channel widths modest (20 MHz on 2.4 GHz).",
              "2.4 GHz: AP-Front to channel 1 (the upstairs networks use 6 and 11) and AP-Back to channel 1 or 11, whichever the analyzer shows quieter at the back of the office, both 20 MHz wide. 5 GHz: AP-Front to 36 and AP-Back to 149 (or 44) so they do not overlap. Enable band steering so laptops prefer 5 GHz, which has far more channels and less interference."
            ),
          ],
        },
        {
          text: "After the change, drops stop and file transfers are faster, but calls are still choppy for two agents at the back. Their laptops show the 5 GHz connection to AP-Front at -79 dBm, even while sitting next to AP-Back. The softphone's call statistics show high jitter.",
          ask: "Explain this and fix it.",
          parts: [
            part(
              "Cause",
              "Identifies a sticky client: the laptops stay associated to the distant AP-Front with weak signal (-79 dBm) instead of roaming to AP-Back, causing retransmissions, jitter and choppy voice.",
              "The laptops are 'sticky': they joined AP-Front at the front and never roamed. At -79 dBm the link is weak, frames are retransmitted, and the delay varies (jitter), which ruins real-time voice even when web browsing seems fine."
            ),
            part(
              "Fix and verification",
              "Gets the clients onto the nearer AP (reconnect, update wireless drivers, set the adapter's roaming aggressiveness higher, or enable the AP's minimum RSSI or 802.11k/v/r roaming assistance if supported), considers QoS for voice, verifies signal around -65 dBm or better and jitter down in the call statistics, and documents the channel plan.",
              "Short term: disconnect and reconnect so they join AP-Back. Lasting fixes: update the laptops' Wi-Fi drivers, raise the adapter's roaming aggressiveness, and enable the APs' roaming features (minimum RSSI or 802.11k/v) if available; prioritize voice traffic with QoS on the APs. Verify: the laptops show a strong signal (around -65 dBm or better) from AP-Back and the softphone shows low jitter on a test call. Document the new channel plan and the reason, so no one sets 3 and 9 again."
            ),
          ],
        },
      ],
    },
  ],
};
