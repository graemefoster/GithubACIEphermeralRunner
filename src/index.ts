import express from "express";
import bodyParser from 'body-parser'

import { handleWebHook } from './github-action-receiver'
import * as dotenv from 'dotenv'

dotenv.config()
const app = express();
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello from express and typescript');
});

app.post('/webhook', (req, res) => {
    const webHookResponse = handleWebHook(req.body, req.headers['x-hub-signature'] as string)
    res.status(webHookResponse.status)
    res.send(webHookResponse.body)
});


const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`App listening on PORT ${port}`));