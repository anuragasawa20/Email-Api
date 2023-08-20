const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async () => {
    try {
        const connect = await mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('database connected to', connect.connection.name);
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }
}

module.exports = connectDB;