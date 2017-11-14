'use strict';

const helper = require('./helper');

class Router {
    constructor() {
        this.defaultGroup = new Group();
    }

    getCallback(method, path, group, prefix, middleware) {
        group = group || this.defaultGroup;
        if (prefix)
            prefix += helper.pathFormat(group.prefix);
        else
            prefix = helper.pathFormat(group.prefix);
        middleware = middleware || [];
        let i, value, callback, args;
        let path_match = false;
        let method_match = true;
        for (i = 0; i < group.routesMap.length; i += 1) {
            value = group.routesMap[i];
            if (args = helper.pathMatch(prefix + helper.pathFormat(value.path), helper.pathFormat(path))) {
                path_match = true;
                if (value.method === method) {
                    method_match = true;
                    callback = value.callback;
                    helper.array_merge(middleware, value.middleware);
                    break;
                } else {
                    method_match = false;
                }
            }
        }
        let this_result = {
            prefix: prefix,
            path_match: path_match,
            method_match: method_match,
            args: args,
            callback: callback,
            middleware: middleware
        };
        if (path_match === true && method_match === true)
            return this_result;
        group.groupsMap.sort(helper.compareWeight);
        for (i = 0; i < group.groupsMap.length; i += 1) {
            let child = group.groupsMap[i];
            helper.array_merge(middleware, child.middleware);
            let child_result = this.getCallback(method, path, child, prefix, middleware);
            if (child_result.path_match === true) {
                if (child_result.method_match === true)
                    return child_result;
                else
                    this_result = child_result;
            }
        }
        return this_result;
    }
}

class Group {
    constructor(options) {
        this.weight = 100;
        this.prefix = '';
        this.middleware = [];
        Object.assign(this, options);
        this.routesMap = [];
        this.groupsMap = [];
    }

    add(method, path, callback) {
        for (let i = 0; i < this.routesMap.length; i += 1) {
            if (this.routesMap[i].method === method && this.routesMap[i].path === path) {
                this.routesMap.splice(i, 1);
            }
        }
        let route = {
            method: method,
            path: path,
            callback: callback,
            middleware: [],
            name: function (name) {
                route.name = name;
                return route;
            },
            use: function (middleware) {
                route.middleware = middleware || [];
                return route;
            }
        };
        this.routesMap.push(route);
        return route;
    }

    group(options, callback) {
        if (typeof options === "function") {
            callback = options;
            options = {};
        }
        let child = new Group(options);
        callback(child);
        this.groupsMap.push(child);
    }
}

exports = module.exports = Router;