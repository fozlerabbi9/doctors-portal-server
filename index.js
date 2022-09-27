const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
require('dotenv').config()

// medile ware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.z6pgmwg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const varifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Access' })
    };
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        // console.log(decoded) // bar
        req.decoded = decoded;
        next();
    });
    // console.log(token)
}

async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db("doctors_portal").collection("services");
        const bookingCollection = client.db("doctors_portal").collection("booking");
        const userCollection = client.db("doctors_portal").collection("user");

        // main api
        app.get("/service", async (req, res) => {
            const query = {};
            const cursore = serviceCollection.find(query);
            const services = await cursore.toArray();
            res.send(services);
        })

        // update or post ba insert করা ,,, login or register data set kora hosse
        app.put("/user/:email", async (req, res) => {
            const email = req.params.email;
            // console.log(email)
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '24h' })   // etake payload bola hoy 
            res.send({ result, token })
        })
        //Admin Api (2)
        // app.get('admin/:email', async(req, res)=>{
        //     const email = req.params.email;
        //     const user = await userCollection.findOne({email : email});
        //     const isAdmin = user.role === 'admin';
        //     res.send({admin : isAdmin});
        // } )
        // Admin Api (1)
        app.put("/user/admin/:email", varifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === "admin") {
                // const user = req.body;            // apatoto lagbe na
                // console.log("admin === ",email)
                const filter = { email: email };
                // const options = { upsert: true };  // etau lagbe na
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result)
            }
            else{
                res.status(403).send({message : "Forbidden"})
            }
            // // const user = req.body;            // apatoto lagbe na
            // // console.log("admin === ",email)
            // const filter = { email: email };
            // // const options = { upsert: true };  // etau lagbe na
            // const updateDoc = {
            //     $set: { role: 'admin' },
            // };
            // const result = await userCollection.updateOne(filter, updateDoc);
            // res.send(result)
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
        //my appointment api
        // app.get("/booking", async (req, res) => {
        app.get("/booking", varifyJWT, async (req, res) => {
            const email = req.query.email;
            const authorization = req.headers.authorization;
            console.log("authorizationToken == ", authorization)
            const decodedEmail = req.decoded.email;
            if (decodedEmail === email) {
                const query = { email: email };
                const booking = await bookingCollection.find(query).toArray();
                return res.send(booking);
            }
            else {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            // const email = req.query.email;
            // const authorization = req.headers.authorization;
            // // console.log("authorizationToken == ",authorization)
            // if (authorization) {
            //     const query = { email: email };
            //     const booking = await bookingCollection.find(query).toArray();
            //     res.send(booking);
            // }
        })

        // booking kora hosse Booking Modal theke
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

        app.get('/allUsers', varifyJWT, async (req, res) => {
            // app.get('/allUsers', async (req, res) => {
            // const query = {}
            // const users = await userCollection.find(query).toArray();
            const users = await userCollection.find().toArray();
            res.send(users);
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