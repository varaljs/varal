'use strict';

const fs = require('fs');
const url = require('url');
const hbs = require('handlebars');
const helper = require('./helper');
const stringify = require('json-stable-stringify');
const multiparty = require('multiparty');
const serveStatic = require('serve-static');
const queryString = require('querystring');

class Application {
    constructor(varal, req, res) {
        this.req = req;
        this.res = res;
        this.viewPath = varal.viewPath;
        this.staticPath = varal.staticPath;
        this.controllerPath = varal.controllerPath;
        this.router = varal.router;
        this.middleware = varal.middleware;
        this.globalMiddleware = varal.globalMiddleware;
        this.error = varal.error;
        this.e404 = varal.e404;
        this.e405 = varal.e405;
        this.next = true;
        this.resStatus = 200;
        this.resStatusMessage = '';
        this.resHeaders = {};
        this.resBody = [];
        this.resEndWith = 'null';
        this.path = url.parse(this.req.url).pathname;
    }

    setStatus(status) {
        this.resStatus = status;
    };

    setStatusMessage(message) {
        this.resStatusMessage = message;
    };

    setHeaders(headers) {
        Object.assign(this.resHeaders, headers);
    };

    setHeader(name, value) {
        Object.assign(this.resHeaders, {[name]: value});
    };

    removeHeader(name) {
        delete this.resHeaders[name];
    };

    clearHeaders() {
        this.resHeaders = {};
    };

    initHeaders() {
        for (let name in this.resHeaders)
            this.res.setHeader(name, this.resHeaders[name]);
    };

    write(value) {
        if (typeof value !== 'string' && typeof value !== Buffer)
            return;
        this.resBody.push(value);
    };

    initWrite() {
        for (let i = 0; i < this.resBody.length; i += 1)
            this.res.write(this.resBody[i]);
    };

    resSent() {
        if (this.resIsEnd())
            return;
        this.res.statusCode = this.resStatus;
        if (this.resStatusMessage !== '')
            this.res.statusMessage = this.resStatusMessage;
        this.initHeaders();
        this.initWrite();
    };

    handle() {
        this.applyForm().then(() => {
            this.middleware.handle(this.globalMiddleware, this);
            this.applyRoutes();
            this.applyStatic();
            this.resEnd();
        }).catch(err => {
            this.error(err, this);
        });
    };

    async applyForm() {
        this.fields = url.parse(this.req.url, true).query;
        this.files = [];
        const self = this;
        const form = new multiparty.Form();
        const contentType = this.req.headers['content-type'] || '';
        if (this.req.method === 'POST') {
            if (contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
                await new Promise((resolve, reject) => {
                    this.req.setEncoding('utf8');
                    this.req.on('data', function (chunk) {
                        chunk = queryString.parse(chunk);
                        Object.assign(self.fields, chunk);
                    });
                    this.req.on('end', function () {
                        resolve();
                    });
                    this.req.on('error', function (err) {
                        reject(err);
                    });
                });
            } else if (contentType.indexOf('multipart/form-data') >= 0) {
                await new Promise((resolve, reject) => {
                    form.parse(this.req, function (err, fields, files) {
                        if (err)
                            reject(err);
                        self.files = files ? files.upload : [];
                        for (let value in fields) {
                            if (fields[value].length === 1)
                                fields[value] = fields[value][0];
                        }
                        Object.assign(self.fields, fields);
                        resolve();
                    });
                });
            }
        }
    }

    applyRoutes() {
        if (this.resIsEnd())
            return;
        let result = this.router.getCallback(this.req.method, this.path);
        if (result.path_match === true) {
            this.resEndWith = 'route';
            if (result.method_match === true) {
                this.middleware.handle(result.middleware, this);
                if (this.next === false)
                    return;
                if (typeof result.callback === 'function')
                    result.callback(this, ...result.args);
                else if (typeof result.callback === 'string') {
                    let action = result.callback.split('@');
                    let controller = require(process.cwd() + helper.pathFormat(this.controllerPath) + helper.pathFormat(action[0]));
                    controller[action[1]](this, ...result.args);
                }
            }
            if (result.method_match === false) {
                this.e405(this);
            }
        }
    };

    applyStatic() {
        if (this.resEndWith === 'route')
            return;
        this.resEndWith = 'static';
        const self = this;
        const static_path = serveStatic(this.staticPath);
        static_path(this.req, this.res, function () {
            self.resEndWith = 'null';
            if (self.next === true)
                self.e404(self);
            self.resEnd();
        });
    };

    resEnd(msg) {
        if (this.resIsEnd())
            return;
        if (this.resEndWith === 'static')
            return;
        this.resSent();
        this.res.end(msg);
    };

    resIsEnd() {
        return this.res.finished;
    };

    text(text) {
        this.setHeader('Content-Type', 'text/plain');
        this.write(text);
    };

    json(data) {
        data = stringify(data);
        this.setHeader('Content-Type', 'application/json');
        this.write(data);
    };

    render(view, data) {
        const template = fs.readFileSync(process.cwd() + '/' + this.viewPath + '/' + view + '.hbs', 'utf-8');
        const render = hbs.compile(template);
        this.setHeader('Content-Type', 'text/html');
        this.write(render(data));
    };

    route(name, group) {
        group = group || this.router.defaultGroup;
        let i;
        for (i = 0; i < group.routesMap.length; i += 1) {
            if (name === group.routesMap[i].name) {
                this.middleware.handle(group.routesMap[i].middleware, this);
                group.routesMap[i].callback(this);
                return true;
            }
        }
        for (i = 0; i < group.groupsMap.length; i += 1) {
            let result = this.route(name, group.groupsMap[i]);
            if (result === true)
                return true;
        }
        return false;
    };
}

exports = module.exports = Application;