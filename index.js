const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000;
require('dotenv').config()

// medile ware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.z6pgmwg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db("doctors_portal").collection("services");
        const bookingCollection = client.db("doctors_portal").collection("booking");
        const userCollection = client.db("doctors_portal").collection("user");

        app.get("/service", async (req, res) => {
            const query = {};
            const cursore = serviceCollection.find(query);
            const services = await cursore.toArray();
            res.send(services);
        })

        // update or post ba insert করা ,,,
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        // =====>>>  {

        // this is not a proper way to query
        // After larning more about mongodb. use agreeget , lookup , piepline , match , group
        app.get("/available", async (req, res) => {
            const date = req.query.date;
            //step 1 : get all services;
            const services = await serviceCollection.find().toArray();
            // step 2 : get the booking of the day
            const query = { fixedDate: date };
            // console.log(query);
            const bookings = await bookingCollection.find(query).toArray();
            // step 3 : for each service , find booking for thet service
            services.forEach(service => {
                const bookedService = bookings.filter(b => b.serviceName === service.name);
                const bookedServiceSlots = bookedService.map(booked => booked.slotTime);
                const available = service.slots.filter(book => !bookedServiceSlots.includes(book));
                service.slots = available;

            })
            res.send(services);
        })
        // app.get("/available", async (req, res) => {
        //     const date = req.query.date || "Sep 18, 2022";
        //     const date = req.query.date ;
        //     //step 1 : get all services;
        //     const services = await serviceCollection.find().toArray();
        //     // step 2 : get the booking of the day
        //     const query = { fixedDate: date };
        //     // console.log(query);
        //     const bookings = await bookingCollection.find(query).toArray();            
        //     // step 3 : for each service , find booking for thet service
        //     services.forEach(service => {
        //         const serviceBooking = bookings.filter(booked => booked.serviceName === service.name);
        //         // console.log(serviceBooking);
        //         const bookedSlot = serviceBooking.map(s => s.slotTime);
        //         // console.log(bookedSlot);
        //         // service.booked = serviceBooking.map(s => s.slots)
        //         const avialavle = service.slots.filter(s => !bookedSlot.includes(s));
        //         service.avialavle =  avialavle;
        //     })
        //     res.send(services);
        // })

        //     }<<<=========
        app.get("/booking", async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const booking = await bookingCollection.find(query).toArray();
            res.send(booking);
        })

        app.post("/booking", async (req, res) => {
            const bookingInfo = req.body;
            // console.log(bookingInfo.tritmentId);
            // const query = { tritmentId: bookingInfo.tritmentId }
            // const query = { serviceName: bookingInfo.serviceName, slotTime: bookingInfo.slotTime, patientName: bookingInfo.patientName }
            const query = { serviceName: bookingInfo.serviceName, fixedDate: bookingInfo.fixedDate, patientName: bookingInfo.patientName }
            const exists = await bookingCollection.findOne(query);
            // console.log(exists);
            if (exists) {
                return res.send({ success: false, bookingInfo: exists })
            }
            const result = await bookingCollection.insertOne(bookingInfo);
            res.send({ success: true, result });
        })


    }
    finally {
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello doctors portal')
})

app.listen(port, () => {
    console.log(`Doctors app listening on port === ${port}`)
})