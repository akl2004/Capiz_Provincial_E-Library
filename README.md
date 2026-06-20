1. System Overview and Purpose

1.1 System Purpose
The Capiz E-Lib system is a localized, desktop-based library management platform designed to digitize, secure, and streamline the daily operations of the library facility. Operating entirely within a secure Local Area Network (LAN), the system functions independently of external internet connectivity. This localized architecture ensures maximum uptime, data privacy, and zero latency during daily operations.
By utilizing an Electron-wrapped React frontend installed on local desktop clients, communicating with a centralized Laravel backend hosted via Laragon, Capiz E-Lib delivers the responsive, modern user interface of a web application combined with the stability and security of a dedicated standalone desktop system.

1.2 Key Objectives
Centralized Cataloging: Digitize the management of physical library assets, enabling rapid search, indexing, and structured organization of all materials.
Streamlined Circulation Tracking: Automate the checking in, checking out, and status tracking of library materials to reduce human error and prevent asset loss.
Data Governance & Security: Maintain strict control over library data through localized hosting and comprehensive input validation, ensuring patron and catalog data never leaves the premises.

1.3 Target Audience and Access Levels
The system is built primarily for internal library personnel, with distinct operational boundaries enforced via Role-Based Access Control (RBAC).
System Administrators / Head Librarians: Granted full access to system configurations, comprehensive reporting, and the creation or revocation of staff accounts.
Library Staff / Assistants: Granted access to day-to-day operational modules, including managing patron circulation, updating catalog records, and processing borrowed items.
Patrons / Walk-in Guests: Granted access to catalog records and attendance form.

1.4 High-Level Architecture Summary
The application follows a client-server model deployed over a physical LAN. The client-side is a compiled Windows desktop application (Electron.js / React.js) installed on staff workstations. These client machines communicate via local network IP to a central host machine running Laragon, which serves the application's core logic (Laravel/PHP) and manages the central database (MySQL).
