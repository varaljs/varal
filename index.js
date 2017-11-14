'use strict';

let http = require('http');
let Router = require('./lib/router');
let Middleware = require('./lib/middleware');
let Application = require('./lib/application');

class Varal {
    constructor(options) {
        this.name = 'default';
        this.port = 8888;
        this.viewPath = 'view';
        this.staticPath = 'public';
        this.controllerPath = 'controller';
        Object.assign(this, options);
        this.router = new Router();
        this.middleware = new Middleware();
        this.globalMiddleware = [];
    }

    error(err, app) {
        let errorMsg = err.stack || err.message || 'Unknown Error';
        console.log(errorMsg);
        app.resEnd('Something went wrong!');
    }

    use(middleware) {
        this.globalMiddleware = middleware;
    }

    get(...args) {
        return this.router.defaultGroup.add('GET', ...args);
    }

    post(...args) {
        return this.router.defaultGroup.add('POST', ...args);
    }

    group(...args) {
        return this.router.defaultGroup.group(...args);
    }

    add(...args) {
        return this.middleware.add(...args);
    }

    run() {
        let self = this;
        http.createServer(function (request, response) {
            let app = new Application(self, request, response);
            try {
                app.run();
            } catch (err) {
                self.error(err, app)
            }
        }).listen(this.port);
        console.log("Varal Server '" + this.name + "' has started.");
    }
}

exports = module.exports = Varal;