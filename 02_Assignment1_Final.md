![][image1]

**CSE471: System Analysis and Design**  
**Assignment on Functional Requirements**  
**Proposed Project Title: ClassConnect: University Repository and communication platform** 

| Group No: 02, CSE471 Lab Section: 01,  Summer 2026 |  |  |
| ----- | :---- | :---- |
| **SL** | **ID** | **Name** |
| 1 | 23201295 | Arian Kabir |
| 2 | 22301387 | Faria Fairooz Zahan |
| 3 | 22101559 | Shahadat Hossain |
| 4 | 23301073 | Lamia Hai Meghla |

**Submission Date: 5/7/26**

## 

# **Project Overview**

The “ClassConnect: University Repository and communication platform” is a comprehensive web application designed to combine all course materials of all the courses of the university in one single platform and create a communication platform for the class students and lecturers in one place. The system will manage four distinct user roles: Students, Lecturers, Student tutors and System administrators. It will facilitate students to communicate with lecturers from all classes in one single platform as opposed to multiple different platforms for each lecturer. Students will be able to arrange all of their course materials in one single place and also get summarized versions of the lecture notes for final preparations. Users will also be able to get notifications for assignment submissions, quizzes and create a study routine with remainders in the app. 

**Tech Stack:**

* ## Language: TypeScript, Javascript

* ## Framework: Next.js

* ## Styling: TailwindCSS

* ## Database: mySQL

* ## Real-time Engine: Socket.io

* ## Automation Scheduler: BullMQ with Redis

### External APIs

* ## Google Workspace API (OAuth2 & Drive REST API)

* Gmail REST API/[resend.com](http://resend.com) API (22301387 Faria Fairooz Zahan)

* ## Puppeteer / Headless Chrome API

* Excalidraw API (Arian Kabir)  
* Drive API  
* Open Library Books API ( Lamia Hai Meghla\_23301073)  
* Cloudinary API ( Lamia Hai Meghla\_23301073)  
* Firebase Authentication ( Lamia Hai Meghla\_23301073)

## 

## **User Roles**

* ## University Student: Students are authenticated using their g-suite gmail account,  can access personalized course materials, utilizes the interactive canvas for personal or collaborative note-taking, and participates in section-specific group chats.

* ## Faculty Member: Uploads and provisions course materials, shares lecture videos hosted via Google Drive, broadcasts real-time announcements within section channels, and creates digital assignment evaluation boxes to collect student submissions.

* ## Student Tutor: Moderates assigned peer review structures, provides guided academic assistance inside designated section-scoped workspaces, and shares supplementary study materials with permitted peer groups.

* ## System Administrator: Oversees the health of the public routine scraping micro-service, tracks database storage metrics, audits system access tokens, handles escalated billing/escrow disputes, and manages tenant configuration metadata.

## **Functional Requirements**

## 

| SL | Common Workflows |
| :---- | :---- |
| 1 | Authentication & Access Initialization: A university member signs into the repository ecosystem using their verified institutional G Suite account. The system validates the domain security token via OAuth2, establishes an active session registry, maps the user's base identity profile, and initializes their dashboard permissions based on their institutional role . |
| 2 | Automated Academic Onboarding & Sync Routine: Upon successful authentication, the system triggers background scraping and portal synchronization scripts. It securely gathers the user's active semester course allocations and cross-references them against spreadsheet routine databases, completely automated and without manual data entry, providing an immediate personalized view of upcoming classes, material paths, and communication groups. |

## 

| Module 1 |  |
| :---- | :---- |
|  **Faria** | **Automated External Spreadsheet Routine Intake:** A background script that utilizes the Google Sheets API to pull raw rows from the university's public scheduling spreadsheet. It parses columns like room numbers, timeslots, and teacher initials, and matches these values to pre-populate the system's baseline calendar database. |
| **Lamia** | **Course Material Category Classifier :** A structural metadata system that allows administrators to organize central files into tags like *Syllabus*, *Lecture Slides*, *Lab Manuals*, or *Reference Books*. |
| **Arian** | **Dual-Mode Basic Canvas & Text Input Controller:** A user-side workspace module created using integration of Excalidraw API which captures freehand digital drawing coordinates from free-hand, mice or styluses while letting users overlay standard typed text fields anywhere on the page.  |
| **Shahadat** | **Routine builder:** Drop down option to select courses and their respective sections. The selected sections will be added to a routine which appears on the dashboard. |

| Module 2 |  |
| :---- | :---- |
| **Member** | **Feature Description** |
| **Lamia** | **Admin Lecturer Assignment:** An administrative dashboard panel that pulls existing section maps. It grants administrators full operational authorization to manually assign new lecturers to existing sections or wipe specific faculty mappings when scheduling shakeups happen mid-semester. Also change routines of particular student or teacher |
| **Faria** | **Cross-Role Section Staffing & Allocation Ledger:** A configuration interface that reads initial teacher placements from the routine intake of member 1\. It builds the foundational section assignment tables, setting up structural parameters that map which student tutors, professors, and students share specific course segments. |
| **Shahadat** | **Course Material Provisioning Pipeline:** An asset sorting pipeline that automatically reads a student's schedule. It pulls matching master files from the seed loader (M1.2) and displays them on the user's current course dashboard, allowing lecturers to append secondary files directly to their assigned sections. |
| **Arian** | **Cross-Peer Notebook Export & File Share Controller:** A client-side data packager that bundles a user's canvas notes (M1.3) into standalone downloadable files. It enables sharing between classmates, enabling users to forward notes across the network without real-time multi-user editing conflicts. |

| Module 3 |  |
| :---- | :---- |
| **Member** | **Feature Description** |
| **Arian** | **Section-Scoped Multi-Role Chat Room Orchestrator:** A communication module that uses current enrollment data to build group chat spaces for each section. It drops enrolled students, assigned lecturers, and verified student tutors (M2.1) into shared rooms with unique role tags to support announcements and real-time questions. |
| **Arian** | **Chat Room File Attachment System:** An in-chat file upload system where users in the chatroom can upload one or more files to share. Accepted files are- JPEG, PNG, PDF and Word documents within a certain size limit.  |
| **Shahadat** | **Isolated Cross-Faculty Coordination Circles:** A private communication space created for lecturers teaching the same course code. It features a meeting scheduler using voting system and document sharing fields, allowing faculty to align deadlines and exchange teaching resources privately. |
| **Faria** | **Contextual Student Routine Builder & Study Scheduler:** A personalized planning tool that pulls the student's core class timetable. It allows users to schedule custom study sessions around their classes and configure automated background alerts that push reminders when assignment deadlines approach. |
| **Shahadat** | **Assignment Submission Form Formulator & Collection Hub:** A task creation tool allowing lecturers to deploy digital assignment dropboxes inside section chat rooms (M3.1) using integration of Drive API. The system tracks incoming submissions, allows student tutors to review the files, and compiles everything into a clean download folder for the teacher.  |
| **Faria** | **In-App Structured Email Template Engine:** An integrated communication hub that provides students with predefined email templates (e.g., sickness leaves, cross-section quiz requests, consultation slot bookings). Users fill in structural variables and attach local files from their dashboard to prepare emails cleanly.  |
| **Lamia**  | **Assignment Checker:** Student Tutors within the class section will get access to the assignment submissions and will be able to use basic document editing features to check and return the scripts. |
| **Lamia** | **Academic Assignment Audit Log & Submission Guard:** An automated logging database that monitors assignment boxes (M3.3). It records precise timestamp signatures for every file uploaded by students or opened by student tutors, generating clean audit receipts to verify submission integrity and resolve lateness disputes. |

[image1]: <data:image/png;base64,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>