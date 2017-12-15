const fs = require('fs');
const url = require('url');
const hbs = require('handlebars');
const path = require('path');
const cookie = require('cookie');
const helper = require('./helper');
const Container = require('varal-container');
const multiparty = require('multiparty');
const serveStatic = require('serve-static');
const queryString = require('querystring');
const cookieSignature = require('cookie-signature');

class Application extends Container {

    static injector(ctn) {
        return [
            ctn.make('varal')
        ];
    }

    constructor(varal, req, res) {
        super();
        this.initReq(req);
        this.initRes(res);
        this.initServer(varal);
        this.initCookies();
        this.initContainer(varal);
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
        this.resBody = [];
    }

    initServer(varal) {
        this.debug = varal.debug;
        this.logPath = varal.logPath;
        this.viewPath = varal.viewPath;
        this.staticPath = varal.staticPath;
        this.controllerPath = varal.controllerPath;
        this.rootPath = varal.rootPath;
        this.router = varal.router;
        this.middleware = varal.middleware;
        this.emitter = varal.emitter;
        this.log = varal.log;
    }

    initCookies() {
        this.cookies = cookie.parse(this.req.headers.cookie || '');
    }

    initContainer(server) {
        this.binds = server.binds.slice();
        this.instances = server.instances.slice();
        this.bind('varal.app', this);
    }

    error(err, data, keep) {
        if (typeof data === 'boolean') {
            keep = data;
            data = {};
        }
        this.emit('error', err, data, keep);
        if (keep === true)
            return;
        const template = fs.readFileSync(path.join(__dirname, 'views/error.hbs'), 'utf-8');
        const render = hbs.compile(template);
        this.initRes();
        this.setStatus(500);
        this.html(render({
            err: err.stack || err,
            data: data,
            debug: this.debug,
        }));
        this.resEnd();
    }

    e404() {
        const handler = this.make('varal.404');
        if (typeof handler === 'function')
            handler(this);
        else {
            this.setStatus(404);
            this.setHeader('Content-Type', 'text/html');
            this.write('404 Not Found');
        }
    }

    e405() {
        const handler = this.make('varal.405');
        if (typeof handler === 'function')
            handler(this);
        else {
            this.setStatus(405);
            this.setHeader('Content-Type', 'text/html');
            this.write('405 Method Not Allowed');
        }
    }

    emit(type, ...args) {
        return this.emitter.emit(type, ...args);
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

    initHeaders() {
        for (let name in this.resHeaders)
            this.res.setHeader(name, this.resHeaders[name]);
    }

    write(value) {
        if (typeof value !== 'string' && typeof value !== Buffer)
            return;
        this.resBody.push(value);
    }

    initWrite() {
        for (let i = 0; i < this.resBody.length; i += 1)
            this.res.write(this.resBody[i]);
    }

    resSent() {
        if (this.resIsEnd())
            return;
        this.res.statusCode = this.resStatus;
        if (this.resStatusMessage !== '')
            this.res.statusMessage = this.resStatusMessage;
        this.initHeaders();
        this.initWrite();
    }

    handle() {
        this.applyForm().then(() => {
            this.applyGlobalMiddleware();
            this.applyRoutes();
            this.applyStatic();
            this.resEnd();
        }).catch(err => {
            this.error(err);
        });
    }

    async applyForm() {
        const self = this;
        const form = new multiparty.Form();
        const contentType = this.req.headers['content-type'] || '';
        if (this.req.method === 'POST') {
            if (contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
                await new Promise((resolve, reject) => {
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
            } else if (contentType.indexOf('multipart/form-data') >= 0) {
                await new Promise((resolve, reject) => {
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
        }
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
                this.middleware.handle(result.middleware, this);
                if (this.next === false)
                    return;
                if (typeof result.callback === 'function')
                    result.callback(this, ...result.args);
                else if (typeof result.callback === 'string') {
                    const action = result.callback.split('@');
                    const controllerPath = path.join(this.rootPath, this.controllerPath, action[0]);
                    const controllerClass = require(controllerPath);
                    const controller = this.make(controllerClass);
                    controller[action[1]](this, ...result.args);
                }
            } else
                this.e405();
        }
    }

    applyStatic() {
        if (this.resIsEnd())
            return;
        if (this.resEndWith === 'route')
            return;
        this.resEndWith = 'static';
        const self = this;
        const static_path = serveStatic(this.staticPath);
        static_path(this.req, this.res, () => {
            self.resEndWith = 'null';
            if (self.next === true)
                self.e404();
            self.resEnd();
        });
    }

    resEnd(msg) {
        if (this.resIsEnd())
            return;
        if (this.resEndWith === 'static')
            return;
        if (this.asyncStuck !== 0)
            return;
        this.resSent();
        this.res.end(msg);
    }

    resIsEnd() {
        return this.res.finished;
    }

    text(text) {
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
        data.$app = this;
        const templatePath = path.join(this.rootPath, this.viewPath, view + '.hbs');
        const template = fs.readFileSync(templatePath, 'utf-8');
        const render = hbs.compile(template);
        this.html(render(data));
    }

    route(name, group) {
        group = group || this.router.defaultGroup;
        let i;
        for (i = 0; i < group.routesMap.length; i += 1)
            if (name === group.routesMap[i]._name) {
                this.middleware.handle(group.routesMap[i].middleware, this);
                group.routesMap[i].callback(this);
                return true;
            }
        for (i = 0; i < group.groupsMap.length; i += 1) {
            const result = this.route(name, group.groupsMap[i]);
            if (result === true)
                return true;
        }
        return false;
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
        this.setHeader('Set-Cookie', data);
    }

    getCookie(name, key) {
        let data = this.cookies[name];
        if (typeof key === 'string' && key !== '')
            data = cookieSignature.unsign(data, key);
        return data;
    }

}

exports = module.exports = Application;