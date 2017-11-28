'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const Router = require('./lib/router');
const helper = require('./lib/helper');
const Container = require('varal-container');
const Controller = require('./lib/controller');
const Middleware = require('./lib/middleware');
const Application = require('./lib/application');
const EventEmitter = require('events').EventEmitter;

class Varal extends Container{

    constructor(options) {
        super();
        this.port = 8888;
        this.debug = false;
        this.logPath = 'logs';
        this.viewPath = 'views';
        this.routesPath = 'routes';
        this.staticPath = 'public';
        this.controllerPath = 'controllers';
        Object.assign(this, options);
        this.rootPath = process.cwd();
        this.router = new Router();
        this.middleware = new Middleware();
        this.emitter = new EventEmitter();
        this.loadErrorHandler();
    }

    loadErrorHandler() {
        process.on('uncaughtException', err => {
            this.emitter.emit('error', err);
            process.exit(1);
        });
        this.on('error', err => {
            this.log('error', err.stack || err);
        });
    }

    loadRoutes() {
        const routesPath = path.join(this.rootPath, this.routesPath);
        if (!fs.existsSync(routesPath))
            return;
        const routes = fs.readdirSync(routesPath);
        for (let i = 0; i < routes.length; i += 1) {
            const callback = require(path.join(routesPath, routes[i]));
            if (typeof callback === 'function')
                callback(this);
        }
    }

    log(type, content) {
        const filePath = path.join(this.rootPath, this.logPath);
        if (!fs.existsSync(filePath)) {
            fs.mkdirSync(filePath);
        }
        const fileName = helper.date('isoDate') + '.log';
        const file = path.join(filePath, fileName);
        const date = helper.date();
        content = `[${date}][${type}] ${content}\n`;
        fs.appendFile(file, content, err => {
            if (err) {
                console.log('Failed to write log file:');
                console.log(err.stack || err);
            }
        });
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
        if (Array.isArray(middleware))
            this.middleware.globalMiddleware = helper.array_merge(this.middleware.globalMiddleware, middleware);
        else if (typeof middleware === 'string')
            this.middleware.globalMiddleware.push(middleware);
    }

    get(path, callback) {
        return this.router.defaultGroup.get(path, callback);
    }

    post(path, callback) {
        return this.router.defaultGroup.post(path, callback);
    }

    route(method, path, callback) {
        return this.router.defaultGroup.add(method, path, callback);
    }

    add(name, callback, priority) {
        return this.middleware.add(name, callback, priority);
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
            const app = new Application(self, request, response);
            try {
                app.handle();
            } catch (err) {
                app.error(err)
            }
        }).listen(this.port);
        console.log("Varal Server started.");
    }

}

Varal.Controller = Controller;

exports = module.exports = Varal;