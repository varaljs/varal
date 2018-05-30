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
        this.binds = Object.assign({}, varal.binds);
        this.instances = Object.assign({}, varal.instances);
        this.config = varal.config;
        this.router = varal.router;
        this.middleware = varal.middleware;
        this.emitter = varal.emitter;
        this.log = varal.log;
        this.bind('varal.app', this);
        this.initReq(req);
        this.initRes(res);
    }

    initReq(req) {
        this.req = req;
        this.path = helper.pathFormat(url.parse(req.url).pathname);
        this.files = [];
        this.fields = url.parse(req.url, true).query;
        this.cookies = cookie.parse(req.headers.cookie || '');
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
        this.html(art(path.join(__dirname, 'views/error.html'), {
            title,
            msg,
            debug: this.config.debug && show,
            err: err.stack || err,
        }));
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
        Object.assign(this.resHeaders, {[name]: value});
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
        if (typeof result.callback === 'function')
            this.asyncHandler(result.callback(this, ...result.args));
        else if (typeof result.callback === 'string') {
            const action = result.callback.split('@');
            const controllerPath = path.join(this.config.rootPath, this.config.controllerPath, action[0]);
            const controller = this.make(require(controllerPath));
            this.asyncHandler(controller[action[1]](this, ...result.args));
        }
    }

    applyStatic() {
        if (this.resIsEnd())
            return;
        if (this.resEndWith === 'route')
            return;
        this.resEndWith = 'static';
        const self = this;
        serveStatic(this.config.staticPath)(this.req, this.res, () => {
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
        this.html(art(view, data));
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
        this.resCookies.push(cookie.serialize(name, value, options));
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
        const service = path.join(this.config.rootPath, this.config.servicePath, file);
        const instance = this.make(require(service));
        if (attr !== undefined)
            return instance[attr];
        return instance;
    }

}

exports = module.exports = Application;