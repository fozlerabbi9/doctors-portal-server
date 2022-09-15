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

        app.get("/service", async (req, res) => {
            const query = {};
            const cursore = serviceCollection.find(query);
            const services = await cursore.toArray();
            res.send(services);
        })

        app.post("/booking", async (req, res) => {
            const bookingInfo = req.body;
            // console.log(bookingInfo.tritmentId);
            // const query = { tritmentId: bookingInfo.tritmentId }
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