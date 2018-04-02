const url = require('url');
const art = require('art-template');
const path = require('path');
const cookie = require('cookie');
const helper = require('./helper');
const Container = require('varal-container');
const multiparty = require('multiparty');
const serveStatic = require('serve-static');
const queryString = require('querystring');
const cookieSignature = require('cookie-signature');

class Application extends Container {

    constructor(varal, req, res) {
        super();
        this.varal = varal;
        this.initContainer();
        this.initReq(req);
        this.initRes(res);
        this.initServer();
        this.initCookies();
    }

    initContainer() {
        const server = this.varal;
        this.binds = Object.assign({}, server.binds);
        this.instances = Object.assign({}, server.instances);
        this.bind('varal.app', this);
    }

    initReq(req) {
        this.req = req;
        this.path = helper.pathFormat(url.parse(this.req.url).pathname);
        this.fields = url.parse(this.req.url, true).query;
        this.files = [];
    }

    initRes(res) {
        this.res = res;
        this.next = true;
        this.asyncStuck = 0;
        this.resEndWith = 'null';
        this.resStatus = 200;
        this.resStatusMessage = '';
        this.resHeaders = {};
        this.resCookies = [];
        this.resBody = [];
        this.routeResult = undefined;
        this.data = {};
    }

    initServer() {
        const server = this.varal;
        this.config = server.config;
        this.router = server.router;
        this.middleware = server.middleware;
        this.emitter = server.emitter;
        this.log = server.log;
    }

    initCookies() {
        this.cookies = cookie.parse(this.req.headers.cookie || '');
    }

    error(err, options) {
        const {
            log = true,
            show = true,
            exit = false,
            status = 500,
            title = 'Error',
            msg = 'Something went Wrong!'
        } = options || {};
        if (log)
            this.emit('error', err, exit);
        this.initRes(this.res);
        this.setStatus(status);
        const html = art(path.join(__dirname, 'views/error.html'), {
            title,
            msg,
            debug: this.config.debug && show,
            err: err.stack || err,
        });
        this.html(html);
        this.resEnd();
    }

    renderError(status, msg) {
        const handler = this.make('app.e' + status);
        if (typeof handler === 'function')
            handler(this);
        else
            this.error(new Error(msg), {
                log: false,
                show: false,
                status: 404,
                title: msg,
                msg
            });
    }

    emit(eventName, ...args) {
        return this.emitter.emit(eventName, ...args);
    }

    setStatus(status) {
        this.resStatus = status;
    }

    setStatusMessage(message) {
        this.resStatusMessage = message;
    }

    setHeaders(headers) {
        Object.assign(this.resHeaders, headers);
    }

    setHeader(name, value) {
        Object.assign(this.resHeaders, {
            [name]: value
        });
    }

    removeHeader(name) {
        delete this.resHeaders[name];
    }

    clearHeaders() {
        this.resHeaders = {};
    }

    sentHeaders() {
        if (this.resCookies.length > 0)
            this.setHeader('Set-Cookie', this.resCookies);
        for (let name in this.resHeaders)
            this.res.setHeader(name, this.resHeaders[name]);
    }

    write(value) {
        if (typeof value !== 'string' && typeof value !== Buffer)
            return;
        this.resBody.push(value);
    }

    sentBody() {
        for (let i = 0; i < this.resBody.length; i += 1)
            this.res.write(this.resBody[i]);
    }

    resSent() {
        if (this.resIsEnd())
            return;
        this.res.statusCode = this.resStatus;
        if (this.resStatusMessage !== '')
            this.res.statusMessage = this.resStatusMessage;
        this.sentHeaders();
        this.sentBody();
    }

    async handle() {
        await this.applyForm();
        this.applyGlobalMiddleware();
        this.applyRoutes();
        this.applyStatic();
        this.resEnd();
    }

    async applyForm() {
        const contentType = this.req.headers['content-type'] || '';
        if (this.req.method === 'POST') {
            if (contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
                await this.parseForm();
            } else if (contentType.indexOf('multipart/form-data') >= 0) {
                await this.parseMultipartForm();
            }
        }
    }

    parseForm() {
        const self = this;
        return new Promise((resolve, reject) => {
            this.req.setEncoding('utf8');
            this.req.on('data', chunk => {
                chunk = queryString.parse(chunk);
                Object.assign(self.fields, chunk);
            });
            this.req.on('end', () => {
                resolve();
            });
            this.req.on('error', err => {
                reject(err);
            });
        });
    }

    parseMultipartForm() {
        const self = this;
        const form = new multiparty.Form();
        return new Promise((resolve, reject) => {
            form.parse(this.req, (err, fields, files) => {
                if (err)
                    reject(err);
                self.files = files ? files.upload : [];
                for (let value in fields)
                    if (fields[value].length === 1)
                        fields[value] = fields[value][0];
                Object.assign(self.fields, fields);
                resolve();
            });
        });
    }

    applyGlobalMiddleware() {
        this.middleware.handleGlobal(this);
    }

    applyRoutes() {
        if (this.resIsEnd())
            return;
        const result = this.router.getCallback(this.req.method, this.path);
        if (result.path_match === true) {
            this.resEndWith = 'route';
            if (result.method_match === true) {
                this.routeResult = result;
                this.middleware.handle(result.middleware, this);
            } else
                this.renderError(405, '405 Method Not Allowed');
        }
    }

    applyRouteResult() {
        if (this.resEndWith !== 'route' || this.next === false || this.asyncStuck !== 0)
            return;
        const result = this.routeResult;
        if (typeof result.callback === 'function') {
            let callback = result.callback(this, ...result.args);
            this.asyncHandler(callback);
        } else if (typeof result.callback === 'string') {
            const action = result.callback.split('@');
            const controllerPath = path.join(this.config.rootPath, this.config.controllerPath, action[0]);
            const controllerClass = require(controllerPath);
            const controller = this.make(controllerClass);
            let callback = controller[action[1]](this, ...result.args);
            this.asyncHandler(callback);
        }
    }

    applyStatic() {
        if (this.resIsEnd())
            return;
        if (this.resEndWith === 'route')
            return;
        this.resEndWith = 'static';
        const self = this;
        const static_path = serveStatic(this.config.staticPath);
        static_path(this.req, this.res, () => {
            self.resEndWith = 'null';
            self.renderError(404, '404 Not Found');
        });
    }

    asyncHandler(callback) {
        if (callback instanceof Promise) {
            this.asyncStuck += 1;
            callback.then(() => {
                this.asyncStuck -= 1;
                this.resEnd();
            }).catch(err => {
                this.asyncStuck -= 1;
                this.error(err);
            });
        }
    }

    resEnd(msg) {
        if (this.resIsEnd() || this.resEndWith === 'static' || this.asyncStuck !== 0)
            return;
        this.resSent();
        this.res.end(msg);
    }

    resIsEnd() {
        return this.res.finished;
    }

    text(text) {
        if (typeof text !== 'string' && typeof text.toString === 'function')
            text = text.toString();
        this.setHeader('Content-Type', 'text/plain');
        this.write(text);
    }

    html(data) {
        this.setHeader('Content-Type', 'text/html');
        this.write(data);
    }

    json(data) {
        data = JSON.stringify(data);
        this.setHeader('Content-Type', 'application/json');
        this.write(data);
    }

    render(view, data) {
        data = data || {};
        data.$app = this;
        view = path.join(this.config.rootPath, this.config.viewPath, view + '.html');
        const html = art(view, data);
        this.html(html);
    }

    route(name, ...args) {
        let callback = this.router.getCallbackByName(name);
        if (callback) {
            this.routeResult = {callback, args};
            this.applyRouteResult();
        }
    }

    redirect(url) {
        this.setStatus(302);
        this.setHeader('Location', url);
        this.text('Redirecting to ' + url);
    }

    setCookie(name, value, options) {
        options = options || {};
        if (typeof options.key === 'string' && options.key !== '')
            value = cookieSignature.sign(value, options.key);
        let data = cookie.serialize(name, value, options);
        this.resCookies.push(data);
    }

    getCookie(name, key) {
        let data = this.cookies[name];
        if (typeof data !== 'string')
            return false;
        if (typeof key === 'string' && key !== '')
            data = cookieSignature.unsign(data, key);
        return data;
    }

    service(name) {
        const [file, attr] = name.split('@');
        const servicePath = path.join(this.config.rootPath, this.config.servicePath, file);
        const service = require(servicePath);
        const instance = this.make(service);
        if (attr !== undefined)
            return instance[attr];
        return instance;
    }

}

exports = module.exports = Application;