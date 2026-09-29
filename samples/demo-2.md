CERT-In Vulnerability Note CIVN-2026-0483
Multiple Vulnerabilities in Wireshark
Original Issue Date:September 29, 2026
Severity Rating: HIGH
Software Affected
Wireshark 4.6.0 to 4.6.8
Wireshark 4.4.0 to 4.4.18
Overview
Multiple vulnerabilities have been reported in Wireshark which could allow an attacker to cause the application to crash, consume excessive system
resources or potentially execute arbitrary code on the targeted system.
Target Audience:
All organizations and individuals using Wireshark.
Risk Assessment:
High risk of application crashes, denial of service, excessive resource consumption, and potential arbitrary code execution.
Impact Assessment:
Potential for application crashes, excessive system resource consumption, denial of service conditions, memory leaks, and arbitrary code execution.
Description
Wireshark is a network protocol analyzer used to capture and inspect data packets in real time for trouble shooting, analysis, and security purposes.
These vulnerabilities exist in Wireshark due to improper handling of specially crafted or malformed input in various protocol dissectors, file parsers,
utilities, and profile import functionality. An attacker could exploit these vulnerabilities by injecting specially crafted or malformed network traffic,
providing a malicious packet capture or other malformed file, or persuading a victim to import a malicious configuration profile.
9/29/26, 7:39 PM CERT-In Vulnerability Notes
about:blank 1/4
Successful exploitation of these vulnerabilities could allow an attacker to cause Wireshark to crash, consume excessive system resources, cause
memory leaks, or potentially execute arbitrary code on the targeted system.
Solution
Apply appropriate updates as mentioned by the vendor:
https://www.wireshark.org/security/wnpa-sec-2026-92.html
https://www.wireshark.org/security/wnpa-sec-2026-93.html
https://www.wireshark.org/security/wnpa-sec-2026-94.html
https://www.wireshark.org/security/wnpa-sec-2026-95.html
https://www.wireshark.org/security/wnpa-sec-2026-96.html
https://www.wireshark.org/security/wnpa-sec-2026-97.html
https://www.wireshark.org/security/wnpa-sec-2026-98.html
https://www.wireshark.org/security/wnpa-sec-2026-99.html
https://www.wireshark.org/security/wnpa-sec-2026-100.html
https://www.wireshark.org/security/wnpa-sec-2026-101.html
https://www.wireshark.org/security/wnpa-sec-2026-102.html
https://www.wireshark.org/security/wnpa-sec-2026-103.html
https://www.wireshark.org/security/wnpa-sec-2026-104.html
https://www.wireshark.org/security/wnpa-sec-2026-105.html
https://www.wireshark.org/security/wnpa-sec-2026-106.html
https://www.wireshark.org/security/wnpa-sec-2026-107.html
https://www.wireshark.org/security/wnpa-sec-2026-108.html
9/29/26, 7:39 PM CERT-In Vulnerability Notes
about:blank 2/4
https://www.wireshark.org/security/wnpa-sec-2026-109.html
https://www.wireshark.org/security/wnpa-sec-2026-110.html
Vendor Information
Wireshark
https://www.wireshark.org/
References
https://www.wireshark.org/security/wnpa-sec-2026-92.html
https://www.wireshark.org/security/wnpa-sec-2026-93.html
https://www.wireshark.org/security/wnpa-sec-2026-94.html
https://www.wireshark.org/security/wnpa-sec-2026-95.html
https://www.wireshark.org/security/wnpa-sec-2026-96.html
https://www.wireshark.org/security/wnpa-sec-2026-97.html
https://www.wireshark.org/security/wnpa-sec-2026-98.html
https://www.wireshark.org/security/wnpa-sec-2026-99.html
https://www.wireshark.org/security/wnpa-sec-2026-100.html
https://www.wireshark.org/security/wnpa-sec-2026-101.html
https://www.wireshark.org/security/wnpa-sec-2026-102.html
https://www.wireshark.org/security/wnpa-sec-2026-103.html
https://www.wireshark.org/security/wnpa-sec-2026-104.html
https://www.wireshark.org/security/wnpa-sec-2026-105.html
https://www.wireshark.org/security/wnpa-sec-2026-106.html
https://www.wireshark.org/security/wnpa-sec-2026-107.html
https://www.wireshark.org/security/wnpa-sec-2026-108.html
https://www.wireshark.org/security/wnpa-sec-2026-109.html
https://www.wireshark.org/security/wnpa-sec-2026-110.html
CVE Name
CVE-2026-96415
CVE-2026-96416
CVE-2026-96423
CVE-2026-96418
CVE-2026-96419
CVE-2026-96420
9/29/26, 7:39 PM CERT-In Vulnerability Notes
about:blank 3/4
CVE-2026-96417
CVE-2026-96421
CVE-2026-96422
CVE-2026-95388
CVE-2026-95392
CVE-2026-95393
CVE-2026-95394
CVE-2026-95387
CVE-2026-95395
CVE-2026-95390
CVE-2026-95386
CVE-2026-95389
CVE-2026-95391
Disclaimer
The information provided herein is on "as is" basis, without warranty of any kind.
Contact Information
Email: info@cert-in.org.in
Phone: +91-11-22902657
Postal address
Indian Computer Emergency Response Team (CERT-In)
Ministry of Electronics and Information Technology
Government of India
Electronics Niketan
6, CGO Complex, Lodhi Road,
New Delhi - 110 003
India
9/29/26, 7:39 PM CERT-In Vulnerability Notes
about:blank 4/4