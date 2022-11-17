import express from "express";
import { handleWebHook } from './github-action-receiver'
require('dotenv').config()

const app = express();

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