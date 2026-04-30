School Management System (SMS) – Full Web Application

A scalable, modular, and role-based School Management System designed to digitize academic, administrative, attendance, and financial workflows.
This repository contains the full web application with structured backend, responsive frontend, and multi-role access.

🔗 Repository

GitHub: https://github.com/Asif551/SMS

📌 Features
Admin
Create classes, sections, and subjects
Publish student results
Add and control users
Configure attendance structure
View dashboards and analytics
Manage announcements
Generate admit cards
Configure fee structures
Teacher
Take attendance (class/subject-wise)
Insert and update marks
Save all marks in batch
Upload study materials
View routines & assigned subjects
Track student academic records
Student
View profile and academic information
See attendance history
View/download results
Access admit card
Download study materials
View notices & class routines
Accountant
Create invoices
Track payments and dues
Manage expenses
Generate finance reports
View student fee history


🛠 Tech Stack
Frontend
HTML
CSS
JavaScript
Backend
Node.js
Express.js
Multer (file upload)
WebSocket (ws)
Database
MongoDB or MySQL


📁 Project Structure
/project-root
│── /backend
│     ├── /controllers
│     ├── /routes
│     ├── /models
│     ├── /services
│     └── server.js
│
│── /frontend
│     ├── /public
│     └── /templates
│
│── package.json
│── README.md
│── .env.example


⚙️ Installation & Setup (Windows)
1️⃣ Clone the repository
git clone https://github.com/Asif551/SMS
cd SMS
2️⃣ Install dependencies
npm install
3️⃣ Configure environment variables

Create a .env file using this template:

PORT=5000
DB_URL=your_database_url
SECRET_KEY=your_secret
JWT_EXPIRE=7d
ALLOW_FILE_UPLOAD=true
4️⃣ Start development server
npm run dev
5️⃣ Start production server
npm start

🔌 API Overview (Basic)
Auth
Method	Endpoint	Description
POST	/auth/login	Login for admin/teacher/student/accountant
POST	/auth/register	Create user (admin only)
Attendance
Method	Endpoint	Description
POST	/attendance/take	Teacher takes attendance
GET	/attendance/student/:id	Get student attendance
Results
Method	Endpoint	Description
POST	/results/add	Insert student marks
POST	/results/publish	Publish results (admin only)
GET	/results/student/:id	View student result


🧭 Roadmap
Parent login
Mobile app version
Smart routine generator
Real-time notifications (SMS/Email)
Multi-campus support


🤝 Contribution Guide
Fork the repo
Create a new branch
Commit and push your changes
Open a pull request


🔐 Security Notes
Never commit .env files
Use strong JWT secrets
Sanitize all inputs
Enable CORS properly
Apply rate limiting on auth APIs


📄 License

This project is licensed under the MIT License.

📬 Contact

Email: asifikbal280@gmail.com