import Channel from './channel';
import Message from './message';
import Connection from './connection';
import User from './user';

export default class Model {
    constructor(app) {
        this.app = app;

        this.channel = new Channel(app);
        this.message = new Message(app);
        this.connection = new Connection(app);
        this.user = new User(app);
    }
}