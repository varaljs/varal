'use strict';

const fs = require('fs');
const hbs = require('handlebars');
const http = require('http');
const path = require('path');
const helper = require('./lib/helper');
const Router = require('./lib/router');
const Middleware = require('./lib/middleware');
const Application = require('./lib/application');
const EventEmitter = require('events').EventEmitter;

class Varal {
    constructor(options) {
        this.port = 8888;
        this.debug = false;
        this.viewPath = 'view';
        this.routesPath = 'routes';
        this.staticPath = 'public';
        this.controllerPath = 'controller';
        this.rootPath = process.cwd();
        Object.assign(this, options);
        this.router = new Router();
        this.middleware = new Middleware();
        this.globalMiddleware = [];
        this.emitter = new EventEmitter();
        this.on('error', err => {
            const errorMsg = err.stack || err.message || 'Unknown Error';
            console.log(errorMsg);
        });
        this.loadRoutes();
    }

    loadRoutes() {
        const routesPath = this.rootPath + helper.pathFormat(this.routesPath);
        if (!fs.existsSync(routesPath))
            return;
        const routes = fs.readdirSync(routesPath);
        for (let i = 0; i < routes.length; i += 1) {
            let callback = require(routesPath + helper.pathFormat(routes[i]));
            if (typeof callback === 'function')
                callback(this);
        }
    }

    error(err, app) {
        app.emit('error', err);
        const template = fs.readFileSync(path.join('./lib/error.hbs'), 'utf-8');
        const render = hbs.compile(template);
        const data = {
            debug: this.debug,
            title: 'Something went wrong!',
            body: err.stack || err.message || 'Unknown Error'
        };
        app.initRes();
        app.setStatus(500);
        app.html(render(data));
        app.resEnd();
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
        return this.router.defaultGroup.add('GET', path, callback);
    }

    post(path, callback) {
        return this.router.defaultGroup.add('POST', path, callback);
    }

    group(options, callback) {
        return this.router.defaultGroup.group(options, callback);
    }

    add(name, callback, weight) {
        return this.middleware.add(name, callback, weight);
    }

    on(type, listener) {
        return this.emitter.on(type, listener);
    }

    run() {
        const self = this;
        http.createServer((request, response) => {
            let app = new Application(self, request, response);
            try {
                app.handle();
            } catch (err) {
                self.error(err, app)
            }
        }).listen(this.port);
        console.log("Varal Server started.");
    }
}

exports = module.exports = Varal;