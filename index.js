const express = require('express');
const connectDB = require('./db');
const Event = require('./EventModel');
const bodyParser = require('body-parser');
const dotenv = require("dotenv").config();
const app = express();
const MobileDetect = require('mobile-detect');
// const device = require('express-device');
// const useragent = require('user_agent_parsed');
const parser = require('ua-parser-js');

app.use(express.json());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
// app.use(device.capture());

connectDB();

app.post('/api/events', async (req, res) => {
    //console.log(req.body);
    const eventPayload = req.body;
    const { user_agent, user_agent_parsed } = req.body;
    // const parsedUserAgent = useragent.parse(user_agent);
    const device = parser(user_agent);
    console.log(device.type);
    let device_type;
    // console.log(parsedUserAgent);

    if (user_agent_parsed.is_mobile) {
        device_type = "mobile";

    } else {
        if (device.type == "tablet") {
            device_type = "tablet";

        } else {
            device_type = "desktop";
        }
    }
    eventPayload.device_type = device_type;
    try {
        console.log(device_type);
        const event = new Event(eventPayload);
        await event.save();
        console.log(event);
        res.status(200).json({ event: event });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save event' });
    }
});


app.get('/api/metrics', async (req, res) => {
    try {
        const opensByCountries = await Event.aggregate([
            {
                $group: {
                    _id: '$geo_ip.country',
                    totalOpens: { $sum: 1 }
                }
            }
        ]);

        const opensByDevice = await Event.aggregate([
            {
                $group: {
                    _id: '$device_type',
                    totalOpens: { $sum: 1 }
                }
            }
        ]);

        const timeseries = await Event.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$timestamp' },
                        month: { $month: '$timestamp' },
                        day: { $dayOfMonth: '$timestamp' },
                        hour: { $hour: '$timestamp' },
                        minute: { $minute: '$timestamp' }
                    },
                    totalOpens: { $sum: 1 }
                }
            },
            {
                $project: {
                    time: {
                        $dateToString: {
                            format: '%m/%d/%Y, %H:%M:%S',
                            date: {
                                $toDate: {
                                    $concat: [
                                        { $toString: '$_id.month' },
                                        '/',
                                        { $toString: '$_id.day' },
                                        '/',
                                        { $toString: '$_id.year' },
                                        ', ',
                                        { $toString: '$_id.hour' },
                                        ':',
                                        { $toString: '$_id.minute' },
                                        ':00'
                                    ]
                                }
                            }
                        }
                    },
                    totalOpens: { $sum: 1 }
                }
            }
        ]);

        const response = {
            opens_by_countries: opensByCountries.reduce((acc, item) => {
                acc[item._id] = item.totalOpens;
                return acc;
            }, {}),
            opens_by_device: opensByDevice.reduce((acc, item) => {
                acc[item._id] = item.totalOpens;
                return acc;
            }, {}),
            timeseries
        };

        res.json(response);
    } catch (err) {
        console.error('Error retrieving opens data', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


const port = process.env.PORT || 5000;

app.listen(port, () => { console.log(`app is listening on port ${port}`) });