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

const ROOT_PATH = process.cwd();
const CONFIG_DEFAULT = {
    port: 8888,
    debug: false,
    logPath: 'logs',
    viewPath: 'views',
    staticPath: 'public',
    servicePath: 'services',
    controllerPath: 'controllers',
    rootPath: ROOT_PATH,
};

class Varal extends Container {

    constructor() {
        super();
        this.loadConfig();
        this.loadComponent();
        this.loadErrorHandler();
        this.loadPlugins();
    }

    loadConfig() {
        const config = require(path.join(ROOT_PATH, 'config/config.js'));
        let config_env = {};
        switch (process.env.NODE_ENV) {
            case 'dev':
                config_env = require(path.join(ROOT_PATH, 'config/config.dev.js'));
                break;
            case 'beta':
                config_env = require(path.join(ROOT_PATH, 'config/config.beta.js'));
                break;
            case 'production':
                config_env = require(path.join(ROOT_PATH, 'config/config.prod.js'));
                break;
        }
        Object.assign(config, config_env);
        this.config = Object.assign(CONFIG_DEFAULT, config);
    }

    loadComponent() {
        this.router = new Router();
        this.middleware = new Middleware();
        this.emitter = new EventEmitter();
    }

    loadErrorHandler() {
        process.on('uncaughtException', err => {
            this.log('UncaughtException', err.stack || err);
            process.exit(1);
        });
        this.on('error', (err, exit) => {
            this.log('Error', err.stack || err);
            if (exit)
                process.exit(1);
        });
    }

    loadPlugins() {
        if (Array.isArray(this.config.plugins))
            for (let plugin of this.config.plugins)
                if (typeof plugin.name === 'string' && typeof plugin.concrete === 'function')
                    if (plugin.singleton === true)
                        this.singleton(plugin.name, plugin.concrete);
                    else
                        this.bind(plugin.name, plugin.concrete);
    }

    loadFile(filePath) {
        const callback = require(path.join(this.config.rootPath, filePath));
        if (typeof callback === 'function')
            callback(this);
    }

    loadPath(dirPath) {
        const realPath = path.join(this.config.rootPath, dirPath);
        if (!fs.existsSync(realPath))
            return;
        const routes = fs.readdirSync(realPath);
        for (let i = 0; i < routes.length; i += 1)
            this.loadFile(path.join(dirPath, routes[i]));
    }

    log(type, content) {
        const filePath = path.join(this.config.rootPath, this.config.logPath);
        if (!fs.existsSync(filePath)) {
            fs.mkdirSync(filePath);
        }
        const file = path.join(filePath, helper.date('Y-m-d') + '.log');
        content = `[${helper.date()}][${type}] ${content}\n`;
        fs.appendFileSync(file, content);
    }

    use(middleware) {
        if (Array.isArray(middleware))
            this.middleware.globalMiddleware = helper.arrayMerge(this.middleware.globalMiddleware, middleware);
        else if (typeof middleware === 'string')
            this.middleware.globalMiddleware.push(middleware);
        else if (typeof middleware === 'function')
            middleware(this);
    }

    get(path, callback) {
        return this.router.defaultGroup.get(path, callback);
    }

    post(path, callback) {
        return this.router.defaultGroup.post(path, callback);
    }

    any(path, callback) {
        return this.router.defaultGroup.add('ANY', path, callback);
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

    on(eventName, listener) {
        return this.emitter.on(eventName, listener);
    }

    run() {
        const self = this;
        http.createServer((request, response) => {
            const app = new Application(self, request, response);
            app.handle().catch(err => {
                app.error(err);
            });
        }).listen(this.config.port);
    }

}

Varal.Controller = Controller;

exports = module.exports = Varal;