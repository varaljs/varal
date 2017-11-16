'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const Router = require('./lib/router');
const Middleware = require('./lib/middleware');
const Application = require('./lib/application');
const EventEmitter = require('events').EventEmitter;

class Varal {
    constructor(options) {
        this.port = 8888;
        this.debug = false;
        this.viewPath = 'views';
        this.routesPath = 'routes';
        this.staticPath = 'public';
        this.controllerPath = 'controllers';
        this.rootPath = process.cwd();
        Object.assign(this, options);
        this.router = new Router();
        this.middleware = new Middleware();
        this.globalMiddleware = [];
        this.emitter = new EventEmitter();
        this.loadErrorHandler();
    }

    loadErrorHandler() {
        process.on('uncaughtException', err => {
            this.emitter.emit('error', err);
            process.exit(1);
        });
        this.on('error', err => {
            // TODO : Log Error
        });
    }

    loadRoutes() {
        const routesPath = path.join(this.rootPath, this.routesPath);
        if (!fs.existsSync(routesPath))
            return;
        const routes = fs.readdirSync(routesPath);
        for (let i = 0; i < routes.length; i += 1) {
            let callback = require(path.join(routesPath, routes[i]));
            if (typeof callback === 'function')
                callback(this);
        }
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

    get(path, callback) {
        return this.router.defaultGroup.get(path, callback);
    }

    post(path, callback) {
        return this.router.defaultGroup.post(path, callback);
    }

    add(name, callback, weight) {
        return this.middleware.add(name, callback, weight);
    }

    group(options, callback) {
        return this.router.defaultGroup.group(options, callback);
    }

    on(type, listener) {
        return this.emitter.on(type, listener);
    }

    run() {
        this.loadRoutes();
        const self = this;
        http.createServer((request, response) => {
            let app = new Application(self, request, response);
            try {
                app.handle();
            } catch (err) {
                app.error(err)
            }
        }).listen(this.port);
        console.log("Varal Server started.");
    }
}

exports = module.exports = Varal;