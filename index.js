



const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();


const app = express();
const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
    // Check if user is authenticated (you can implement your own logic here)
    const isLoggedIn = true; // Replace with your actual authentication logic

    if (isLoggedIn) {
        next(); // Continue to the next middleware or route handler
    } else {
        res.redirect('/login'); // Redirect to login page if not authenticated
    }
};

// Routes

// Home Route
app.get('/', (req, res) => {
    res.render('home');
});

// Login Route
app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.post("/login", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;

    try {
        const result = await pool.query("SELECT * FROM users WHERE email = ($1)", [email]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const storedPassword = user.password;
            if (storedPassword == password) {
                res.render("index.ejs");

            } else {
                res.send("Incorrect Password")
            }

        } else {
            res.send("User Not Found");

        }

    } catch (error) {
        console.log(error);
    }

});

// Employee Routes with Authentication Middleware
app.post('/admin/employees/add', isAuthenticated, async (req, res) => {
    const { name, email, position } = req.body;
    await pool.query('INSERT INTO employees (name, email, position) VALUES ($1, $2, $3)', [name, email, position]);
    res.redirect('/admin/employees');
});

app.get('/admin/employees', isAuthenticated, async (req, res) => {
    const result = await pool.query('SELECT * FROM employees');
    res.render('employeeList', { employees: result.rows });
});

app.get('/admin/employees/edit/:id', isAuthenticated, async (req, res) => {
    const result = await pool.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    res.render('editEmployee', { employee: result.rows[0] });
});

app.post('/admin/employees/update/:id', isAuthenticated, async (req, res) => {
    const { name, email, position } = req.body;
    await pool.query('UPDATE employees SET name = $1, email = $2, position = $3 WHERE id = $4', [name, email, position, req.params.id]);
    res.redirect('/admin/employees');
});

app.get('/admin/employees/delete/:id', isAuthenticated, async (req, res) => {
    try {
        await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
        res.redirect('/admin/employees');
    } catch (err) {
        res.status(500).send('Unable to delete employee. Please ensure they are not referenced in any reviews.');
    }
});

// Review Routes
app.post('/admin/reviews/add', async (req, res) => {
    const { reviewer, reviewee, content } = req.body;
    await pool.query('INSERT INTO reviews (reviewer_id, reviewee_id, content) VALUES ($1, $2, $3)', [reviewer, reviewee, content]);
    res.redirect('/admin/reviews');
});

app.get('/admin/reviews', async (req, res) => {
    const reviewsResult = await pool.query('SELECT reviews.*, e1.name AS reviewer_name, e2.name AS reviewee_name FROM reviews JOIN employees e1 ON reviews.reviewer_id = e1.id JOIN employees e2 ON reviews.reviewee_id = e2.id');
    const employeesResult = await pool.query('SELECT * FROM employees');
    res.render('reviewList', { reviews: reviewsResult.rows, employees: employeesResult.rows });
});

app.post('/admin/reviews/update/:id', async (req, res) => {
    const { reviewer, reviewee, content } = req.body;
    await pool.query('UPDATE reviews SET reviewer_id = $1, reviewee_id = $2, content = $3 WHERE id = $4', [reviewer, reviewee, content, req.params.id]);
    res.redirect('/admin/reviews');
});

app.get('/admin/reviews/delete/:id', async (req, res) => {
    await pool.query('DELETE FROM reviews WHERE id = $1', [req.params.id]);
    res.redirect('/admin/reviews');
});


// Review List Route
app.get('/admin/reviews/all', isAuthenticated, async (req, res) => {
    try {
        const reviewsResult = await pool.query('SELECT reviews.*, e1.name AS reviewer_name, e2.name AS reviewee_name FROM reviews JOIN employees e1 ON reviews.reviewer_id = e1.id JOIN employees e2 ON reviews.reviewee_id = e2.id');
        res.render('allReviews', { reviews: reviewsResult.rows });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).send('Internal Server Error');
    }
});




// Feedback Routes
app.post('/employee/reviews/add', async (req, res) => {
    const { review, employee, feedbackContent } = req.body;
    await pool.query('INSERT INTO feedback (review_id, employee_id, feedback_content) VALUES ($1, $2, $3)', [review, employee, feedbackContent]);
    res.redirect('/employee/reviews');
});

app.get('/employee/reviews', async (req, res) => {
    const feedbacksResult = await pool.query('SELECT feedback.*, employees.name AS employee_name FROM feedback JOIN employees ON feedback.employee_id = employees.id');
    const reviewsResult = await pool.query('SELECT * FROM reviews');
    res.render('feedbackList', { feedbacks: feedbacksResult.rows, reviews: reviewsResult.rows });
});

// Handle GET request to render the form for submitting employee reviews


// Start Server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
