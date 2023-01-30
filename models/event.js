const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EventSchema = new Schema({
    title: String,
    city: String,
    location: String,
    dateStart: Date,
    dateEnd: Date,
    datePublished: Date,
    category: String,
    description: String,
    email: {
        type: String,
        lowercase: true
    },
    confirmed: Boolean,
    published: {
        type: Boolean,
        default: false
    },
    viewNumber: {
        type: Number,
        default: 0
    },
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema, 'eventsReact');


