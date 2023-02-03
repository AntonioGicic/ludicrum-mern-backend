require('dotenv').config()
const express = require('express');
const cors = require('cors');
const PORT = process.env.PORT || 3001;
const path = require('path');
const mongoose = require('mongoose');
const Event = require('./models/event.js');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const methodOverride = require('method-override');
const cookieParser = require("cookie-parser");
const cron = require('node-cron');
const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
const dbURL = `mongodb+srv://${dbUser}:${dbPass}@ludicrumdb.t4kwz0x.mongodb.net/?retryWrites=true&w=majority`
const app = express();
const { ObjectId } = require('mongodb');

// mongo connection
mongoose.connect(dbURL, { useNewUrlParser: true, useUnifiedTopology: true }).then(console.log('connected to DB')).catch((error) => console.log(error.message));

// app use
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('X-HTTP-Method-Override'))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(express.json())

//app set
app.set('views', path.join(__dirname, '/views'));

//cron job
cron.schedule('* * 1 * * *', async () => {
    try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate());
        await Event.deleteMany({ dateEnd: { $lt: cutoff } });
    } catch (error) {
        console.log('Nažalost došlo je do pogreške.', error);
    }
});

//API-s
app.get('/', (req, res) => {
    try {
        res.send();
    } catch (error) {
        res.send('Nažalost došlo je do pogreške, molimo pokušajte kasnije.', error);
    }
});

app.get('/dogadaji', async (req, res) => {
    const { city, date, category } = req.query;
    const query = {};
    if ((!date) && (!city) && (!category)) {
        const events = await Event.find({ published: 'true' }).sort('-createdAt').limit(10);
        res.json(events)
    } else {
        if (date) {
            query.dateStart = { $lte: date }
            query.dateEnd = { $gte: date }
        }
        else if (!date) { query.dateStart = { $exists: true } }
        if (city) { query.city = city }
        else if (!city) { query.city = { $exists: true } }
        if (category) { query.category = category }
        else if (!category) { query.category = { $exists: true } }
        query.published = true;
        const events = await Event.find(query);
        res.json(events);
    }
});

app.get('/dogadaji/:id', async (req, res) => {
    try {
        const allCookies = req.cookies;
        const { id } = req.params;
        const dogadaj = await Event.findById(id);
        if (!allCookies[id]) {
            Event.findByIdAndUpdate(id, { $inc: { "viewNumber": 1 } }, function (err, doc) {
                if (err) { throw err; }
            });
            res.cookie(id, { maxAge: 1296000, httpOnly: false });
        }
        res.json(dogadaj);
    } catch (error) {
        res.redirect('/');
    }
});

app.post('/dogadaji/:id/reported', async (req, res) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });

    const mailOptions = {
        from: 'ludicrum.ludicrum@gmail.com',
        to: 'ludicrum.ludicrum@gmail.com',
        subject: `Prijava događaja  id=${req.body.eventId}`,
        text: `Razlog prijave događaja je: ${req.body.razlogPrijaveDogađaja}`
    }

    transporter.sendMail(mailOptions, (error, responose) => {
        if (error) {
            console.log(error);
            res.send('Nažalost došlo je do pogreške, molimo pokušajte kasnije.', error)
        } else {
            res.redirect('/uspjesna-prijava');
        }
    });
});

app.post('/dogadaji', async (req, res) => {
    const post = res.json({ requestBody: req.body })
    console.log(post)
    try {
        const event = new Event(req.body.event);
        await event.save();
        // res.redirect('/objavljeno');
    } catch (error) {
        res.send('Nažalost došlo je do pogreške, molimo pokušajte kasnije.', error);
    }
});

app.post('/kontakt', async (req, res) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });

    const mailOptions = {
        from: req.body.contactEmail,
        to: 'ludicrum.ludicrum@gmail.com',
        subject: `${req.body.contactName}`,
        text: `Mail poslan od ${req.body.contactEmail}, poruka je: ${req.body.contactMessage}`
    }

    transporter.sendMail(mailOptions, (error, responose) => {
        if (error) {
            console.log(error);
            res.send('Nažalost došlo je do pogreške, molimo pokušajte kasnije.', error)
        } else {
            res.redirect('/poslano')
        }
    });
});

//app listen
app.listen(PORT, () => {
    console.log(`server started on port ${PORT}`);
});