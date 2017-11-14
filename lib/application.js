'use strict';

let fs = require('fs');
let url = require('url');
let hbs = require('handlebars');
let helper = require('./helper');
let stringify = require('json-stable-stringify');
let multiparty = require('multiparty');
let serveStatic = require('serve-static');
let queryString = require('querystring');

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
        this._e404 = varal.e404;
        this._e405 = varal.e405;
        this.next = true;
        this.resStatus = 200;
        this.resStatusMessage = '';
        this.resHeaders = {};
        this.resBody = [];
        this.handled = false;
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
        if (this.handled === true)
            return;
        this.middleware.handle(this.globalMiddleware, this);
        this.applyRoutes();
        this.applyStatic();
        this.resEnd();
        this.handled = true;
    };

    run() {
        this.applyForm();
        this.hasForm = false;
        this.fields = url.parse(this.req.url, true).query;
        this.files = [];
        if (!this.hasForm)
            this.handle();
    }

    applyForm() {
        let self = this;
        let form = new multiparty.Form();
        let contentType = this.req.headers['content-type'] || '';
        if (this.req.method === 'POST') {
            if (contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
                this.hasForm = true;
                this.req.setEncoding('utf8');
                this.req.on('data', function (chunk) {
                    chunk = queryString.parse(chunk);
                    Object.assign(self.fields, chunk);
                });
                this.req.on('end', function () {
                    self.handle();
                });
            } else if (contentType.indexOf('multipart/form-data') >= 0) {
                this.hasForm = true;
                form.parse(this.req, function (err, fields, files) {
                    self.files = files.upload;
                    for (let value in fields) {
                        if (fields[value].length === 1)
                            fields[value] = fields[value][0];
                    }
                    Object.assign(self.fields, fields);
                    self.handle();
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
                this.e405();
            }
        }
    };

    applyStatic() {
        if (this.resEndWith === 'route')
            return;
        let self = this;
        this.resEndWith = 'static';
        let static_path = serveStatic(this.staticPath);
        static_path(this.req, this.res, function () {
            self.resEndWith = 'null';
            if (self.next === true)
                self.e404();
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

    e404() {
        if (typeof this._e404 === 'function')
            this._e404(this);
        else {
            this.setStatus(404);
            this.setHeader('Content-Type', 'text/html');
            this.write('404 Not Found');
        }
    };

    e405() {
        if (typeof this._e405 === 'function')
            this._e405(this);
        else {
            this.setStatus(405);
            this.setHeader('Content-Type', 'text/html');
            this.write('405 Method Not Allowed');
        }
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
        let template = fs.readFileSync(process.cwd() + '/' + this.viewPath + '/' + view + '.hbs', 'utf-8');
        let render = hbs.compile(template);
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