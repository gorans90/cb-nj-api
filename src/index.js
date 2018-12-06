import http from 'http';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Server } from 'ws';
import AppRouter from './config/router/app-router';
import Model from './models';
import Database from './config/db/database';
import path from 'path';
import CONF from './config/apiConst';

// const PORT = CONF.PORT;
// const PORT = 3001;

const app = express();
app.server = http.createServer(app);

app.use(cors({
    exposedHeaders: '*'
}));

app.use(bodyParser.json({
    limit: '50mb'
}));

app.wss = new Server({
    server: app.server
});

//static www files use express
const wwwPath = path.join(__dirname, 'wwww');

app.use('/', express.static(wwwPath));

// Connect to Mongo Database
new Database().connect().then((db) => {
    console.log('Successful connected to database.');
    app.db = db;
}).catch((err) => {
    throw(err);
});
//End connect to Mongo Database

app.models = new Model(app);
app.routes = new AppRouter(app);

app.server.listen(process.env.PORT, () => {
    console.log(`App is running on the port ${app.server.address().port}`);
});

export default app;