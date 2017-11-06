'use strict';

let url = require('url');
let fs = require('fs');
let hbs = require('handlebars');
let serveStatic = require('serve-static');
let stringify = require('json-stable-stringify');
let multiparty = require('multiparty');
let queryString = require('querystring');
let helper = require('./helper');

let Server = {
    init: function (app) {
        // Response Part:
        app.resStatus = 200;
        app.resStatusMessage = '';
        app.resHeaders = {};
        app.resBody = [];
        app.handled = false;
        app.resEndWith = 'null';
        app.path = url.parse(app.req.url).pathname;

        app.setStatus = function (status) {
            app.resStatus = status;
        };

        app.setStatusMessage = function (message) {
            app.resStatusMessage = message;
        };

        app.setHeaders = function (headers) {
            Object.assign(app.resHeaders, headers);

        };

        app.setHeader = function (name, value) {
            let header = {};
            header[name] = value;
            Object.assign(app.resHeaders, header);
        };

        app.removeHeader = function (name) {
            delete app.resHeaders[name];
        };

        app.clearHeaders = function () {
            app.resHeaders = {};
        };

        app.initHeaders = function () {
            for (let name in app.resHeaders)
                app.res.setHeader(name, app.resHeaders[name]);
        };

        app.write = function (value) {
            app.resBody.push(value);
        };

        app.initWrite = function () {
            for (let i = 0; i < app.resBody.length; i += 1)
                app.res.write(app.resBody[i]);
        };

        app.resSent = function () {
            if (app.resIsEnd())
                return;
            app.res.statusCode = app.resStatus;
            if (app.resStatusMessage !== '')
                app.res.statusMessage = app.resStatusMessage;
            app.initHeaders();
            app.initWrite();
        };

        app.handle = function () {
            if (app.handled === true)
                return;
            app.middleware.handle(app.globalMiddleware, app);
            app.applyRoutes();
            app.applyStatic();
            app.resSent();
            app.resEnd();
            app.handled = true;
        };

        app.applyRoutes = function () {
            if (app.resIsEnd())
                return;
            let result = app.router.getCallback(app.req.method, app.path);
            if (result.path_match === true) {
                app.resEndWith = 'route';
                if (result.method_match === true) {
                    app.middleware.handle(result.middleware, app);
                    if (app.next === false)
                        return;
                    if (typeof result.callback === 'function')
                        result.callback(app, ...result.args);
                    else if (typeof result.callback === 'string') {
                        let action = result.callback.split('@');
                        let controller = require(process.cwd() + helper.pathFormat(app.controllerPath) + helper.pathFormat(action[0]));
                        controller[action[1]](app, ...result.args);
                    }
                }
                if (result.method_match === false) {
                    app.e405();
                }
            }
        };

        app.applyStatic = function () {
            if (app.resEndWith === 'route')
                return;
            app.resEndWith = 'static';
            let static_path = serveStatic(app.staticPath);
            static_path(app.req, app.res, function () {
                app.resEndWith = 'null';
                if (app.next === true)
                    app.e404();
                app.resEnd();
            });
        };

        app.resEnd = function (msg) {
            if (app.resIsEnd())
                return;
            if (app.resEndWith === 'static')
                return;
            app.res.end(msg);
        };

        app.resIsEnd = function () {
            return app.res.finished;
        };

        app.e404 = function () {
            if (typeof app._e404 === 'function')
                app._e404(app);
            else {
                app.setStatus(404);
                app.setHeader('Content-Type', 'text/html');
                app.write('404 Not Found');
            }
        };

        app.e405 = function () {
            if (typeof app._e405 === 'function')
                app._e405(app);
            else {
                app.setStatus(405);
                app.setHeader('Content-Type', 'text/html');
                app.write('405 Method Not Allowed');
            }
        };

        app.text = function (text) {
            app.setHeader('Content-Type', 'text/plain');
            app.write(text);
        };

        app.json = function (data) {
            data = stringify(data);
            app.setHeader('Content-Type', 'application/json');
            app.write(data);
        };

        app.render = function (view, data) {
            let template = fs.readFileSync(process.cwd() + '/' + app.viewPath + '/' + view + '.hbs', 'utf-8');
            let render = hbs.compile(template);
            app.setHeader('Content-Type', 'text/html');
            app.write(render(data));
        };

        app.route = function (name, group) {
            group = group || app.router.defaultGroup;
            let i;
            for (i = 0; i < group.routesMap.length; i += 1) {
                if (name === group.routesMap[i].name) {
                    app.middleware.handle(group.routesMap[i].middleware, app);
                    group.routesMap[i].callback(app);
                    return true;
                }
            }
            for (i = 0; i < group.groupsMap.length; i += 1) {
                let result = app.route(name, group.groupsMap[i]);
                if (result === true)
                    return true;
            }
            return false;
        };

        // Request Part:
        let form = new multiparty.Form();
        app.fields = url.parse(app.req.url, true).query;
        app.files = [];
        app.contentType = app.req.headers['content-type'] || '';
        if (app.req.method === 'POST') {
            if (app.contentType.indexOf('application/x-www-form-urlencoded') >= 0) {
                app.hasForm = true;
                app.req.setEncoding('utf8');
                app.req.on('data', function (chunk) {
                    chunk = queryString.parse(chunk);
                    Object.assign(app.fields, chunk);
                });
                app.req.on('end', function () {
                    app.handle();
                });
            } else if (app.contentType.indexOf('multipart/form-data') >= 0) {
                app.hasForm = true;
                form.parse(app.req, function (err, fields, files) {
                    app.files = files.upload;
                    for (let value in fields) {
                        if (fields[value].length === 1)
                            fields[value] = fields[value][0];
                    }
                    Object.assign(app.fields, fields);
                    app.handle();
                });
            }
        }
    }
};

exports = module.exports = Server;