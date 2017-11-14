'use strict';

const http = require('http');
const Router = require('./lib/router');
const Middleware = require('./lib/middleware');
const Application = require('./lib/application');

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
        const errorMsg = err.stack || err.message || 'Unknown Error';
        console.log(errorMsg);
        app.res.end('Something went wrong!');
    }

    e404(app) {
        app.setStatus(404);
        app.setHeader('Content-Type', 'text/html');
        app.write('404 Not Found');
    };

    e405(app) {
        app.setStatus(405);
        app.setHeader('Content-Type', 'text/html');
        app.write('405 Method Not Allowed');
    };

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
        const self = this;
        http.createServer(function (request, response) {
            let app = new Application(self, request, response);
            try {
                app.handle();
            } catch (err) {
                self.error(err, app)
            }
        }).listen(this.port);
        console.log("Varal Server '" + this.name + "' has started.");
    }
}

exports = module.exports = Varal;