# Online Complaint & Grievance Redressal System

A full-stack web application for managing complaints and grievances with user authentication, admin panel, and real-time tracking.

## 🚀 Features

### User Features
- ✅ User Registration & Login
- ✅ Submit Complaints with Categories
- ✅ Priority Levels (Low, Medium, High)
- ✅ File Attachments (up to 5 files)
- ✅ Track Complaint Status
- ✅ Search & Filter Complaints
- ✅ View Detailed Complaint History

### Admin Features
- ✅ Dashboard with Statistics
- ✅ View All Complaints
- ✅ Update Complaint Status
- ✅ Filter by Status & Priority
- ✅ Add Notes to Updates
- ✅ Comprehensive Timeline View

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MySQL** (v5.7 or higher) - [Download](https://www.mysql.com/)
- **Git** (optional) - [Download](https://git-scm.com/)

## 🛠️ Installation & Setup

### Step 1: Database Setup

1. Open MySQL command line or MySQL Workbench
2. Run the `database.sql` file to create database and tables:

```bash
mysql -u root -p < database.sql
```

Or copy and paste the contents of `database.sql` into MySQL Workbench and execute.

### Step 2: Backend Setup

1. Create a new folder for the project and navigate to it:

```bash
mkdir complaint-system
cd complaint-system
```

2. Create a `backend` folder and add the following files:
   - `server.js`
   - `package.json`
   - `.env`

3. Create an `uploads` folder for file storage:

```bash
mkdir uploads
```

4. Install backend dependencies:

```bash
npm install
```

5. Configure the `.env` file with your database credentials:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=complaint_system
JWT_SECRET=your-super-secret-jwt-key-change-this
```

6. Start the backend server:

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Step 3: Frontend Setup

1. Create a `frontend` folder in your project directory
2. Add the following files to the `frontend` folder:
   - `index.html`
   - `styles.css`
   - `script.js`

3. Open `script.js` and ensure the API_URL is correct:

```javascript
const API_URL = 'http://localhost:5000/api';
```

4. Open `index.html` in your web browser or use a simple HTTP server:

**Option A: Using VS Code Live Server**
- Install "Live Server" extension in VS Code
- Right-click on `index.html` and select "Open with Live Server"

**Option B: Using Python**
```bash
cd frontend
python -m http.server 8000
```
Then open `http://localhost:8000` in your browser

**Option C: Using Node.js http-server**
```bash
npm install -g http-server
cd frontend
http-server -p 8000
```

## 📁 Project Structure

```
complaint-system/
│
├── backend/
│   ├── server.js           # Express server & API routes
│   ├── package.json        # Backend dependencies
│   ├── .env               # Environment variables
│   └── uploads/           # Uploaded files directory
│
├── frontend/
│   ├── index.html         # Main HTML file
│   ├── styles.css         # CSS styles
│   └── script.js          # JavaScript logic
│
└── database.sql           # Database schema
```

## 🔐 Default Login Credentials

### Admin Account
- **Email:** admin@example.com
- **Password:** admin123

### User Account
- **Email:** user@example.com
- **Password:** user123

## 🎯 Usage Guide

### For Users:
1. Register a new account or login
2. Navigate to "Submit Complaint"
3. Fill in the complaint form
4. Attach files if needed (optional)
5. Submit and receive a unique Complaint ID
6. Track your complaint status in "Track" section

### For Admins:
1. Login with admin credentials
2. View dashboard statistics
3. Navigate to "Admin Panel"
4. View all complaints with filters
5. Click on any complaint to view details
6. Update status and add notes

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Complaints
- `GET /api/complaints` - Get all complaints (Admin)
- `GET /api/complaints/my-complaints` - Get user's complaints
- `GET /api/complaints/:id` - Get complaint details
- `POST /api/complaints` - Submit new complaint
- `PUT /api/complaints/:id/status` - Update complaint status (Admin)

### Categories
- `GET /api/categories` - Get all categories

### Statistics
- `GET /api/complaints/stats/dashboard` - Get dashboard stats (Admin)

## 🔍 Troubleshooting

### Backend Issues

**Error: "Cannot connect to database"**
- Check if MySQL is running
- Verify database credentials in `.env` file
- Ensure `complaint_system` database exists

**Error: "Port 5000 already in use"**
- Change PORT in `.env` file
- Or stop the process using port 5000

**Error: "Module not found"**
- Run `npm install` again
- Delete `node_modules` folder and `package-lock.json`, then run `npm install`

### Frontend Issues

**Error: "Failed to fetch"**
- Ensure backend server is running
- Check if API_URL in `script.js` matches backend URL
- Check browser console for CORS errors

**Login not working**
- Clear browser localStorage
- Check if credentials are correct
- Verify backend is running and database has user records

## 🔒 Security Notes

**For Production Deployment:**

1. **Change JWT Secret**: Use a strong, random string (minimum 32 characters)
2. **Enable HTTPS**: Use SSL certificates
3. **Secure Database**: Use strong passwords and restrict access
4. **Environment Variables**: Never commit `.env` file to version control
5. **Input Validation**: Backend validates all inputs
6. **Password Hashing**: Uses bcrypt with salt rounds
7. **File Upload Limits**: Maximum 5MB per file, 5 files per complaint

## 📦 Dependencies

### Backend
- **express**: Web framework
- **mysql2**: MySQL database driver
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT authentication
- **cors**: Cross-origin resource sharing
- **multer**: File upload handling
- **dotenv**: Environment variables

### Frontend
- Pure HTML, CSS, and JavaScript (No frameworks required)

## 🚀 Deployment

### Deploy Backend (Heroku Example)

1. Install Heroku CLI
2. Create Heroku app:
```bash
heroku create complaint-system-api
```

3. Add MySQL addon:
```bash
heroku addons:create cleardb:ignite
```

4. Deploy:
```bash
git push heroku main
```

### Deploy Frontend (Netlify/Vercel)

1. Update API_URL in `script.js` to your backend URL
2. Deploy frontend folder to Netlify or Vercel
3. Configure environment variables

## 📝 License

This project is open source and available under the MIT License.

## 👨‍💻 Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check browser console for errors
4. Verify database connection

## 🎉 Features Coming Soon

- Email notifications
- SMS alerts
- PDF export of complaints
- Advanced analytics
- Mobile app version
- Real-time chat support

---

Made with ❤️ for efficient complaint management
